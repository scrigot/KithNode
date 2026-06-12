import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...a: unknown[]) => mockGenerateObject(...a),
}));
vi.mock("@ai-sdk/gateway", () => ({ gateway: vi.fn(() => "mock-model") }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Subscription gate: allow by default; a dedicated test asserts the 402 deny path.
const mockRequireSubscription = vi.fn();
vi.mock("@/lib/subscription", () => ({
  requireSubscription: (...a: unknown[]) => mockRequireSubscription(...a),
}));

// Credits gate: allow by default (returns null); a dedicated test asserts 402.
const mockRequireCredits = vi.fn();
vi.mock("@/lib/credits", () => ({
  requireCredits: (...a: unknown[]) => mockRequireCredits(...a),
  CREDIT_COSTS: { enrich: 1, discover: 5, draft: 1, resume: 2 },
}));

// resume-extract is pure helper-land; stub it so the route reaches the gates
// without needing a real PDF or schema.
vi.mock("@/lib/resume-extract", () => ({
  resumeSchema: {},
  validateResumePdf: vi.fn(() => ({ ok: true, bytes: new Uint8Array() })),
  buildResumePrompt: vi.fn(() => "prompt"),
  buildResumeResult: vi.fn((o: unknown) => o),
}));

import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/profile/resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSubscription.mockResolvedValue(null);
    mockRequireCredits.mockResolvedValue(null);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ pdf: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 402 when out of credits", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu" } });
    mockRequireCredits.mockResolvedValue(
      NextResponse.json({ error: "out_of_credits", balance: 0, needed: 2 }, { status: 402 }),
    );
    const res = await POST(makeRequest({ pdf: "x" }));
    expect(res.status).toBe(402);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });
});
