import type { Session } from "next-auth";

/**
 * Founder gate. Identity is the email everywhere in this app (see auth.ts:
 * token.userId = token.email). There is no role/isAdmin field, so the founder
 * cockpit at /dashboard/ops is gated by comparing the session email to
 * FOUNDER_EMAIL. Default to Sam's email so the gate works without env config.
 *
 * Not a secret — FOUNDER_EMAIL is just an allow-list of one. The real security
 * boundary is the server route + API gate, not the sidebar link.
 */
export const FOUNDER_EMAIL = (
  process.env.FOUNDER_EMAIL || "samrigot31@gmail.com"
).toLowerCase();

export function isFounder(session: Session | null | undefined): boolean {
  const email = session?.user?.email?.toLowerCase();
  return !!email && email === FOUNDER_EMAIL;
}
