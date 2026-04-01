import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockDraftOutreach = vi.fn();
vi.mock("@/lib/api", () => ({
  draftOutreach: (...args: unknown[]) => mockDraftOutreach(...args),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/outreach/draft", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/outreach/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST(makeRequest({ contactId: 1 }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when contactId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns draft for valid contact", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockDraftOutreach.mockResolvedValue({
      contact_id: 1,
      subject: "Test Subject",
      body: "Test body",
      outreach_id: 42,
    });

    const response = await POST(makeRequest({ contactId: 1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subject).toBe("Test Subject");
    expect(body.draft).toBe("Test body");
    expect(body.outreachId).toBe(42);
  });

  it("returns 500 on backend error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user@unc.edu" } });
    mockDraftOutreach.mockRejectedValue(new Error("Backend down"));

    const response = await POST(makeRequest({ contactId: 1 }));
    expect(response.status).toBe(500);
  });
});
