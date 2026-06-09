import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetUserPrefs = vi.fn();
vi.mock("@/lib/user-prefs", () => ({
  getUserPrefs: (...args: unknown[]) => mockGetUserPrefs(...args),
}));

const mockGenerateText = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("@ai-sdk/gateway", () => ({
  gateway: vi.fn(() => "mock-model"),
}));

// Subscription gate: allow by default; a dedicated test asserts the 402 deny path.
const mockRequireSubscription = vi.fn();
vi.mock("@/lib/subscription", () => ({
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
}));

const supabaseResults: Array<{ data: unknown; error: unknown }> = [];
let supabaseCallIndex = 0;
const ratingResults: Array<{ data: unknown; error: unknown }> = [];
let ratingCallIndex = 0;
function nextResult() {
  const result = supabaseResults[supabaseCallIndex] ?? { data: null, error: { message: "no mock" } };
  supabaseCallIndex++;
  if (result && (result as Record<string, unknown>).__throw) {
    return Promise.reject(new Error("db down"));
  }
  return Promise.resolve(result);
}
function nextRating() {
  const result = ratingResults[ratingCallIndex] ?? { data: null, error: null };
  ratingCallIndex++;
  return Promise.resolve(result);
}
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          // AlumniContact fetch: .select().eq().single()
          single: vi.fn(() => nextResult()),
          // UserDiscover ownership lookup: .select().eq().eq().maybeSingle()
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => nextRating()),
          })),
        })),
      })),
      // api_cost_log fire-and-forget cost telemetry insert
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

import { POST } from "./route";

const DEFAULT_PREFS = {
  university: "UNC Chapel Hill",
  hometown: "Charlotte, NC",
  greekOrg: "Chi Phi",
  targetIndustries: ["Investment Banking"],
  targetFirms: ["Goldman Sachs"],
  targetLocations: ["New York, NY"],
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/outreach/draft", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/outreach/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseResults.length = 0;
    supabaseCallIndex = 0;
    ratingResults.length = 0;
    ratingCallIndex = 0;
    mockGetUserPrefs.mockResolvedValue(DEFAULT_PREFS);
    mockRequireSubscription.mockResolvedValue(null);
  });

  it("returns 400 when contactId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 402 when the subscription gate denies", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: "Payment required", reason: "no_sub" }, { status: 402 }),
    );
    const response = await POST(makeRequest({ contactId: "1" }));
    expect(response.status).toBe(402);
  });

  it("returns draft for valid contact", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    supabaseResults.push({
      data: {
        id: "1",
        name: "Jane Doe",
        title: "Analyst",
        firmName: "Goldman Sachs",
        location: "New York",
        education: "UNC",
        affiliations: "Same School,Target Firm",
      },
      error: null,
    });
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({ subject: "Test Subject", body: "Test body" }),
    });

    const response = await POST(makeRequest({ contactId: "1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subject).toBe("Test Subject");
    expect(body.draft).toBe("Test body");
  });

  it("returns 404 when the contact is owned by another user and unrated", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    supabaseResults.push({
      data: {
        id: "99",
        name: "Other Owner Contact",
        title: "Analyst",
        firmName: "Goldman Sachs",
        affiliations: "",
        importedByUserId: "someone-else@unc.edu",
      },
      error: null,
    });
    // UserDiscover ownership lookup returns no rating -> 404
    ratingResults.push({ data: null, error: null });

    const response = await POST(makeRequest({ contactId: "99" }));
    expect(response.status).toBe(404);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns 500 on backend error", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    // First contact fetch succeeds so route proceeds to generateText
    supabaseResults.push({
      data: { id: "1", name: "Jane Doe", title: "Analyst", firmName: "GS", affiliations: "" },
      error: null,
    });
    // generateText throws, route enters catch block
    mockGenerateText.mockRejectedValue(new Error("Backend down"));
    // Fallback contact fetch in catch block also throws -> inner catch -> 500
    supabaseResults.push({ __throw: true } as never);

    const response = await POST(makeRequest({ contactId: "1" }));
    expect(response.status).toBe(500);
  });
});
