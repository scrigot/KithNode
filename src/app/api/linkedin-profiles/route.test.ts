import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  createProfile: vi.fn(),
  createRevision: vi.fn(),
  transaction: vi.fn(),
}));
mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) => work({
  linkedInProfile: { create: mocks.createProfile },
  linkedInProfileRevision: { create: mocks.createRevision },
}));

vi.mock("@/lib/auth", () => ({ auth: () => mocks.auth() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    linkedInProfile: { findMany: mocks.findMany, count: mocks.count },
    $transaction: mocks.transaction,
  },
}));

import { GET, POST } from "./route";

describe("LinkedIn profile collection API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.createProfile.mockResolvedValue({ id: "profile-1", name: "Ada Lovelace", score: 10 });
    mocks.createRevision.mockResolvedValue({ id: "revision-1" });
  });

  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("lists only the authenticated user's profile copies", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    expect((await GET()).status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("normalizes imports and creates an immutable first revision", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const request = new NextRequest("http://localhost/api/linkedin-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "json_import",
        content: {
          name: "Ada Lovelace",
          headline: "Software engineer",
          experiences: [{ title: "Engineer", firm: "Example" }],
        },
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.createProfile).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", isPrimary: true, source: "json_import" }) }));
    expect(mocks.createRevision).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ profileId: "profile-1", userId: "user-1", version: 1, source: "import" }) }));
  });
});
