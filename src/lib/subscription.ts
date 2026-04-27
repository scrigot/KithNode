import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export type SubAccess =
  | { allow: true; tier: "active" | "trial" }
  | { allow: false; reason: "no_sub" | "trial_expired" | "canceled" | "past_due" | "no_user" };

/**
 * Returns whether the user has access to paid features.
 * Service-role read; caller MUST have already verified `await auth()`.
 *
 * Allow when:
 *   - subscriptionStatus === "active"
 *   - subscriptionStatus === "trial" AND trialEndsAt > now()
 * Otherwise deny with a reason the UI can map to a CTA.
 */
export async function checkSubscription(userId: string): Promise<SubAccess> {
  if (!userId) return { allow: false, reason: "no_user" };
  const { data } = await supabase
    .from("User")
    .select("subscriptionStatus, trialEndsAt, subscriptionEndsAt")
    .eq("email", userId)
    .maybeSingle();

  const status = (data?.subscriptionStatus || "").toLowerCase();
  if (status === "active") return { allow: true, tier: "active" };
  if (status === "past_due") return { allow: false, reason: "past_due" };
  if (status === "canceled") return { allow: false, reason: "canceled" };
  if (status === "trial") {
    const trialEnd = data?.trialEndsAt ? new Date(data.trialEndsAt).getTime() : 0;
    if (trialEnd > Date.now()) return { allow: true, tier: "trial" };
    return { allow: false, reason: "trial_expired" };
  }
  return { allow: false, reason: "no_sub" };
}

/** Convenience: returns a NextResponse 402 or null. Caller wires this in route handlers. */
export async function requireSubscription(userId: string) {
  const access = await checkSubscription(userId);
  if (access.allow) return null;
  return NextResponse.json(
    { error: "Payment required", reason: access.reason },
    { status: 402 },
  );
}
