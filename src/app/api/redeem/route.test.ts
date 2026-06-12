import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockGrantCredits = vi.fn();
vi.mock("@/lib/credits", () => ({ grantCredits: (...a: unknown[]) => mockGrantCredits(...a) }));

// Per-test supabase control
let promoRow: Record<string, unknown> | null = null;
let updateResult: { data: unknown } = { data: null };
const userUpdateSpy = vi.fn();

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === "PromoCode") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: promoRow }),
              }),
            }),
            update: (patch: unknown) => ({
              eq: (_col: string, _val: unknown) => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: () => {
                      void patch;
                      return Promise.resolve(updateResult);
                    },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "User") {
          return {
            update: (patch: unknown) => ({
              eq: (_col: string, _val: unknown) => {
                userUpdateSpy(patch);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {};
      },
    },
  };
});

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  promoRow = null;
  updateResult = { data: null };
  mockGrantCredits.mockResolvedValue(75);
});

describe("POST /api/redeem", () => {
  it("returns 401 with no session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ code: "KITH-ABCD" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid code", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@test.com" } });
    promoRow = null;
    const res = await POST(makeRequest({ code: "KITH-FAKE" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid code");
  });

  it("returns 400 when code is redeemed by a different user", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@test.com" } });
    promoRow = {
      id: "abc",
      code: "KITH-TEST",
      days: 7,
      credits: 50,
      plan: "trial",
      redeemedByEmail: "other@test.com",
      redeemedAt: new Date().toISOString(),
    };
    const res = await POST(makeRequest({ code: "KITH-TEST" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Code already used");
  });

  it("is idempotent when this user already redeemed the code", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@test.com" } });
    promoRow = {
      id: "abc",
      code: "KITH-TEST",
      days: 7,
      credits: 50,
      plan: "trial",
      redeemedByEmail: "sam@test.com",
      redeemedAt: new Date().toISOString(),
    };
    const res = await POST(makeRequest({ code: "KITH-TEST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyRedeemed).toBe(true);
    expect(mockGrantCredits).not.toHaveBeenCalled();
  });

  it("happy path: marks redeemed, updates user, grants credits", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@test.com" } });
    promoRow = {
      id: "abc",
      code: "KITH-GOOD",
      days: 14,
      credits: 50,
      plan: "trial",
      redeemedByEmail: null,
      redeemedAt: null,
    };
    updateResult = { data: { id: "abc" } };
    mockGrantCredits.mockResolvedValue(100);

    const res = await POST(makeRequest({ code: "kith-good" })); // lowercase input
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.daysGranted).toBe(14);
    expect(body.creditsGranted).toBe(50);
    expect(body.balance).toBe(100);
    expect(mockGrantCredits).toHaveBeenCalledWith("sam@test.com", 50);
    expect(userUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "trial" }),
    );
  });

  it("race: concurrent redeem loses the conditional update → 400", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@test.com" } });
    promoRow = {
      id: "abc",
      code: "KITH-RACE",
      days: 7,
      credits: 50,
      plan: "trial",
      redeemedByEmail: null,
      redeemedAt: null,
    };
    // Simulate the conditional update returning null (row already claimed)
    updateResult = { data: null };

    const res = await POST(makeRequest({ code: "KITH-RACE" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Code already used");
    expect(mockGrantCredits).not.toHaveBeenCalled();
  });
});
