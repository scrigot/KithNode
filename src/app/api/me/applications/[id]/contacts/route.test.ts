import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prisma = vi.hoisted(() => ({
  meInternshipApplication: {
    findFirst: vi.fn(),
  },
  meContact: {
    findFirst: vi.fn(),
  },
  meApplicationContact: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  meApplicationEvent: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/me/config", () => ({
  PERSONAL_MODE: true,
  meUserEmail: () => "me@test.com",
}));

vi.mock("@/lib/me/db", () => ({
  prisma,
}));

import { DELETE, POST } from "./route";

function makeRequest(method: "POST" | "DELETE", body?: unknown) {
  return new NextRequest("http://localhost/api/me/applications/app_1/contacts", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function routeParams(id = "app_1") {
  return { params: Promise.resolve({ id }) };
}

describe("/api/me/applications/[id]/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST attaches a scoped contact to a scoped application", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue({ id: "app_1", company: "OpenAI" });
    prisma.meContact.findFirst.mockResolvedValue({ id: "contact_1", name: "Jane Mentor" });
    prisma.meApplicationContact.upsert.mockResolvedValue({ id: "link_1", contactId: "contact_1" });
    prisma.meApplicationEvent.create.mockResolvedValue({ id: "event_1" });

    const response = await POST(makeRequest("POST", { contactId: " contact_1 " }), routeParams());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.link.id).toBe("link_1");
    expect(prisma.meApplicationContact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_applicationId_contactId: {
            userId: "me@test.com",
            applicationId: "app_1",
            contactId: "contact_1",
          },
        },
        create: { userId: "me@test.com", applicationId: "app_1", contactId: "contact_1" },
      }),
    );
    expect(prisma.meApplicationEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "me@test.com",
        applicationId: "app_1",
        type: "contact_attached",
        meta: { contactId: "contact_1" },
      }),
    });
  });

  it("POST rejects contacts outside the personal user scope", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue({ id: "app_1", company: "OpenAI" });
    prisma.meContact.findFirst.mockResolvedValue(null);

    const response = await POST(makeRequest("POST", { contactId: "other_contact" }), routeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Contact not found");
    expect(prisma.meApplicationContact.upsert).not.toHaveBeenCalled();
  });

  it("DELETE removes an existing contact link", async () => {
    prisma.meInternshipApplication.findFirst.mockResolvedValue({ id: "app_1", company: "OpenAI" });
    prisma.meApplicationContact.deleteMany.mockResolvedValue({ count: 1 });
    prisma.meApplicationEvent.create.mockResolvedValue({ id: "event_1" });

    const response = await DELETE(makeRequest("DELETE", { contactId: "contact_1" }), routeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(prisma.meApplicationContact.deleteMany).toHaveBeenCalledWith({
      where: { userId: "me@test.com", applicationId: "app_1", contactId: "contact_1" },
    });
  });
});
