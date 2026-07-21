/**
 * AutoGuard kill-switch utilities (pure functions, no DB).
 *
 * This is the canonical status guard shared by Next.js UI and route logic.
 */

export type OutreachStatus = "drafted" | "sent" | "replied" | "bounced";

/**
 * Check whether automation is allowed for a contact based on outreach status.
 */
export function isAutomationAllowed(status: OutreachStatus): boolean {
  return status !== "replied";
}

/**
 * Check if a status indicates AutoGuard has been triggered.
 */
export function isAutoGuardActive(status: OutreachStatus): boolean {
  return status === "replied";
}
