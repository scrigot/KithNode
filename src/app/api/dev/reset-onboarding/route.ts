import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { TRIAL_CREDITS } from "@/lib/credit-costs";

/**
 * DEV-ONLY: reset a user so onboarding re-runs from scratch. Clears
 * tutorialDoneAt + every parsed profile field, restores trial credits, and
 * flips subscriptionStatus back to "trial".
 *
 * Two hard guards, both must pass or we return 404 (not 403 — we don't want to
 * advertise the route's existence in production):
 *   1. NODE_ENV must not be "production".
 *   2. DEV_RESET_SECRET must be set AND match the secret the caller provides
 *      (x-dev-secret header or JSON body { secret }).
 *
 * Uses the service-role supabase client (bypasses RLS) — server-only, never
 * imported into a client bundle.
 */

// Profile columns reset to '' (all are non-null text columns defaulting to '').
// Verified against the live public.User schema via Supabase MCP.
const PROFILE_TEXT_COLUMNS = [
  "university",
  "highSchool",
  "hometown",
  "greekOrg",
  "clubs",
  "clubMemberships",
  "skills",
  "educations",
  "experiences",
  "targetIndustry",
  "targetIndustries",
  "targetFirms",
  "targetLocations",
  "onboardingGoal",
  "onboardingPain",
  "onboardingTimeline",
] as const;

const NOT_FOUND = () =>
  NextResponse.json({ error: "not_found" }, { status: 404 });

export async function POST(request: NextRequest) {
  // Guard 1: never in production.
  if (process.env.NODE_ENV === "production") return NOT_FOUND();

  // Guard 2: dev secret must be configured and must match.
  const expected = process.env.DEV_RESET_SECRET;
  if (!expected) return NOT_FOUND();

  let body: { email?: string; secret?: string } = {};
  try {
    body = (await request.json()) as { email?: string; secret?: string };
  } catch {
    body = {};
  }

  const provided = request.headers.get("x-dev-secret") || body.secret || "";
  if (provided !== expected) return NOT_FOUND();

  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    tutorialDoneAt: null,
    credits: TRIAL_CREDITS,
    subscriptionStatus: "trial",
  };
  for (const col of PROFILE_TEXT_COLUMNS) update[col] = "";

  const { data, error } = await supabase
    .from("User")
    .update(update)
    .eq("email", email)
    .select("email")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, reset: data.email });
}
