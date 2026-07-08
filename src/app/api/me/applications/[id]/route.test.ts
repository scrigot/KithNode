import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prisma = vi.hoisted(() => ({
  meInternshipApplication: {
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
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

import { DELETE, PATCH } from "./route";

const existingApplication = {
  id: "app_1",
  userId: "me@test.com",
  company: "OpenAI",
  role: "AI Engineering Intern",
  location: "",
  season: "",
  jobUrl: "",
  source: "",
  deadline: null,
  status: "interested",
  priority: "medium",
  resumeId: null,
  jobDescription: "",
  notes: "",
  nextAction: "Follow up",
  nextActionDue: null,
  appliedAt: null,
  archived: false,
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
};

function makeRequest(method: "PATCH" | "DELETE", body?: unknown) {
  return new NextRequest("http://localhost/api/me/applications/app_1", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function routeParams(id = "app_1") {
  return { params: Promise.resolve({ id }) };
}

describe("/api/me/applications/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH updates a user-scoped application and allows clearing optional fields", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue(existingApplication);
    prisma.meInternshipApplication.update.mockResolvedValue({
      ...existingApplication,
      status: "applied",
      nextAction: "",
      appliedAt: new Date("2026-07-07T12:00:00.000Z"),
    });

    const response = await PATCH(makeRequest("PATCH", { status: "applied", nextAction: "" }), routeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.application.status).toBe("applied");
    expect(prisma.meInternshipApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app_1" },
        data: expect.objectContaining({
          nextAction: "",
          status: "applied",
          events: expect.objectContaining({
            create: expect.objectContaining({
              userId: "me@test.com",
              type: "status_change",
            }),
          }),
        }),
      }),
    );
  });

  it("PATCH rejects invalid priority before updating", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue(existingApplication);

    const response = await PATCH(makeRequest("PATCH", { priority: "urgent" }), routeParams());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid priority");
    expect(prisma.meInternshipApplication.update).not.toHaveBeenCalled();
  });

  it("PATCH returns 404 for another user's application", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue(null);

    const response = await PATCH(makeRequest("PATCH", { status: "applied" }), routeParams("other_app"));

    expect(response.status).toBe(404);
    expect(prisma.meInternshipApplication.findFirst).toHaveBeenCalledWith({
      where: { id: "other_app", userId: "me@test.com" },
    });
    expect(prisma.meInternshipApplication.update).not.toHaveBeenCalled();
  });

  it("DELETE deletes only a user-scoped application", async () => {
    prisma.meInternshipApplication.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(makeRequest("DELETE"), routeParams());

    expect(response.status).toBe(200);
    expect(prisma.meInternshipApplication.deleteMany).toHaveBeenCalledWith({
      where: { id: "app_1", userId: "me@test.com" },
    });
  });
});
