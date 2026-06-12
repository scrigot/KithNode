import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The route module imports the AI SDK, the gateway, auth (next-auth → next/server),
// and other module-level deps at load. Mock them all so we can import the PURE
// validateTrackRole helper without pulling any runtime, and also drive POST.
const mockGenerateText = vi.fn();
vi.mock("ai", () => ({ generateText: (...a: unknown[]) => mockGenerateText(...a) }));
vi.mock("@ai-sdk/gateway", () => ({ gateway: vi.fn(() => "mock-model") }));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

// Supabase chainable: the initial candidate fetch is awaited off the builder,
// per-contact .update().eq() resolves {error:null}, and the trailing remaining
// count returns {count}. fetchResult drives what the candidate fetch yields.
const supabaseState = {
  fetchResult: { data: [] as Array<Record<string, unknown>>, error: null as unknown },
  remaining: 0,
  updateCalls: 0,
  reset(): void {
    this.fetchResult = { data: [], error: null };
    this.remaining = 0;
    this.updateCalls = 0;
  },
};
vi.mock("@/lib/supabase", () => {
  function makeBuilder() {
    let isCount = false;
    const builder: Record<string, unknown> = {
      select: vi.fn((_cols?: unknown, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count) isCount = true;
        return builder;
      }),
      eq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      update: vi.fn(() => ({
        eq: vi.fn(() => {
          supabaseState.updateCalls++;
          return Promise.resolve({ error: null });
        }),
      })),
      // Awaiting the builder yields the candidate fetch (or remaining count).
      then: (resolve: (v: unknown) => void) =>
        resolve(
          isCount
            ? { count: supabaseState.remaining }
            : supabaseState.fetchResult,
        ),
    };
    return builder;
  }
  return { supabase: { from: vi.fn(() => makeBuilder()) } };
});

const mockGetUserPrefs = vi.fn();
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: (...a: unknown[]) => mockGetUserPrefs(...a) }));

const mockRescoreContact = vi.fn();
const mockLoadContactTags = vi.fn();
vi.mock("@/lib/rescore-contact", () => ({
  rescoreContact: (...a: unknown[]) => mockRescoreContact(...a),
  loadContactTags: (...a: unknown[]) => mockLoadContactTags(...a),
}));

const mockRequireSubscription = vi.fn();
vi.mock("@/lib/subscription", () => ({
  requireSubscription: (...a: unknown[]) => mockRequireSubscription(...a),
}));

// Credits: per-contact spendCredits drives the loop-stop. Allow by default; the
// out-of-credits test makes it fail so the batch breaks early.
const mockSpendCredits = vi.fn();
vi.mock("@/lib/credits", () => ({
  spendCredits: (...a: unknown[]) => mockSpendCredits(...a),
  CREDIT_COSTS: { enrich: 1, discover: 5, draft: 1, resume: 2 },
}));

vi.mock("@/lib/enrich/pdl", () => ({
  fetchPdlProfile: vi.fn(() => Promise.resolve(null)),
  shouldAdoptPdlName: vi.fn(() => false),
}));
vi.mock("@/lib/deduce-hometown", () => ({ deduceHometown: vi.fn(() => Promise.resolve("")) }));

import { POST, validateTrackRole } from "./route";

