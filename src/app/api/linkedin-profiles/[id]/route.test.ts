import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirst: vi.fn(),
  deleteProfile: vi.fn(),
  updateProfile: vi.fn(),
  transaction: vi.fn(),
}));

mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) => work({
  linkedInProfile: {
    findFirst: mocks.findFirst,
    delete: mocks.deleteProfile,
    update: mocks.updateProfile,
  },
}));

vi.mock("@/lib/auth", () => ({ auth: () => mocks.auth() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { DELETE } from "./route";

const request = new NextRequest("http://localhost/api/linkedin-profiles/profile-1", { method: "DELETE" });
const context = { params: Promise.resolve({ id: "profile-1" }) };

describe("DELETE /api/linkedin-profiles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) => work({
      linkedInProfile: {
        findFirst: mocks.findFirst,
        delete: mocks.deleteProfile,
        update: mocks.updateProfile,
      },
    }));
    mocks.deleteProfile.mockResolvedValue({ id: "profile-1" });
    mocks.updateProfile.mockResolvedValue({ id: "profile-2", isPrimary: true });
  });

  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await DELETE(request, context)).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not reveal or delete a profile outside the signed-in user's scope", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findFirst.mockResolvedValueOnce(null);

    expect((await DELETE(request, context)).status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "profile-1", userId: "user-1" },
      select: { id: true, isPrimary: true },
    });
    expect(mocks.deleteProfile).not.toHaveBeenCalled();
  });

  it("permanently deletes an owned non-primary profile", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findFirst.mockResolvedValueOnce({ id: "profile-1", isPrimary: false });

    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true, promotedProfileId: null });
    expect(mocks.deleteProfile).toHaveBeenCalledWith({ where: { id: "profile-1" } });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("promotes the newest active profile after deleting the primary", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findFirst
      .mockResolvedValueOnce({ id: "profile-1", isPrimary: true })
      .mockResolvedValueOnce({ id: "profile-2" });

    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true, promotedProfileId: "profile-2" });
    expect(mocks.findFirst).toHaveBeenLastCalledWith({
      where: { userId: "user-1", status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    expect(mocks.updateProfile).toHaveBeenCalledWith({
      where: { id: "profile-2" },
      data: { isPrimary: true, status: "current" },
    });
  });
});
