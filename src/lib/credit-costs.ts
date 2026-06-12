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

/** Credits granted by each source. Beta code is a one-time bundle; plans refill
 * monthly to their allotment. Tune freely. */
export const CREDIT_ALLOTMENTS = {
  betaCode: 50,
  monthly: 200,
  annual: 200,
} as const;
