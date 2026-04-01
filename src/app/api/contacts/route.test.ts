import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockGetContactsRanked = vi.fn();
vi.mock("@/lib/api", () => ({
  getContactsRanked: () => mockGetContactsRanked(),
}));

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

  it("returns contacts from FastAPI backend", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockGetContactsRanked.mockResolvedValue([
      {
        id: 1,
        name: "Jane Doe",
        title: "CEO",
        company: { name: "TestCo" },
        score: { total_score: 75, tier: "warm" },
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Jane Doe");
  });

  it("returns 500 on backend error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockGetContactsRanked.mockRejectedValue(new Error("Backend down"));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
