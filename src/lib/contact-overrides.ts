// Per-user contact overrides — the read side of the Profile/Relationship split.
//
// The Discover pool keeps ONE canonical AlumniContact row per person. A user who
// adds a pool contact to their network can personalize it via a private overlay
// (contact_override table) WITHOUT mutating the shared row. This module merges a
// viewer's overlay over the canonical row for display; the write side lives in
// PATCH /api/contacts/[id] (stores validated fields into contact_override).

// Personal / relationship columns. A non-owner's overlay value for these is
// PRIVATE to them, so it must never fall back to the canonical owner's value —
// applyOverlay resets them to a neutral default before merging the viewer's
// overlay. Profile columns (everything else) fall through to canonical when the
// overlay omits them. Keys are AlumniContact column names (camelCase).
export const PERSONAL_OVERRIDE_FIELDS = [
  "notes",
  "hometown",
  "highSchool",
  "passions",
  "isFriend",
  "speakFrequency",
  "lastSpokenAt",
] as const;

const PERSONAL_DEFAULTS: Record<string, unknown> = {
  notes: "",
  hometown: "",
  highSchool: "",
  passions: "",
  isFriend: false,
  speakFrequency: "",
  lastSpokenAt: null,
};

/**
 * Layer a non-owner viewer's private overlay over the canonical contact row.
 *
 * - Personal columns are first reset to a neutral default, so the canonical
 *   owner's private relationship data can never leak to the viewer; the viewer's
 *   OWN overlay values (if any) are then applied on top.
 * - Profile columns fall through to the canonical value unless the overlay sets
 *   them (the viewer corrected e.g. a stale title).
 *
 * Owners never call this — they read/write the canonical row directly. With an
 * empty overlay this yields the canonical row with personal columns blanked,
 * which is exactly the safe projection for a pure-browse (non-network) viewer.
 */
export function applyOverlay(
  canonical: Record<string, unknown>,
  overrides: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...canonical };
  for (const field of PERSONAL_OVERRIDE_FIELDS) {
    base[field] = PERSONAL_DEFAULTS[field];
  }
  return { ...base, ...(overrides ?? {}) };
}
