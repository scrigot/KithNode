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

  it("returns contacts from Supabase", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@unc.edu" } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // AlumniContact own contacts
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: "1",
                      name: "Jane Doe",
                      title: "Analyst",
                      warmthScore: 65,
                      tier: "warm",
                      linkedInUrl: "",
                      education: "",
                      location: "",
                      affiliations: "",
                      university: "",
                      firmName: "GS",
                      importedByUserId: "test@unc.edu",
                      createdAt: "2026-06-11T12:00:00.000Z",
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      if (callCount === 2) {
        // UserDiscover
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
      return makeSelectChain([], { withOrder: true });
    });

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
    expect(body[0]).toHaveProperty("score");
    expect(body[0].score.fit_score).toBe(65);
    // created_at is surfaced for the Warm Signals "Newest" sort.
    expect(body[0].created_at).toBe("2026-06-11T12:00:00.000Z");
  });
});
