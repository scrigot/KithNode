import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockSetOutreachStatus = vi.fn();
vi.mock("@/lib/outreach/status", () => ({
  isOutreachStatus: (value: unknown) => ["draft", "sent", "responded", "meeting_set", "failed"].includes(String(value).toLowerCase()),
  setOutreachStatus: (...args: unknown[]) => mockSetOutreachStatus(...args),
}));

import { PATCH } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contacts/1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const routeContext = { params: Promise.resolve({ id: "draft-1" }) };

describe("PATCH /api/contacts/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ status: "sent" }), routeContext);
    expect(response.status).toBe(401);
  });

  it("updates a user-scoped persisted draft", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockSetOutreachStatus.mockResolvedValue({
      id: "draft-1",
      contactId: "contact-1",
      status: "sent",
    });

    const response = await PATCH(makeRequest({ status: "sent" }), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connection.status).toBe("sent");
    expect(mockSetOutreachStatus).toHaveBeenCalledWith("user@unc.edu", "draft-1", "sent");
  });

  it("rejects invalid statuses before touching data", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    const response = await PATCH(makeRequest({ status: "deleted" }), routeContext);
    expect(response.status).toBe(400);
    expect(mockSetOutreachStatus).not.toHaveBeenCalled();
  });

  it("does not reveal another user's draft", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockSetOutreachStatus.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ status: "sent" }), routeContext);
    expect(response.status).toBe(404);
  });
});
