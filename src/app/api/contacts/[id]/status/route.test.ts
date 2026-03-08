import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    connection: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { PATCH, POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contacts/conn-1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contacts/conn-1/status", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const routeContext = { params: Promise.resolve({ id: "conn-1" }) };

describe("PATCH /api/contacts/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ status: "RESPONDED" }), routeContext);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await PATCH(makeRequest({ status: "INVALID" }), routeContext);
    expect(response.status).toBe(400);
  });

  it("returns 404 when connection not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ status: "CONTACTED" }), routeContext);
    expect(response.status).toBe(404);
  });

  it("triggers AutoGuard when status changes to RESPONDED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      alumniId: "alumni-1",
      alumni: { name: "Jane Doe" },
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: "audit-1" });

    const response = await PATCH(makeRequest({ status: "RESPONDED" }), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.autoGuard.triggered).toBe(true);
    expect(body.autoGuard.message).toBe("Jane Doe responded — automation paused");
    expect(body.connection.status).toBe("RESPONDED");
    expect(body.connection.automationPaused).toBe(true);
  });

  it("updates status normally for non-RESPONDED status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      alumniId: "alumni-1",
      alumni: { name: "Jane Doe" },
    });
    mockUpdate.mockResolvedValue({
      id: "conn-1",
      status: "CONTACTED",
      automationPaused: false,
    });

    const response = await PATCH(makeRequest({ status: "CONTACTED" }), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connection.status).toBe("CONTACTED");
    expect(body.autoGuard).toBeUndefined();
  });
});

describe("POST /api/contacts/[id]/status (resume automation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      makePostRequest({ action: "resume_automation" }),
      routeContext,
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(
      makePostRequest({ action: "invalid" }),
      routeContext,
    );
    expect(response.status).toBe(400);
  });

  it("resumes automation successfully", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      alumniId: "alumni-1",
      automationPaused: true,
      alumni: { name: "Jane Doe" },
    });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({ id: "audit-2" });

    const response = await POST(
      makePostRequest({ action: "resume_automation" }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resumed).toBe(true);
    expect(body.message).toBe("Automation resumed for Jane Doe");
  });

  it("returns 400 when automation is not paused", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      alumniId: "alumni-1",
      automationPaused: false,
      alumni: { name: "Jane Doe" },
    });

    const response = await POST(
      makePostRequest({ action: "resume_automation" }),
      routeContext,
    );
    expect(response.status).toBe(400);
  });
});
