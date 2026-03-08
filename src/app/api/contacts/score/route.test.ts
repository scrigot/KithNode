import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    connection: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
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

  it("returns 404 when user not found in database", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue(null);

    const response = await POST();
    expect(response.status).toBe(404);
  });

  it("scores connections and persists results", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      university: "UNC Chapel Hill",
      targetIndustry: "Investment Banking",
    });

    // First findMany: user's connections
    mockFindMany.mockResolvedValueOnce([
      {
        id: "conn-1",
        alumniId: "alumni-1",
        alumni: {
          university: "UNC Chapel Hill",
          graduationYear: 2020,
          firmName: "Goldman Sachs",
        },
      },
      {
        id: "conn-2",
        alumniId: "alumni-2",
        alumni: {
          university: "Duke University",
          graduationYear: 2018,
          firmName: "McKinsey & Company",
        },
      },
    ]);

    // Second findMany: mutual connections (other users connected to same alumni)
    mockFindMany.mockResolvedValueOnce([
      { alumniId: "alumni-1", userId: "user-2" },
    ]);

    mockUpdate.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scored).toBe(2);

    // alumni-1: UNC match (20) + IB match (15) + tier 1 (25) + 1 mutual (5) = 65
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: { strengthScore: 65 },
    });

    // alumni-2: no uni match + no industry match (McKinsey=Consulting, user=IB) + tier 1 (25) + 0 mutual = 25
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "conn-2" },
      data: { strengthScore: 25 },
    });
  });

  it("handles user with no connections", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      university: "UNC Chapel Hill",
      targetIndustry: "Investment Banking",
    });
    mockFindMany.mockResolvedValueOnce([]); // no connections

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scored).toBe(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
