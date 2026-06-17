// Structured club memberships.
//
// The UI edits structured `{club, role}` rows; the flat `clubs` column (club
// NAMES only, comma-joined) is DERIVED on save and stays the Same Club
// matcher's input. The role text never goes into flat clubs — embedding it
// ("President — IB Club") would break Same Club containment when two people
// hold different roles in the same club. Instead roles reach the Club
// Leadership matcher through a separate derived string (rolesFromMemberships).
//
// Stored JSON-stringified in a TEXT column, the same pattern educations uses.

export interface ClubEntry {
  club: string;
  /** Optional leadership/position title, e.g. "President". */
  role: string;
}

export const MAX_CLUBS = 6;

const clean = (v: unknown, capLen: number): string =>
  typeof v === "string" ? v.trim().slice(0, capLen) : "";

const dedupe = (list: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

/** Tolerant parse of a JSON-stringified ClubEntry[] column. Rows with no club
 * name are dropped (a bare role is meaningless); never throws. */
export function parseClubMemberships(val: string | null | undefined): ClubEntry[] {
  if (!val) return [];
  try {
    const parsed: unknown = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e: Record<string, unknown>) => ({
        club: clean(e?.club, 120),
        role: clean(e?.role, 40),
      }))
      .filter((e) => e.club)
      .slice(0, MAX_CLUBS);
  } catch {
    return [];
  }
}

/** Derive the flat, matcher-facing `clubs` column: club NAMES only. */
export function clubsFlatFromMemberships(rows: ClubEntry[]): string {
  return dedupe(rows.map((r) => r.club.trim()).filter(Boolean)).join(", ");
}

/** Roles only, space-joined — feeds the Club Leadership matcher's blob. */
export function rolesFromMemberships(rows: ClubEntry[]): string {
  return rows.map((r) => r.role.trim()).filter(Boolean).join(" ");
}

/** Synthesize rows from a legacy flat `clubs` string. Each comma token may be
 * "Role — Club" / "Role - Club" (the format enrichment writes) or a bare club
 * name. The em-dash and hyphen-with-spaces split the role from the club; a bare
 * token becomes a roleless club. Lets old profiles render rows + keep firing
 * Club Leadership before they are re-saved. */
export function membershipsFromFlat(clubsStr: string | null | undefined): ClubEntry[] {
  if (!clubsStr) return [];
  const out: ClubEntry[] = [];
  for (const token of clubsStr.split(",")) {
    const t = token.trim();
    if (!t) continue;
    const m = t.split(/\s+[—-]\s+/);
    if (m.length >= 2 && m[0].trim() && m[1].trim()) {
      out.push({ role: m[0].trim().slice(0, 40), club: m.slice(1).join(" - ").trim().slice(0, 120) });
    } else {
      out.push({ club: t.slice(0, 120), role: "" });
    }
    if (out.length >= MAX_CLUBS) break;
  }
  return out;
}
