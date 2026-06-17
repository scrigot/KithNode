import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...a: unknown[]) => mockGenerateObject(...a),
}));
vi.mock("@ai-sdk/gateway", () => ({ gateway: vi.fn(() => "mock-model") }));

// supabase: the route reads subscriptionStatus via .from("User").select().eq()
// .maybeSingle(); api_cost_log telemetry uses .insert(). subStatus drives the
// onboarding bypass path.
const supabaseState = { subStatus: "active" as string | null };
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { subscriptionStatus: supabaseState.subStatus }, error: null }),
          ),
        })),
      })),
    })),
  },
}));

// Subscription gate: allow by default; a dedicated test asserts the 402 deny path.
const mockRequireSubscription = vi.fn();
vi.mock("@/lib/subscription", () => ({
  requireSubscription: (...a: unknown[]) => mockRequireSubscription(...a),
}));

// Credits gate: allow by default (returns null); a dedicated test asserts 402.
// grantCredits is the refund path exercised when extraction fails.
const mockRequireCredits = vi.fn();
const mockGrantCredits = vi.fn();
vi.mock("@/lib/credits", () => ({
  requireCredits: (...a: unknown[]) => mockRequireCredits(...a),
  grantCredits: (...a: unknown[]) => mockGrantCredits(...a),
  CREDIT_COSTS: { enrich: 1, discover: 5, draft: 1, resume: 2 },
}));

// resume-extract is pure helper-land; stub it so the route reaches the gates
// without needing a real PDF or schema. validateResumePdf is overridable so a
// test can drive the malformed-PDF (400-before-charge) path.
const mockValidateResumePdf = vi.fn((..._a: unknown[]) => ({ ok: true, bytes: new Uint8Array() }) as unknown);
vi.mock("@/lib/resume-extract", () => ({
  resumeSchema: {},
  validateResumePdf: (...a: unknown[]) => mockValidateResumePdf(...a),
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
    supabaseState.subStatus = "active";
    mockValidateResumePdf.mockReturnValue({ ok: true, bytes: new Uint8Array() });
    mockRequireSubscription.mockResolvedValue(null);
    mockRequireCredits.mockResolvedValue(null);
    mockGrantCredits.mockResolvedValue(0);
    mockGenerateObject.mockResolvedValue({ object: {}, usage: {}, response: { modelId: "m" } });
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

  it("validates the PDF BEFORE charging — a bad upload never spends credits", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu" } });
    mockValidateResumePdf.mockReturnValue({ ok: false, error: "not a pdf" });
    const res = await POST(makeRequest({ pdf: "bad" }));
    expect(res.status).toBe(400);
    // The credit gate must not have run for a malformed PDF.
    expect(mockRequireCredits).not.toHaveBeenCalled();
    expect(mockGrantCredits).not.toHaveBeenCalled();
  });

  it("refunds the 2-credit charge when extraction throws", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@unc.edu" } });
    mockGenerateObject.mockRejectedValue(new Error("model down"));
    const res = await POST(makeRequest({ pdf: "x" }));
    expect(res.status).toBe(500);
    // Charged (gate ran) then refunded with the same 2-credit cost.
    expect(mockRequireCredits).toHaveBeenCalledWith("user@unc.edu", 2, "resume");
    expect(mockGrantCredits).toHaveBeenCalledWith("user@unc.edu", 2);
  });

  it("onboarding (subscriptionStatus none) skips the gate and never charges", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fresh@unc.edu" } });
    supabaseState.subStatus = "none";
    const res = await POST(makeRequest({ pdf: "x" }));
    expect(res.status).toBe(200);
    // No subscription gate, no credit charge for a brand-new onboarding user.
    expect(mockRequireSubscription).not.toHaveBeenCalled();
    expect(mockRequireCredits).not.toHaveBeenCalled();
  });

  it("onboarding extraction failure does NOT refund (nothing was charged)", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fresh@unc.edu" } });
    supabaseState.subStatus = "none";
    mockGenerateObject.mockRejectedValue(new Error("model down"));
    const res = await POST(makeRequest({ pdf: "x" }));
    expect(res.status).toBe(500);
    expect(mockGrantCredits).not.toHaveBeenCalled();
  });
});
