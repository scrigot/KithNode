import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable fixtures the tests drive.
let userRow: Record<string, unknown> | null;
let rpcReturns: Record<string, unknown>;
const insertSpy = vi.fn();
const updateSpy = vi.fn();

vi.mock("@/lib/supabase", () => {
  const chain = (terminal: unknown) => {
    const obj: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) obj[m] = () => obj;
    obj.maybeSingle = () => Promise.resolve({ data: userRow });
    obj.update = (patch: unknown) => {
      updateSpy(patch);
      return { eq: () => Promise.resolve({ error: null }) };
    };
    obj.insert = (row: unknown) => {
      insertSpy(row);
      return Promise.resolve({ error: null });
    };
    void terminal;
    return obj;
  };
  return {
    supabase: {
      from: () => chain(null),
      rpc: (fn: string) => Promise.resolve({ data: rpcReturns[fn] }),
    },
  };
});

import {
  refillDue,
  nextRenewal,
  spendCredits,
  grantCredits,
  requireCredits,
  getBalance,
} from "./credits";

beforeEach(() => {
  userRow = { subscriptionStatus: "trial", creditsMonthlyAllotment: 0, creditsRenewAt: null, credits: 10 };
  rpcReturns = {};
  insertSpy.mockClear();
  updateSpy.mockClear();
});

describe("refillDue / nextRenewal (pure)", () => {
  const now = Date.parse("2026-06-12T00:00:00Z");
  it("fires only for an active subscriber past renewal with an allotment", () => {
    expect(refillDue("active", 200, now - 1000, now)).toBe(true);
    expect(refillDue("trial", 200, now - 1000, now)).toBe(false);
    expect(refillDue("active", 0, now - 1000, now)).toBe(false);
    expect(refillDue("active", 200, now + 1000, now)).toBe(false);
  });
  it("advances renewal by whole months to the first boundary past now", () => {
    const renew = Date.parse("2026-04-01T00:00:00Z");
    const next = nextRenewal(renew, now);
    expect(next).toBeGreaterThan(now);
    // Stops at the FIRST month boundary after now, never overshoots far.
    expect(next - now).toBeLessThan(35 * 86_400_000);
  });
});

describe("spendCredits", () => {
  it("deducts and logs a UsageEvent on success", async () => {
    rpcReturns = { spend_credits: 7 };
    const res = await spendCredits("a@unc.edu", 3, "enrich", { costUsd: 0.02 });
    expect(res).toEqual({ ok: true, balance: 7 });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "a@unc.edu", action: "enrich", credits: 3, costUsd: 0.02 }),
    );
  });

  it("returns insufficient (no log) when the guarded RPC declines", async () => {
    rpcReturns = { spend_credits: null };
    userRow = { ...userRow, credits: 1 };
    const res = await spendCredits("a@unc.edu", 5, "draft");
    expect(res).toEqual({ ok: false, reason: "insufficient", balance: 1 });
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("grantCredits + getBalance", () => {
  it("grantCredits returns the new balance from add_credits", async () => {
    rpcReturns = { add_credits: 60 };
    expect(await grantCredits("a@unc.edu", 50)).toBe(60);
  });
  it("getBalance reads the User credits", async () => {
    userRow = { ...userRow, credits: 42 };
    expect(await getBalance("a@unc.edu")).toBe(42);
  });
});

describe("requireCredits", () => {
  it("returns null when the charge goes through", async () => {
    rpcReturns = { spend_credits: 4 };
    expect(await requireCredits("a@unc.edu", 1, "draft")).toBeNull();
  });
  it("returns a 402 with the balance when out of credits", async () => {
    rpcReturns = { spend_credits: null };
    userRow = { ...userRow, credits: 0 };
    const res = await requireCredits("a@unc.edu", 5, "discover");
    expect(res?.status).toBe(402);
    const body = await res!.json();
    expect(body).toMatchObject({ error: "out_of_credits", balance: 0, needed: 5 });
  });
});
