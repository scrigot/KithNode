import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    connection: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
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

  it("returns contacts sorted by strength score", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });

    mockFindMany.mockResolvedValue([
      {
        id: "conn-1",
        alumniId: "alumni-1",
        strengthScore: 85,
        status: "NEW",
        alumni: {
          name: "Jane Doe",
          firmName: "Goldman Sachs",
          title: "VP",
          university: "Harvard",
        },
      },
      {
        id: "conn-2",
        alumniId: "alumni-2",
        strengthScore: 60,
        status: "CONTACTED",
        alumni: {
          name: "John Smith",
          firmName: "McKinsey",
          title: "Associate",
          university: "Stanford",
        },
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({
      id: "conn-1",
      alumniId: "alumni-1",
      name: "Jane Doe",
      firmName: "Goldman Sachs",
      title: "VP",
      university: "Harvard",
      strengthScore: 85,
      status: "NEW",
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { alumni: true },
      orderBy: { strengthScore: "desc" },
    });
  });

  it("returns empty array when user has no connections", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });

    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });
});
