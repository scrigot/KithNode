import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockUpdateOutreachStatus = vi.fn();
vi.mock("@/lib/api", () => ({
  updateOutreachStatus: (...args: unknown[]) => mockUpdateOutreachStatus(...args),
}));

import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contacts/1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const routeContext = { params: Promise.resolve({ id: "1" }) };

describe("PATCH /api/contacts/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ status: "sent" }), routeContext);
    expect(response.status).toBe(401);
  });

  it("proxies status update to FastAPI", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockUpdateOutreachStatus.mockResolvedValue({
      outreach_id: 1,
      status: "sent",
      message: "Updated",
    });

    const response = await PATCH(makeRequest({ status: "sent" }), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connection.status).toBe("sent");
  });
});
