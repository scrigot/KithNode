import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { POST } from "./route";

describe("POST /api/contacts/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("directs callers to the canonical rescore endpoint", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.replacement).toBe("/api/contacts/rescore");
  });
});
