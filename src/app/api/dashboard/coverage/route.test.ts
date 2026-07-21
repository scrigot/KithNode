import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetDashboardCoverage = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/dashboard/coverage", () => ({
  getDashboardCoverage: (...args: unknown[]) => mockGetDashboardCoverage(...args),
}));

import { GET } from "./route";

describe("GET /api/dashboard/coverage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("marks backend failures as degraded instead of valid empty data", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    mockGetDashboardCoverage.mockRejectedValue(new Error("offline"));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      degraded: true,
      error: "coverage_query_unavailable",
    });
  });

  it("uses the authenticated user id and email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    mockGetDashboardCoverage.mockResolvedValue({ covered: [], uncovered: [] });
    expect((await GET()).status).toBe(200);
    expect(mockGetDashboardCoverage).toHaveBeenCalledWith("user-1", "user@example.com");
  });
});
