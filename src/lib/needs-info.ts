// "Needs info" vs genuine "Cold".
//
// A contact can be cold for two very different reasons: (a) we have no data on
// them yet — a bare LinkedIn CSV stub with just name/company/title — or (b) we
// DO have their school/clubs/etc. and it simply doesn't overlap the user. Only
// (b) is honestly "Cold". Case (a) is "Needs info": the UI renders it as a
// neutral, fixable state instead of a red/low score, so importing a few hundred
// bare connections doesn't read as a wall of failures.

const PERSONAL_FIELDS = [
  "education",
  "clubs",
  "clubMemberships",
  "greekOrg",
  "hometown",
  "highSchool",
  "major",
  "minor",
  "concentration",
  "degrees",
  "skills",
  "experiences",
  "passions",
] as const;

/**
 * True when the contact carries ANY enrichable personal/affiliation data. The
 * structured columns (experiences, clubMemberships) are JSON strings, so an
 * empty array serializes to "[]" — treated as no data.
 */
export function hasPersonalData(contact: Record<string, unknown>): boolean {
  return PERSONAL_FIELDS.some((f) => {
    const v = contact[f];
    if (typeof v !== "string") return false;
    const t = v.trim();
    return t !== "" && t !== "[]";
  });
}

/**
 * A contact "needs info" when it is cold ONLY because we have nothing on them:
 * its DISPLAYED tier is cold AND it has no enrichable personal data. Pass the
 * already-resolved display tier (after any KITH promotion) so a data-sparse
 * friend/kith never reads as "needs info".
 */
export function contactNeedsInfo(
  contact: Record<string, unknown>,
  displayedTier: string,
): boolean {
  return displayedTier === "cold" && !hasPersonalData(contact);
}
