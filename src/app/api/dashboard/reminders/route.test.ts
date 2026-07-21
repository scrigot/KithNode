import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetDashboardReminders = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/dashboard/reminders", () => ({
  getDashboardReminders: (...args: unknown[]) => mockGetDashboardReminders(...args),
}));

import { GET } from "./route";

describe("GET /api/dashboard/reminders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks backend failures as degraded", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    mockGetDashboardReminders.mockRejectedValue(new Error("offline"));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      reminders: [],
      degraded: true,
      error: "reminders_query_unavailable",
    });
  });

  it("requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});
