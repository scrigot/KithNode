import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CREDIT_COSTS, CREDIT_ALLOTMENTS, type CreditAction } from "@/lib/credit-costs";

// Re-export so existing server imports from "@/lib/credits" keep working.
export { CREDIT_COSTS, CREDIT_ALLOTMENTS };
export type { CreditAction };

/**
 * Credit metering. A second gate (on top of requireSubscription) over the
 * actions that actually cost money: enrich, discover, draft, resume. Rescore is
 * deliberately NOT here — it is a pure local recompute with no API call.
 *
 * Balance + atomic spend live on the User row; spend_credits / add_credits are
 * Postgres functions so deduct-if-sufficient is race-free (see the
 * add_paywall_credits_onboarding migration).
 */

export type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient"; balance: number };

/** Pure: is an active subscriber past their monthly renewal moment? */
export function refillDue(
  status: string | null | undefined,
  allotment: number,
  renewMs: number,
  nowMs: number,
): boolean {
  return (
    (status || "").toLowerCase() === "active" &&
    allotment > 0 &&
    renewMs > 0 &&
    nowMs > renewMs
  );
}

/** Pure: advance a renewal timestamp by whole months until it is in the future. */
export function nextRenewal(renewMs: number, nowMs: number): number {
  const d = new Date(renewMs);
  while (d.getTime() <= nowMs) d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

async function readBalance(userEmail: string): Promise<number> {
  const { data } = await supabase
    .from("User")
    .select("credits")
    .eq("email", userEmail)
    .maybeSingle();
  return data?.credits ?? 0;
}

/** Lazy monthly refill — no cron. When an active subscriber crosses their
 * renewal date, reset the balance to their allotment and advance the date. */
async function maybeRefill(userEmail: string): Promise<void> {
  const { data } = await supabase
    .from("User")
    .select("subscriptionStatus, creditsMonthlyAllotment, creditsRenewAt")
    .eq("email", userEmail)
    .maybeSingle();
  if (!data) return;
  const renewMs = data.creditsRenewAt ? new Date(data.creditsRenewAt).getTime() : 0;
  if (!refillDue(data.subscriptionStatus, data.creditsMonthlyAllotment ?? 0, renewMs, Date.now())) {
    return;
  }
  await supabase
    .from("User")
    .update({
      credits: data.creditsMonthlyAllotment,
      creditsRenewAt: new Date(nextRenewal(renewMs, Date.now())).toISOString(),
    })
    .eq("email", userEmail);
}

/** Current balance for the UI (runs the lazy refill first). */
export async function getBalance(userEmail: string): Promise<number> {
  if (!userEmail) return 0;
  await maybeRefill(userEmail);
  return readBalance(userEmail);
}

/** Atomically spend `amount`. On success logs a UsageEvent and returns the new
 * balance; on insufficient funds nothing is deducted. */
export async function spendCredits(
  userEmail: string,
  amount: number,
  action: CreditAction,
  meta: { costUsd?: number; [k: string]: unknown } = {},
): Promise<SpendResult> {
  if (!userEmail) return { ok: false, reason: "insufficient", balance: 0 };
  await maybeRefill(userEmail);

  const { data: newBalance } = await supabase.rpc("spend_credits", {
    p_email: userEmail,
    p_amount: amount,
  });

  if (newBalance === null || newBalance === undefined) {
    return { ok: false, reason: "insufficient", balance: await readBalance(userEmail) };
  }

  const { costUsd = 0, ...rest } = meta;
  await supabase.from("UsageEvent").insert({
    userEmail,
    action,
    credits: amount,
    costUsd,
    meta: rest,
  });

  return { ok: true, balance: newBalance as number };
}

/** Grant (redeem bundle / plan refill). Unguarded; floors at 0. Returns balance. */
export async function grantCredits(userEmail: string, amount: number): Promise<number> {
  const { data } = await supabase.rpc("add_credits", {
    p_email: userEmail,
    p_delta: amount,
  });
  return (data as number) ?? 0;
}

/** Route-facing gate: charges up front, returns a 402 when out of credits, else
 * null (the charge already went through). Mirrors requireSubscription. */
export async function requireCredits(
  userEmail: string,
  amount: number,
  action: CreditAction,
  meta?: { costUsd?: number; [k: string]: unknown },
): Promise<NextResponse | null> {
  const result = await spendCredits(userEmail, amount, action, meta);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "out_of_credits", balance: result.balance, needed: amount },
    { status: 402 },
  );
}
