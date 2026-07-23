import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/jobs/source-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobs/source-service")>();
  return { ...actual, updateJobSource: (...args: unknown[]) => mockUpdate(...args), removeJobSource: (...args: unknown[]) => mockRemove(...args) };
});

import { DELETE, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "source-1" }) };

describe("/api/job-sources/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/job-sources/source-1", { method: "PATCH", body: JSON.stringify({ active: false }) });
    expect((await PATCH(request, context)).status).toBe(401);
  });

  it("updates only within the signed-in user's scope", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({ id: "source-1", userId: "user-1", active: false });
    const request = new NextRequest("http://localhost/api/job-sources/source-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }) });
    expect((await PATCH(request, context)).status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith("user-1", "source-1", { active: false });
  });

  it("deletes only within the signed-in user's scope", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRemove.mockResolvedValue(true);
    const request = new NextRequest("http://localhost/api/job-sources/source-1", { method: "DELETE" });
    expect((await DELETE(request, context)).status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith("user-1", "source-1");
  });
});
