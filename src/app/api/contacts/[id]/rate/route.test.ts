import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockSaveContactRating = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/discover/rating", () => ({
  isContactRating: (value: unknown) => ["high_value", "skip", "later", "not_interested"].includes(String(value)),
  saveContactRating: (...args: unknown[]) => mockSaveContactRating(...args),
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/contacts/contact-1/rate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const context = { params: Promise.resolve({ id: "contact-1" }) };

describe("POST /api/contacts/[id]/rate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(request({ rating: "high_value" }), context)).status).toBe(401);
  });

  it("rejects invalid ratings", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    expect((await POST(request({ rating: "excellent" }), context)).status).toBe(400);
    expect(mockSaveContactRating).not.toHaveBeenCalled();
  });

  it("writes a string contact id for the authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockSaveContactRating.mockResolvedValue({ contact_id: "contact-1", rating: "high_value" });
    const response = await POST(request({ rating: "high_value" }), context);
    expect(response.status).toBe(200);
    expect(mockSaveContactRating).toHaveBeenCalledWith("user-1", "contact-1", "high_value");
  });
});
