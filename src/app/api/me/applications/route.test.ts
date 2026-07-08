import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prisma = vi.hoisted(() => ({
  meInternshipApplication: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  meResume: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/me/config", () => ({
  PERSONAL_MODE: true,
  meUserEmail: () => "me@test.com",
}));

vi.mock("@/lib/me/db", () => ({
  prisma,
}));

import { GET, POST } from "./route";

function makeRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/me/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns user-scoped filtered applications", async () => {
    prisma.meInternshipApplication.findMany.mockResolvedValue([{ id: "app_1", company: "Databricks" }]);

    const response = await GET(makeRequest("http://localhost/api/me/applications?status=applied&actions=open&sort=company_asc"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.applications).toEqual([{ id: "app_1", company: "Databricks" }]);
    expect(prisma.meInternshipApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "me@test.com" }),
        orderBy: [{ company: "asc" }, { role: "asc" }],
        take: 300,
      }),
    );
  });

  it("POST creates an application for the personal user", async () => {
    prisma.meInternshipApplication.create.mockResolvedValue({
      id: "app_1",
      company: "OpenAI",
      role: "AI Engineering Intern",
      status: "applying",
    });

    const response = await POST(makeRequest("http://localhost/api/me/applications", {
      company: " OpenAI ",
      role: " AI Engineering Intern ",
      status: "applying",
      priority: "high",
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.application.id).toBe("app_1");
    expect(prisma.meInternshipApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "me@test.com",
          company: "OpenAI",
          role: "AI Engineering Intern",
          status: "applying",
          priority: "high",
        }),
      }),
    );
  });

  it("POST rejects invalid status before writing", async () => {
    const response = await POST(makeRequest("http://localhost/api/me/applications", {
      company: "OpenAI",
      role: "AI Engineering Intern",
      status: "bad",
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid status");
    expect(prisma.meInternshipApplication.create).not.toHaveBeenCalled();
  });

  it("POST verifies selected resumes are user-scoped", async () => {
    prisma.meResume.findFirst.mockResolvedValue(null);

    const response = await POST(makeRequest("http://localhost/api/me/applications", {
      company: "OpenAI",
      role: "AI Engineering Intern",
      resumeId: "resume_other",
    }));

    expect(response.status).toBe(404);
    expect(prisma.meResume.findFirst).toHaveBeenCalledWith({
      where: { id: "resume_other", userId: "me@test.com" },
      select: { id: true },
    });
    expect(prisma.meInternshipApplication.create).not.toHaveBeenCalled();
  });
});
