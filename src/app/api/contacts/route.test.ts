import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserId = vi.fn();
vi.mock("@/lib/get-user", () => ({
  getUserId: () => mockGetUserId(),
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
            { id: "1", name: "Jane Doe", title: "Analyst", warmthScore: 65, tier: "warm", linkedInUrl: "", education: "", location: "", affiliations: "", university: "", firmName: "GS" },
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

  it("returns contacts from Supabase", async () => {
    mockGetUserId.mockResolvedValue("test@unc.edu");
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
    expect(body[0]).toHaveProperty("score");
    expect(body[0].score.fit_score).toBe(65);
  });
});
