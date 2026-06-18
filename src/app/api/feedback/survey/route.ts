import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { grantCredits } from "@/lib/credits";
import { FEEDBACK_CREDITS } from "@/lib/credit-costs";
import { notifyFounder } from "@/lib/notify";

// Structured beta-feedback survey (distinct from /api/feedback, which is the
// help-widget "message the founder" route). Persists to feedback_response and
// grants FEEDBACK_CREDITS exactly once per user.

const PMF_VALUES = new Set(["very", "somewhat", "not"]);
const STEP_VALUES = new Set(["imported", "discover", "saved", "drafted", "sent"]);
const MAX_TEXT = 4000;

/** Coerce free text to a trimmed, length-capped string (or null). */
function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, MAX_TEXT);
  return t.length ? t : null;
}

/** Coerce a 1..5 rating, else null. */
function score(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** GET — has the current user already submitted? Drives the "thanks / Beta
 * Contributor" state and (later) the in-app badge. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data } = await supabase
    .from("feedback_response")
    .select("created_at")
    .eq("user_email", session.user.email)
    .maybeSingle();
  return NextResponse.json({ submitted: !!data });
}

/** POST — record feedback. Credits are granted exactly once per user on first
 * submit; later edits update the text but never re-grant (no farming). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;

  const body = await req.json().catch(() => ({}));

  const pmf = typeof body.pmf === "string" && PMF_VALUES.has(body.pmf) ? body.pmf : null;
  const furthestStep =
    typeof body.furthestStep === "string" && STEP_VALUES.has(body.furthestStep)
      ? body.furthestStep
      : null;
  const friction = text(body.friction);
  const weeklyUse = text(body.weeklyUse);

  // The three signal-bearing required fields. Everything else is optional so the
  // form stays high-completion.
  if (!pmf || !friction || !weeklyUse) {
    return NextResponse.json(
      { error: "Please answer the PMF, friction, and weekly-use questions." },
      { status: 400 },
    );
  }

  const fields = {
    pmf,
    accuracy_score: score(body.accuracyScore),
    onboarding_score: score(body.onboardingScore),
    furthest_step: furthestStep,
    whoa: text(body.whoa),
    friction,
    weekly_use: weeklyUse,
    willingness_to_pay: text(body.willingnessToPay),
    updated_at: new Date().toISOString(),
  };

  // Already submitted? Update the text, never re-grant.
  const { data: existing } = await supabase
    .from("feedback_response")
    .select("id")
    .eq("user_email", email)
    .maybeSingle();

  if (existing) {
    await supabase.from("feedback_response").update(fields).eq("id", existing.id);
    return NextResponse.json({ ok: true, alreadySubmitted: true, creditsGranted: false });
  }

  // First submit: insert with credits_granted, then grant. The user_email unique
  // index makes the insert the single source of truth — a concurrent double-submit
  // loses the race (23505) and never double-grants.
  const { error } = await supabase.from("feedback_response").insert({
    user_email: email,
    ...fields,
    credits_granted: true,
    created_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      // Lost the race — another request already recorded + granted.
      return NextResponse.json({ ok: true, alreadySubmitted: true, creditsGranted: false });
    }
    console.error("[feedback-survey] insert failed:", error.message);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  // First-submit only (the existing-edit branch returns earlier): ping the
  // founder. Best-effort — the response is already saved.
  await notifyFounder({
    event: "feedback_survey",
    title: "📝 Beta feedback submitted",
    lines: [
      email,
      `PMF: ${pmf} · furthest step: ${furthestStep ?? "—"}`,
      `Friction: ${friction.slice(0, 280)}`,
    ],
  }).catch(() => {});

  const balance = await grantCredits(email, FEEDBACK_CREDITS);
  return NextResponse.json({
    ok: true,
    creditsGranted: true,
    granted: FEEDBACK_CREDITS,
    balance,
  });
}
