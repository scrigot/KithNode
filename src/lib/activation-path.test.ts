import { describe, it, expect } from "vitest";
import { CREDIT_COSTS, ACTIVATION_PATH_COST, TRIAL_CREDITS } from "./credit-costs";

/**
 * Route-level smoke test for the happy-path activation flow:
 *   resume parse -> one Discover search -> enrich ~15 surfaced contacts ->
 *   one outreach draft.
 *
 * The real route handlers import NextAuth (@/lib/auth), which can't load under
 * Vitest (it pulls next/server). So instead of importing those handlers we
 * assert the CREDIT MATH and key invariants directly, mirroring the spend logic
 * from src/lib/credits.ts against an in-memory balance (no real Supabase).
 *
 * The test FAILS if any step would hit a credit wall or drive the balance
 * negative — that's the regression we're guarding (a tester ran out of credits
 * before they could draft).
 */

// --- Mirror of the spend math in src/lib/credits.ts spendCredits() ---------
// spend_credits is a Postgres "deduct-if-sufficient" function: it subtracts the
// amount only when the balance covers it, otherwise it deducts nothing and
// signals insufficient funds. We model that exact contract here.
type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient"; balance: number };

function spend(balance: number, amount: number): SpendResult {
  if (balance < amount) {
    return { ok: false, reason: "insufficient", balance };
  }
  return { ok: true, balance: balance - amount };
}

// The ordered sequence of charges a brand-new user incurs walking the full
// activation path. Mirrors ACTIVATION_PATH_COST's composition.
const ENRICH_BATCH = 15;
function activationSteps(): Array<{ action: keyof typeof CREDIT_COSTS; amount: number }> {
  return [
    { action: "resume", amount: CREDIT_COSTS.resume },
    { action: "discover", amount: CREDIT_COSTS.discover },
    ...Array.from({ length: ENRICH_BATCH }, () => ({
      action: "enrich" as const,
      amount: CREDIT_COSTS.enrich,
    })),
    { action: "draft", amount: CREDIT_COSTS.draft },
  ];
}

describe("activation path: credit wall is impossible", () => {
  it("trial grant covers the full activation path cost", () => {
    expect(TRIAL_CREDITS).toBeGreaterThanOrEqual(ACTIVATION_PATH_COST);
  });

  it("the per-step charge sequence sums to ACTIVATION_PATH_COST", () => {
    const total = activationSteps().reduce((acc, s) => acc + s.amount, 0);
    expect(total).toBe(ACTIVATION_PATH_COST);
  });

  it("walking every step from TRIAL_CREDITS never insufficient, never negative", () => {
    let balance = TRIAL_CREDITS;
    for (const step of activationSteps()) {
      const result = spend(balance, step.amount);
      // Any insufficient result here IS the credit wall — fail loudly.
      expect(result.ok, `credit wall at step "${step.action}" (balance ${balance})`).toBe(true);
      if (result.ok) balance = result.balance;
      expect(balance).toBeGreaterThanOrEqual(0);
    }
    // Documented headroom: the trial floor leaves room for several more runs.
    expect(balance).toBe(TRIAL_CREDITS - ACTIVATION_PATH_COST);
    expect(balance).toBeGreaterThan(0);
  });

  it("leaves headroom for at least one more full Discover+enrich run", () => {
    const remaining = TRIAL_CREDITS - ACTIVATION_PATH_COST;
    const oneMoreRun = CREDIT_COSTS.discover + CREDIT_COSTS.enrich * ENRICH_BATCH;
    expect(remaining).toBeGreaterThanOrEqual(oneMoreRun);
  });

  it("deduct-if-sufficient: a step that exceeds balance deducts nothing", () => {
    const low = CREDIT_COSTS.draft - 1; // one short of the cheapest metered step
    const result = spend(low, CREDIT_COSTS.discover);
    expect(result.ok).toBe(false);
    // Balance is untouched on insufficient funds (matches the SQL contract).
    expect(result.balance).toBe(low);
  });
});

// --- Pure helper on the activation path: Discover query sanitization --------
// Mirrors the PostgREST filter sanitizer in src/app/api/discover/route.ts. A
// resume-derived firm name flows into the Discover query; this strips
// injection metacharacters before it reaches PostgREST.
const sanitizeDiscoverQuery = (raw: string) =>
  raw.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 100);

describe("activation path: discover query stays injection-safe", () => {
  it("preserves a normal firm name from a parsed resume", () => {
    expect(sanitizeDiscoverQuery("Goldman Sachs")).toBe("Goldman Sachs");
    expect(sanitizeDiscoverQuery("J.P. Morgan")).toBe("J.P. Morgan");
  });

  it("strips PostgREST filter metacharacters", () => {
    const cleaned = sanitizeDiscoverQuery('x,importedByUserId.neq.,or(tier.eq.1)"*"');
    expect(cleaned).not.toMatch(/[(),"*]/);
  });
});