describe("enrich validateTrackRole — taxonomy allow-list", () => {
  it("accepts a valid track + role pair", () => {
    expect(validateTrackRole("AI", "AI Engineer")).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("accepts a valid track with empty role", () => {
    expect(validateTrackRole("Finance", "")).toEqual({ track: "Finance", role: "" });
  });

  it("rejects an off-taxonomy TRACK -> both empty", () => {
    expect(validateTrackRole("Crypto", "Degen")).toEqual({ track: "", role: "" });
    expect(validateTrackRole("finance", "Investment Banking")).toEqual({
      track: "",
      role: "",
    });
  });

  it("rejects an off-taxonomy ROLE but keeps the valid track", () => {
    expect(validateTrackRole("Finance", "Crypto Trader")).toEqual({
      track: "Finance",
      role: "",
    });
  });

  it("rejects a role that belongs to a DIFFERENT track (mismatch)", () => {
    // "AI Engineer" is an AI role, not a Finance role.
    expect(validateTrackRole("Finance", "AI Engineer")).toEqual({
      track: "Finance",
      role: "",
    });
  });

  it("coerces nullish input to empty", () => {
    expect(validateTrackRole(null, undefined)).toEqual({ track: "", role: "" });
  });
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/contacts/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contacts/enrich — per-contact credit metering", () => {
  beforeEach(() => {
    supabaseState.reset();
    vi.clearAllMocks();
    delete process.env.PDL_API_KEY;
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    mockRequireSubscription.mockResolvedValue(null);
    mockGetUserPrefs.mockResolvedValue({});
    mockLoadContactTags.mockResolvedValue([]);
    mockRescoreContact.mockReturnValue({ affiliations: [], score: 0, tier: "cold" });
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        industry: "Investment Banking",
        seniorityLevel: "Analyst",
        education: "",
        location: "",
        track: "",
        role: "",
      }),
    });
  });

  it("stops the batch and returns outOfCredits when a charge fails mid-loop", async () => {
    supabaseState.fetchResult = {
      data: [
        { id: "c1", name: "Alice", title: "Analyst", firmName: "GS" },
        { id: "c2", name: "Bob", title: "Analyst", firmName: "JPM" },
      ],
      error: null,
    };
    supabaseState.remaining = 1;
    // First contact pays; second charge fails -> loop breaks before persisting c2.
    mockSpendCredits
      .mockResolvedValueOnce({ ok: true, balance: 0 })
      .mockResolvedValueOnce({ ok: false, reason: "insufficient", balance: 0 });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outOfCredits).toBe(true);
    expect(body.enriched).toBe(1);
    // Charge-after-success: both contacts are enriched by the model first, then
    // charged. The second charge fails and stops the loop BEFORE c2 is written,
    // so only the first contact is persisted and counted.
    expect(mockSpendCredits).toHaveBeenCalledTimes(2);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(supabaseState.updateCalls).toBe(1);
  });

  it("does not flag outOfCredits when every contact pays", async () => {
    supabaseState.fetchResult = {
      data: [{ id: "c1", name: "Alice", title: "Analyst", firmName: "GS" }],
      error: null,
    };
    supabaseState.remaining = 0;
    mockSpendCredits.mockResolvedValue({ ok: true, balance: 5 });

    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(body.outOfCredits).toBe(false);
    expect(body.enriched).toBe(1);
  });

  it("does NOT charge for a contact whose enrichment fails (charge-after-success)", async () => {
    supabaseState.fetchResult = {
      data: [{ id: "c1", name: "Alice", title: "Analyst", firmName: "GS" }],
      error: null,
    };
    supabaseState.remaining = 1;
    mockSpendCredits.mockResolvedValue({ ok: true, balance: 5 });
    // Model returns no parseable JSON -> enrichOne returns null -> failed, no charge.
    mockGenerateText.mockResolvedValue({ text: "the gateway returned an error page" });

    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(body.enriched).toBe(0);
    expect(body.failed).toBe(1);
    // The credit was never spent for the failed contact, and no row was written.
    expect(mockSpendCredits).not.toHaveBeenCalled();
    expect(supabaseState.updateCalls).toBe(0);
  });

  it("charges only the contacts that succeed in a mixed batch", async () => {
    supabaseState.fetchResult = {
      data: [
        { id: "c1", name: "Alice", title: "Analyst", firmName: "GS" },
        { id: "c2", name: "Bob", title: "Analyst", firmName: "JPM" },
      ],
      error: null,
    };
    supabaseState.remaining = 1;
    mockSpendCredits.mockResolvedValue({ ok: true, balance: 5 });
    // c1 enriches (valid JSON), c2 fails (no JSON) -> only c1 is charged.
    mockGenerateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          industry: "Investment Banking",
          seniorityLevel: "Analyst",
          education: "",
          location: "",
          track: "",
          role: "",
        }),
      })
      .mockResolvedValueOnce({ text: "gateway 502" });

    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(body.enriched).toBe(1);
    expect(body.failed).toBe(1);
    // Two AI attempts, but only the successful contact was charged.
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockSpendCredits).toHaveBeenCalledTimes(1);
    expect(mockSpendCredits).toHaveBeenCalledWith("test@unc.edu", 1, "enrich", { contactId: "c1" });
  });
});
