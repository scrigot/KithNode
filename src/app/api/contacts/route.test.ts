import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [{ name: "Jane Doe", warmthScore: 65, tier: "warm" }], error: null }),
      }),
    }),
  },
}));

import { GET } from "./route";

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contacts from Supabase", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
  });
});
