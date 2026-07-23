import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: vi.fn() } }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const payload = {
  name: "Jane Doe",
  title: "Strategy Analyst",
  firmName: "Deloitte",
  location: "New York, NY",
  education: "UNC",
  linkedInUrl: "https://www.linkedin.com/in/jane-doe",
  notes: "Met through the alumni network.",
  whyRelevant: "Shared school",
  skills: ["Artificial Intelligence (AI)", "Generative AI", "Financial Modeling"],
  positions: [
    { title: "Junior Solutions Architect", firm: "Red Hat", employmentType: "Full-time", start: "Jun 2026", end: "Present" },
    { title: "Claude Partner", firm: "Anthropic", employmentType: "Freelance", start: "Jun 2026", end: "Present" },
  ],
};

function request(selectedFields = ["name", "title", "firmName"]) {
  return new Request("http://localhost/api/research/drafts/draft-1/commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selectedFields }),
  }) as import("next/server").NextRequest;
}

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    researchDraft: {
      findFirst: vi.fn().mockResolvedValue({ id: "draft-1", userId: "user-b", status: "ready", sourceType: "linkedin_manual", payload, contactId: null }),
      update: vi.fn().mockResolvedValue({}),
    },
    alumniContact: {
      findFirst: vi.fn().mockResolvedValue({ id: "contact-a", importedByUserId: "user-a" }),
      create: vi.fn(),
      update: vi.fn(),
    },
    userDiscover: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}), update: vi.fn() },
    contactOverride: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
    contactFieldProvenance: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

describe("POST /api/research/drafts/:id/commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-b", email: "b@example.com" } } as never);
  });

  it("links a shared canonical person and writes only the viewer's private overlay", async () => {
    const tx = transaction();
    (prisma.$transaction as unknown as Mock).mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(request(), { params: Promise.resolve({ id: "draft-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ contactId: "contact-a", overlay: true, idempotent: false });
    expect(tx.alumniContact.update).not.toHaveBeenCalled();
    expect(tx.userDiscover.create).toHaveBeenCalledWith({ data: { userId: "user-b", contactId: "contact-a", rating: "high_value" } });
    expect(tx.contactOverride.upsert).toHaveBeenCalled();
    expect(tx.contactFieldProvenance.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ field: "name", source: "linkedin_manual", verified: true })]) });
  });

  it("returns an already committed draft without writing again", async () => {
    const tx = transaction();
    tx.researchDraft.findFirst.mockResolvedValue({ id: "draft-1", userId: "user-b", status: "committed", sourceType: "manual", payload, contactId: "contact-a" });
    (prisma.$transaction as unknown as Mock).mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(request(["name"]), { params: Promise.resolve({ id: "draft-1" }) });
    expect(await response.json()).toMatchObject({ contactId: "contact-a", idempotent: true });
    expect(tx.userDiscover.create).not.toHaveBeenCalled();
    expect(tx.contactFieldProvenance.createMany).not.toHaveBeenCalled();
  });

  it("stores concurrent positions as structured experiences for an owned contact", async () => {
    const tx = transaction({
      alumniContact: {
        findFirst: vi.fn().mockResolvedValue({ id: "contact-a", importedByUserId: "user-b" }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    });
    (prisma.$transaction as unknown as Mock).mockImplementation(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(request(["positions", "skills"]), { params: Promise.resolve({ id: "draft-1" }) });

    expect(response.status).toBe(200);
    expect(tx.alumniContact.update).toHaveBeenCalledWith({
      where: { id: "contact-a" },
      data: {
        experiences: JSON.stringify([
          { title: payload.title, firm: payload.firmName, employmentType: "", start: "", end: "Present" },
          ...payload.positions,
        ]),
        pastFirms: "Deloitte, Red Hat, Anthropic",
        skills: "Artificial Intelligence (AI), Generative AI, Financial Modeling",
      },
    });
    expect(tx.contactFieldProvenance.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ field: "experiences", verified: true }),
        expect.objectContaining({ field: "skills", value: payload.skills, verified: true }),
      ]),
    });
  });
});
