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

// Credits gate: allow by default (returns null); a dedicated test asserts 402.
const mockRequireCredits = vi.fn();
vi.mock("@/lib/credits", () => ({
  requireCredits: (...args: unknown[]) => mockRequireCredits(...args),
  CREDIT_COSTS: { enrich: 1, discover: 5, draft: 1, resume: 2 },
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
          // contact_tags fetch: .select().eq().eq().order()
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => nextRating()),
            // contact_tags: .select().eq().eq().order() -> empty tags by default
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
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
  pastFirms: [],
  educations: [],
  experiences: [],
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
    mockRequireCredits.mockResolvedValue(null);
  });

  it("returns 400 when contactId is missing — and never charges a credit", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    // Credit ordering: a request with no contactId must not burn a credit.
    expect(mockRequireCredits).not.toHaveBeenCalled();
  });

  it("returns 402 when the subscription gate denies", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    mockRequireSubscription.mockResolvedValue(
      NextResponse.json({ error: "Payment required", reason: "no_sub" }, { status: 402 }),
    );
    const response = await POST(makeRequest({ contactId: "1" }));
    expect(response.status).toBe(402);
  });

  it("returns 402 when out of credits (after the contact is validated)", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    // The credit gate now runs AFTER the contact fetch + ownership check, so a
    // valid contact must resolve first for the gate to be reached.
    supabaseResults.push({
      data: { id: "1", name: "Jane Doe", title: "Analyst", firmName: "GS", affiliations: "" },
      error: null,
    });
    mockRequireCredits.mockResolvedValue(
      NextResponse.json({ error: "out_of_credits", balance: 0, needed: 1 }, { status: 402 }),
    );
    const response = await POST(makeRequest({ contactId: "1" }));
    expect(response.status).toBe(402);
    expect(mockGenerateText).not.toHaveBeenCalled();
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
    // Popup fields: highlight signals (from prefs/contact) + recipient email.
    expect(Array.isArray(body.signals)).toBe(true);
    expect(body.signals).toContain("Chi Phi");
    expect(body.recipientEmail).toBe("");
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
    // Credit ordering: an unauthorized contact must not burn a credit.
    expect(mockRequireCredits).not.toHaveBeenCalled();
  });

  it("returns 404 when the contact does not exist — and never charges a credit", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu", name: "Sam Rigot" } });
    // Contact fetch resolves with no row -> 404 before the credit gate.
    supabaseResults.push({ data: null, error: { message: "not found" } });

    const response = await POST(makeRequest({ contactId: "does-not-exist" }));
    expect(response.status).toBe(404);
    expect(mockRequireCredits).not.toHaveBeenCalled();
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
