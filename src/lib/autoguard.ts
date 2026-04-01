/**
 * AutoGuard kill-switch utilities (pure functions, no DB).
 *
 * The actual state machine lives in the FastAPI backend.
 * These helpers are for frontend display logic.
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
