import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockConnectionFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    connection: {
      findUnique: (...args: unknown[]) => mockConnectionFindUnique(...args),
    },
  },
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("POST /api/outreach/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await POST(makeRequest({ connectionId: "conn-1" }) as never);
    expect(response.status).toBe(401);
  });

  it("returns 400 when connectionId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const response = await POST(makeRequest({}) as never);
    expect(response.status).toBe(400);
  });

  it("returns 404 when connection not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockConnectionFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ connectionId: "conn-999" }) as never);
    expect(response.status).toBe(404);
  });

  it("returns 404 when connection belongs to another user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockConnectionFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-2",
      strengthScore: 50,
      user: { name: "Other User", university: "MIT", targetIndustry: "Consulting" },
      alumni: {
        name: "Jane Doe",
        title: "VP",
        firmName: "Goldman Sachs",
        university: "MIT",
      },
    });

    const response = await POST(makeRequest({ connectionId: "conn-1" }) as never);
    expect(response.status).toBe(404);
  });

  it("returns draft for valid connection", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockConnectionFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      strengthScore: 65,
      user: {
        name: "John Smith",
        university: "UNC Chapel Hill",
        targetIndustry: "Investment Banking",
      },
      alumni: {
        name: "Jane Doe",
        title: "Vice President",
        firmName: "Goldman Sachs",
        university: "UNC Chapel Hill",
      },
    });

    const response = await POST(makeRequest({ connectionId: "conn-1" }) as never);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.draft).toContain("Jane");
    expect(body.draft).toContain("John Smith");
    expect(body.draft).toContain("Goldman Sachs");
    expect(body.subject).toBeTruthy();
    expect(body.alumniName).toBe("Jane Doe");
  });
});
