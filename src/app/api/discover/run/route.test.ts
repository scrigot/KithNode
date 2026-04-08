import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────
// Build a minimal supabase chainable that records inserts/updates so the
// test can assert which path the route took.

const supabaseState = {
  existingByLinkedIn: null as { id: string } | null,
  existingByName: null as { id: string } | null,
  insertCalls: 0,
  updateCalls: 0,
  insertError: null as Error | null,
  reset(): void {
    this.existingByLinkedIn = null;
    this.existingByName = null;
    this.insertCalls = 0;
    this.updateCalls = 0;
    this.insertError = null;
  },
};

vi.mock("@/lib/supabase", () => {
  interface SelectChain {
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    _setNext: (r: { data: { id: string } | null }) => SelectChain;
  }

  function makeSelectChain(): SelectChain {
    let nextResult: { data: { id: string } | null } = { data: null };
    const chain: SelectChain = {
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(() => Promise.resolve(nextResult)),
      _setNext(r) {
        nextResult = r;
        return chain;
      },
    };
    return chain;
  }

  return {
    supabase: {
      from: vi.fn(() => {
        const linkedinChain = makeSelectChain();
        const nameChain = makeSelectChain();
        let chainCounter = 0;

        return {
          select: vi.fn(() => {
            chainCounter++;
            // First select call in the route is for linkedInUrl,
            // second is for name+firmName+importedByUserId.
            if (chainCounter === 1) {
              return linkedinChain._setNext({ data: supabaseState.existingByLinkedIn });
            }
            return nameChain._setNext({ data: supabaseState.existingByName });
          }),
          insert: vi.fn(() => {
            supabaseState.insertCalls++;
            return Promise.resolve({ error: supabaseState.insertError });
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => {
              supabaseState.updateCalls++;
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }),
    },
  };
});

const mockGetUserId = vi.fn();
vi.mock("@/lib/get-user", () => ({
  getUserId: () => mockGetUserId(),
}));

const mockGetUserPrefs = vi.fn();
vi.mock("@/lib/user-prefs", () => ({
  getUserPrefs: (...args: unknown[]) => mockGetUserPrefs(...args),
}));

const mockFindContacts = vi.fn();
vi.mock("@/lib/discover/contact-finder", () => ({
  findContacts: (...args: unknown[]) => mockFindContacts(...args),
}));

const mockDetectSignals = vi.fn();
vi.mock("@/lib/discover/signal-detector", () => ({
  detectSignals: (...args: unknown[]) => mockDetectSignals(...args),
}));

const mockFindEmail = vi.fn();
vi.mock("@/lib/discover/email-finder", () => ({
  findEmail: (...args: unknown[]) => mockFindEmail(...args),
}));

const mockRank = vi.fn();
vi.mock("@/lib/discover/ranker", () => ({
  rank: (...args: unknown[]) => mockRank(...args),
}));

const mockSeedsForIndustries = vi.fn();
vi.mock("@/lib/discover/seeds", () => ({
  seedsForIndustries: (...args: unknown[]) => mockSeedsForIndustries(...args),
}));

import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/discover/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PREFS = {
  university: "UNC Chapel Hill",
  hometown: "Charlotte, NC",
  greekOrg: "Chi Phi",
  targetIndustries: ["Investment Banking"],
  targetFirms: ["Goldman Sachs"],
  targetLocations: ["New York, NY"],
};

beforeEach(() => {
  supabaseState.reset();
  vi.clearAllMocks();
  delete process.env.HUNTER_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/discover/run", () => {
  it("returns 401 when no user is authed", async () => {
    mockGetUserId.mockResolvedValue("anonymous");
    const res = await POST(makeRequest({ mode: "quick" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 with friendly message when no industries are set", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockGetUserPrefs.mockResolvedValue({ ...PREFS, targetIndustries: [] });
    mockSeedsForIndustries.mockReturnValue([]);

    const res = await POST(makeRequest({ mode: "quick" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_seeds");
    expect(body.message).toContain("targetIndustry");
  });

  it("runs the full pipeline and inserts new contacts", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockGetUserPrefs.mockResolvedValue(PREFS);
    mockSeedsForIndustries.mockReturnValue([
      { name: "Goldman Sachs", domain: "goldmansachs.com", website: "https://goldmansachs.com" },
    ]);
    mockFindContacts.mockResolvedValue([
      {
        name: "Alice Johnson",
        title: "Analyst",
        company: "Goldman Sachs",
        companyDomain: "goldmansachs.com",
        linkedinUrl: "https://linkedin.com/in/alice",
        source: "linkedin_search",
        sourceUrl: "https://linkedin.com/in/alice",
      },
    ]);
    mockDetectSignals.mockResolvedValue([
      {
        type: "firm-tier",
        label: "Bulge Bracket",
        boost: 18,
        sourceUrl: "https://linkedin.com/in/alice",
        confidence: 0.95,
      },
    ]);
    mockFindEmail.mockResolvedValue({
      email: "alice.johnson@goldmansachs.com",
      confidence: 0.92,
      source: "hunter_verified",
    });
    mockRank.mockReturnValue({
      score: 88,
      tier: "hot",
      fit: 18,
      affinity: 0,
      reachability: 95,
      intent: 0,
      confidence: 0.95,
    });

    const res = await POST(makeRequest({ mode: "quick" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("quick");
    expect(body.candidatesFound).toBe(1);
    expect(body.imported).toBe(1);
    expect(body.updated).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.contacts[0]).toMatchObject({
      name: "Alice Johnson",
      company: "Goldman Sachs",
      score: 88,
      tier: "hot",
      emailSource: "hunter_verified",
    });
    expect(supabaseState.insertCalls).toBe(1);
    expect(supabaseState.updateCalls).toBe(0);
  });

  it("updates instead of inserting when LinkedIn URL is already in DB", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockGetUserPrefs.mockResolvedValue(PREFS);
    mockSeedsForIndustries.mockReturnValue([
      { name: "Goldman Sachs", domain: "goldmansachs.com", website: "https://goldmansachs.com" },
    ]);
    mockFindContacts.mockResolvedValue([
      {
        name: "Alice Johnson",
        title: "Analyst",
        company: "Goldman Sachs",
        companyDomain: "goldmansachs.com",
        linkedinUrl: "https://linkedin.com/in/alice",
        source: "linkedin_search",
        sourceUrl: "https://linkedin.com/in/alice",
      },
    ]);
    mockDetectSignals.mockResolvedValue([]);
    mockFindEmail.mockResolvedValue({ email: "", confidence: 0, source: "none" });
    mockRank.mockReturnValue({ score: 50, tier: "monitor", fit: 0, affinity: 0, reachability: 0, intent: 0, confidence: 1 });

    supabaseState.existingByLinkedIn = { id: "existing-row" };

    await POST(makeRequest({ mode: "quick" }));
    expect(supabaseState.updateCalls).toBe(1);
    expect(supabaseState.insertCalls).toBe(0);
  });

  it("flips skipHunter to true once the budget is exhausted", async () => {
    process.env.HUNTER_API_KEY = "test-key";
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockGetUserPrefs.mockResolvedValue(PREFS);
    mockSeedsForIndustries.mockReturnValue([
      { name: "X", domain: "x.com", website: "https://x.com" },
    ]);

    // 12 candidates, all with hunter_verified emails. Quick budget is 10
    // — so the first 10 should pass skipHunter:false and the last 2
    // should pass skipHunter:true.
    const candidates = Array.from({ length: 12 }, (_, i) => ({
      name: `Person ${i}`,
      title: "Analyst",
      company: "X",
      companyDomain: `x${i}.com`,
      linkedinUrl: "",
      source: "team_page",
      sourceUrl: "",
    }));
    mockFindContacts.mockResolvedValue(candidates);
    mockDetectSignals.mockResolvedValue([]);
    // Mock honors skipHunter so the route's budget enforcement is
    // observable: if skipHunter is false the response is hunter_verified
    // (counts against the budget); if true it's a pattern guess.
    mockFindEmail.mockImplementation(
      (_name: string, _domain: string, opts: { skipHunter?: boolean }) =>
        Promise.resolve(
          opts?.skipHunter
            ? { email: "x@x.com", confidence: 0.5, source: "pattern_guess" }
            : { email: "x@x.com", confidence: 0.9, source: "hunter_verified" },
        ),
    );
    mockRank.mockReturnValue({ score: 50, tier: "monitor", fit: 0, affinity: 0, reachability: 0, intent: 0, confidence: 1 });

    const res = await POST(makeRequest({ mode: "quick" }));
    const body = await res.json();
    expect(body.hunterCallsMade).toBe(10);
    expect(body.hunterBudget).toBe(10);

    // Inspect the skipHunter argument passed to findEmail across calls.
    const calls = mockFindEmail.mock.calls;
    expect(calls.length).toBe(12);
    for (let i = 0; i < 10; i++) expect(calls[i][2].skipHunter).toBe(false);
    for (let i = 10; i < 12; i++) expect(calls[i][2].skipHunter).toBe(true);
  });

  it("counts insert failures without throwing", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    mockGetUserPrefs.mockResolvedValue(PREFS);
    mockSeedsForIndustries.mockReturnValue([
      { name: "X", domain: "x.com", website: "https://x.com" },
    ]);
    mockFindContacts.mockResolvedValue([
      {
        name: "Alice Johnson",
        title: "Analyst",
        company: "X",
        companyDomain: "x.com",
        linkedinUrl: "",
        source: "team_page",
        sourceUrl: "https://x.com/team",
      },
    ]);
    mockDetectSignals.mockResolvedValue([]);
    mockFindEmail.mockResolvedValue({ email: "", confidence: 0, source: "none" });
    mockRank.mockReturnValue({ score: 50, tier: "monitor", fit: 0, affinity: 0, reachability: 0, intent: 0, confidence: 1 });
    supabaseState.insertError = new Error("RLS denied");

    const res = await POST(makeRequest({ mode: "quick" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.failed).toBe(1);
    expect(body.imported).toBe(0);
  });
});
