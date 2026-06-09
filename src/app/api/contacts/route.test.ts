import { describe, it, expect, vi, beforeEach } from "vitest";

// Route authenticates via auth() (NextAuth). Mock it here — importing the real
// @/lib/auth pulls NextAuth + next/server into Vitest and breaks collection.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/supabase", () => {
  function makeChain(data: unknown) {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data, error: null })),
        })),
      })),
    };
  }

  let callCount = 0;
  return {
    supabase: {
      from: vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // AlumniContact own contacts
          return makeChain([
            // importedByUserId matches the authed user so the row is "own" and
            // the route returns it un-redacted (PII redaction only applies to
            // shared-pool contacts the user didn't import).
            { id: "1", name: "Jane Doe", title: "Analyst", warmthScore: 65, tier: "warm", linkedInUrl: "", education: "", location: "", affiliations: "", university: "", firmName: "GS", importedByUserId: "test@unc.edu" },
          ]);
        }
        if (callCount === 2) {
          // UserDiscover high_value
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          };
        }
        return makeChain([]);
      }),
    },
  };
});

import { GET } from "./route";

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns contacts from Supabase", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
    expect(body[0]).toHaveProperty("score");
    expect(body[0].score.fit_score).toBe(65);
  });
});
