// Closed-set normalization for the contact/user `degrees` column.
//
// Both the user-preferences POST and the contact PATCH accept a free-form
// comma-joined degrees string (e.g. "bs, mba, finance club"). This helper
// keeps ONLY tokens that match a canonical degree in ALL_DEGREES
// (case-insensitive), rewrites each to its canonical casing, dedupes, and
// re-joins ", ". Invalid tokens are silently dropped — the same forgiving
// behavior clubs/skills use, never a 400.
//
// Lives in its own module (not preference-options.ts, which is data-only) so
// the two routes share one implementation and one test.

import { ALL_DEGREES } from "@/lib/data/preference-options";

const CANONICAL_BY_LOWER = new Map(ALL_DEGREES.map((d) => [d.toLowerCase(), d]));

export function normalizeDegrees(input: string): string {
  if (typeof input !== "string" || !input) return "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of input.split(",")) {
    const canonical = CANONICAL_BY_LOWER.get(token.trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out.join(", ");
}
