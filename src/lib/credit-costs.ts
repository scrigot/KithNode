// Client-safe credit constants. Lives apart from lib/credits.ts (which imports
// the server-only Supabase client + next/server) so client components can read
// the cost numbers without pulling server code into the bundle. lib/credits.ts
// re-exports these, so existing server imports from "@/lib/credits" still work.

export type CreditAction = "enrich" | "discover" | "draft" | "resume";

/** Credit cost per action. enrich is charged once PER CONTACT. Tune freely. */
export const CREDIT_COSTS: Record<CreditAction, number> = {
  enrich: 1,
  discover: 5,
  draft: 1,
  resume: 2,
};

/**
 * Cost of the full activation path a new user must complete WITHOUT hitting a
 * credit wall: parse a resume during onboarding, run one Discover search (which
 * enriches a batch of surfaced contacts at 1 credit each), and draft one
 * outreach email. Sending is not metered. Derived from CREDIT_COSTS so it stays
 * honest if the per-action costs change.
 */
export const ACTIVATION_PATH_COST =
  CREDIT_COSTS.resume + // resume parse during onboarding
  CREDIT_COSTS.discover + // one Discover search
  CREDIT_COSTS.enrich * 15 + // enrich a batch of ~15 surfaced contacts
  CREDIT_COSTS.draft; // draft one outreach email

/**
 * The single trial/beta credit floor. A new trial user (and every beta promo
 * code) is granted this many credits. MUST stay comfortably above
 * ACTIVATION_PATH_COST so a first-time user can finish onboarding → Discover →
 * draft → send with headroom for several Discover runs. Enforced by
 * credit-costs.test.ts. This is the ONE knob for the trial floor.
 */
export const TRIAL_CREDITS = 150;

/** One-time credit reward for completing the beta feedback form. Granted once
 * per user by /api/feedback on first submit; edits never re-grant. */
export const FEEDBACK_CREDITS = 100;

/** Credits granted by each source. Beta code is a one-time bundle (= the trial
 * floor); plans refill monthly to their allotment. Tune freely. */
export const CREDIT_ALLOTMENTS = {
  betaCode: TRIAL_CREDITS,
  monthly: 200,
  annual: 200,
} as const;
