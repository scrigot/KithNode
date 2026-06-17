// Classify an org name (a LinkedIn "experience" firm) as a real employer vs a
// student club/org vs a Greek chapter. LinkedIn often lists fraternity and club
// roles under "Experience"; this lets the ingest move those into clubMemberships
// (with the role) instead of treating them as jobs.
//
// Conservative by design: it matches against the canonical pools we already
// ship (college-clubs.json + greek-orgs.json) plus a Greek fraternity/sorority
// keyword. The extraction prompt is the PRIMARY mechanism (it's told to put orgs
// under `clubs`); this is the safety net for ones that slip through as jobs, so
// it must not false-positive on real companies.

import clubs from "@/lib/data/college-clubs.json";
import greekOrgs from "@/lib/data/greek-orgs.json";

export type OrgKind = "company" | "club" | "greek";

const norm = (s: string): string =>
  (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const clubSet = new Set((clubs as string[]).map(norm));
const greekSet = new Set((greekOrgs as string[]).map(norm));

/**
 * Classify a firm/org name. Returns the kind plus the trimmed display name.
 * A blank or unrecognized name is treated as a company (the safe default).
 */
export function classifyOrg(firm: string): { kind: OrgKind; name: string } {
  const display = (firm || "").trim();
  const n = norm(display);
  if (!n) return { kind: "company", name: "" };
  if (greekSet.has(n)) return { kind: "greek", name: display };
  // A "fraternity"/"sorority" keyword is an unambiguous Greek signal and wins
  // over a club-pool match (some pools list Greek orgs as clubs). Deliberately
  // narrow so it can't fire on a real employer.
  if (/\b(fraternity|sorority)\b/i.test(display)) return { kind: "greek", name: display };
  if (clubSet.has(n)) return { kind: "club", name: display };
  return { kind: "company", name: display };
}

/** True when the firm is a student org or Greek chapter, not a real employer. */
export function isClubOrg(firm: string): boolean {
  return classifyOrg(firm).kind !== "company";
}
