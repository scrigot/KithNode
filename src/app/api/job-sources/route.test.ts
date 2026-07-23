import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockList = vi.fn();
const mockSave = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/env/server", () => ({ serverEnv: () => ({ BRAVE_SEARCH_API_KEY: undefined, ENABLE_JOB_DISCOVERY: "true" }) }));
vi.mock("@/lib/jobs/source-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobs/source-service")>();
  return { ...actual, listJobSources: (...args: unknown[]) => mockList(...args), saveJobSource: (...args: unknown[]) => mockSave(...args) };
});

import { GET, POST } from "./route";

describe("/api/job-sources", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(new NextRequest("http://localhost/api/job-sources", { method: "POST", body: "{}" }))).status).toBe(401);
  });

  it("lists only the signed-in user's sources", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockList.mockResolvedValue([{ id: "source-1", userId: "user-1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith("user-1");
  });

  it("validates and scopes new sources", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockSave.mockResolvedValue({ id: "source-1", userId: "user-1" });
    const request = new NextRequest("http://localhost/api/job-sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: "OpenAI", careerUrl: "https://jobs.ashbyhq.com/openai" }) });
    expect((await POST(request)).status).toBe(201);
    expect(mockSave).toHaveBeenCalledWith("user-1", { company: "OpenAI", careerUrl: "https://jobs.ashbyhq.com/openai" });
  });
});
