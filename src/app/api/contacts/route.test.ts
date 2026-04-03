import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetContactsRanked = vi.fn();
vi.mock("@/lib/api", () => ({
  getContactsRanked: (...args: unknown[]) => mockGetContactsRanked(...args),
}));

import { GET } from "./route";

function makeRequest(query = "") {
  return new NextRequest(`http://localhost/api/contacts${query}`);
}

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contacts from FastAPI backend", async () => {
    mockGetContactsRanked.mockResolvedValue([
      { id: 1, name: "Jane Doe" },
    ]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("passes curated param to backend", async () => {
    mockGetContactsRanked.mockResolvedValue([]);

    await GET(makeRequest("?curated=true"));

    expect(mockGetContactsRanked).toHaveBeenCalledWith(0, 100, true);
  });

  it("returns 500 on backend error", async () => {
    mockGetContactsRanked.mockRejectedValue(new Error("Backend down"));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});
