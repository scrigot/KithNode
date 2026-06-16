import { describe, it, expect, vi, beforeEach } from "vitest";

// Route authenticates via auth() (NextAuth). Mock it here — importing the real
// @/lib/auth pulls NextAuth + next/server into Vitest and breaks collection.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Supabase is fully controlled per-test via mockFrom.
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { GET } from "./route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSelectChain(data: unknown, opts?: { withOrder?: boolean }) {
  const inner = opts?.withOrder
    ? {
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data, error: null })),
        })),
      }
    : {
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data, error: null })),
        })),
      };
  return { select: vi.fn(() => inner) };
}

// ── GET ────────────────────────────────────────────────────────────────────

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockFrom.mockReturnValue(makeSelectChain([], { withOrder: true }));
    const response = await GET();
    expect(response.status).toBe(401);
  });

  // Wires the route's three list queries: AlumniContact (select→eq→order),
  // UserDiscover (select→eq→eq), PipelineEntry (select→eq).
  function mockListQueries(contacts: Record<string, unknown>[], pipeline: Record<string, unknown>[] = []) {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: contacts, error: null })),
            })),
          })),
        };
      }
      if (callCount === 2) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
      if (callCount === 3) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: pipeline, error: null })),
          })),
        };
      }
      return makeSelectChain([], { withOrder: true });
    });
  }

  const baseContact = {
    title: "Analyst",
    linkedInUrl: "",
    education: "",
    location: "",
    affiliations: "",
    university: "",
    firmName: "GS",
    importedByUserId: "test@unc.edu",
    createdAt: "2026-06-11T12:00:00.000Z",
  };

  it("returns contacts from Supabase", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    mockListQueries([
      { ...baseContact, id: "1", name: "Jane Doe", warmthScore: 65, tier: "warm" },
    ]);

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
    // Two-axis model: the score IS the raw affiliation fit.
    expect(body[0].score.fit_score).toBe(65);
    expect(body[0].score.total_score).toBe(65);
    expect(body[0].relationship_class).toBe("");
    expect(body[0].score.tier).toBe("warm");
    // created_at is surfaced for the Warm Signals "Newest" sort.
    expect(body[0].created_at).toBe("2026-06-11T12:00:00.000Z");
  });

  it("kith outranks every fit tier: friend sorts first and tier reads kith", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    mockListQueries([
      { ...baseContact, id: "stranger", name: "Perfect Stranger", warmthScore: 100, tier: "hot" },
      { ...baseContact, id: "friend", name: "Cooper", warmthScore: 60, tier: "warm", isFriend: true },
    ]);

    const response = await GET();
    const body = await response.json();
    expect(body[0].id).toBe("friend");
    expect(body[0].score.tier).toBe("kith");
    expect(body[0].relationship_class).toBe("kith");
    // The stranger keeps the full fit score + hot tier right below the class.
    expect(body[1].id).toBe("stranger");
    expect(body[1].score.tier).toBe("hot");
    expect(body[1].score.total_score).toBe(100);
  });

  it("flags a bare cold stub as needs_info but not an enriched/warm contact", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    mockListQueries([
      // Bare LinkedIn stub: cold tier, no enrichable personal data → needs_info.
      { ...baseContact, id: "stub", name: "Bare Stub", warmthScore: 0, tier: "cold" },
      // Enriched + warm: not cold, has personal data → needs_info falsy.
      { ...baseContact, id: "warm", name: "Warm Alum", warmthScore: 65, tier: "warm", education: "UNC" },
    ]);

    const response = await GET();
    const body = await response.json();
    const stub = body.find((c: { id: string }) => c.id === "stub");
    const warm = body.find((c: { id: string }) => c.id === "warm");
    expect(stub.needs_info).toBe(true);
    expect(warm.needs_info).toBeFalsy();
  });

  it("a responded pipeline stage promotes to kith", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    mockListQueries(
      [{ ...baseContact, id: "replied", name: "Replied Guy", warmthScore: 70, tier: "warm" }],
      [{ contactId: "replied", stage: "responded" }],
    );

    const response = await GET();
    const body = await response.json();
    expect(body[0].relationship_class).toBe("kith");
    expect(body[0].score.tier).toBe("kith");
  });

  it("blanks the owner's private relationship fields for a non-owner viewing a pooled high_value contact", async () => {
    mockAuth.mockResolvedValue({ user: { email: "viewer@unc.edu" } });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      // Call #1: AlumniContact own imports (select→eq→order), viewer owns nothing.
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
      // Call #2: UserDiscover (select→eq), viewer rated foreign1 high_value.
      if (callCount === 2) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [{ contactId: "foreign1", rating: "high_value" }],
                error: null,
              }),
            ),
          })),
        };
      }
      // Call #3: PipelineEntry (select→eq), no pipeline rows for the viewer.
      if (callCount === 3) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      }
      // Call #4: AlumniContact discovered (select→in), the foreign pool row,
      // carrying the OWNER's private relationship data the viewer must not see.
      return {
        select: vi.fn(() => ({
          in: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: "foreign1",
                  name: "Foreign Owner",
                  title: "Analyst",
                  linkedInUrl: "",
                  education: "",
                  location: "",
                  affiliations: "",
                  university: "",
                  firmName: "GS",
                  warmthScore: 70,
                  tier: "warm",
                  importedByUserId: "someone-else@x.com",
                  isFriend: true,
                  lastSpokenAt: "2026-06-01T12:00:00.000Z",
                  speakFrequency: "weekly",
                  createdAt: "2026-06-01T12:00:00.000Z",
                },
              ],
              error: null,
            }),
          ),
        })),
      };
    });

    const response = await GET();
    const body = await response.json();
    // Owner's private relationship fields are blanked for the non-owner viewer.
    expect(body[0].is_friend).toBe(false);
    expect(body[0].speak_frequency).toBe("");
    expect(body[0].last_spoken_at).toBe("");
    // Owner's isFriend must NOT promote the viewer's relationship class.
    expect(body[0].relationship_class).not.toBe("kith");
    // Positive control: high_value unlock still reveals the identity.
    expect(body[0].name).toBe("Foreign Owner");
  });
});
