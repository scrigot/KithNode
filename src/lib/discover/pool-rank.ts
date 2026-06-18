// Per-category read-time affinity bonus for the Discover deck.
//
// The deck is ordered by the persisted warmthScore, but warmthScore is a
// single per-contact number that can't know WHICH pool the contact is being
// shown in or WHO is looking. poolRankBonus layers a small, category-aware
// affinity bonus on top — computed from the contact row + the requesting
// user's prefs — so within each pool the most relevant contacts surface first
// without re-scoring or nuking warmthScore.
//
// Magnitudes mirror ranker.ts's ALUMNI_BOOST / STUDENT_PENALTY scale (single
// digits): a strong stack of affinities re-orders within the pool but a
// genuinely high-warmth contact still wins. All inputs are null-safe — DeckRow
// fields arrive typed `unknown` via an index signature, so each is coerced
// through a typeof guard before use.

import type { DiscoverCategory } from "./source-categories";
import type { UserPrefs } from "../user-prefs";

// Per-signal bonus magnitudes. Tunable, kept on ranker.ts's single-digit scale
// so the bonus re-orders within a pool rather than swamping warmthScore.
const SHARED_GREEK = 6;
const SAME_COLLEGE = 5;
const TARGET_FIRM = 6;
const TARGET_INDUSTRY = 4;
const SAME_HOMETOWN = 3;
// Professor-specific.
const SAME_SCHOOL = 8; // teaches at the user's university — the dominant signal
const FIELD_MATCH = 5; // teaching area matches a target industry
const FULL_PROFESSOR = 3; // full professor outranks lecturer / adjunct
const LECTURER = 1;

/** The contact-row fields poolRankBonus reads. Every field is optional + typed
 *  `unknown`: the deck rows arrive from a service-role select("*") with an index
 *  signature, so values are coerced through typeof guards below. */
interface RankableContact {
  greekOrg?: unknown;
  university?: unknown;
  firmName?: unknown;
  industry?: unknown;
  title?: unknown;
  hometown?: unknown;
  [key: string]: unknown;
}

/** Coerce an index-signature `unknown` to a trimmed lowercase string. */
function str(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/** True when both sides are non-empty and equal after normalization. */
function eq(a: unknown, b: string): boolean {
  const av = str(a);
  return av !== "" && av === b.trim().toLowerCase();
}

/** True when the contact field contains, or is contained by, any non-empty
 *  pref value (substring match, like detectAffiliations' firm/industry tests). */
function matchesAny(field: unknown, prefList: string[]): boolean {
  const f = str(field);
  if (!f) return false;
  return prefList.some((p) => {
    const pv = p.trim().toLowerCase();
    return pv !== "" && (f.includes(pv) || pv.includes(f));
  });
}

/**
 * Category-aware affinity bonus added to warmthScore at read time. Deterministic
 * and null-safe. Returns 0 when no signals fire.
 *
 *  - alumni:    sharedGreek + sameCollege + targetFirm + targetIndustry dominate.
 *  - student:   ALL signals count (broad) — adds sameHometown on top of alumni's.
 *  - professor: sameSchool (teaches at the user's university) + field-to-target
 *               + title seniority (full professor > lecturer).
 */
export function poolRankBonus(
  contact: RankableContact,
  prefs: UserPrefs,
  category: DiscoverCategory,
): number {
  if (category === "professor") {
    let bonus = 0;
    // Teaches at the user's school: exact match on firm/university, or a
    // substring of the firm name — but only when the school name is long enough
    // (>=5 chars) that a substring match isn't a false positive. Short tokens
    // ("UNC", "NYU", "Tech") would otherwise award the dominant +8 to professors
    // at unrelated institutions.
    const uni = prefs.university.trim().toLowerCase();
    if (
      uni &&
      (eq(contact.firmName, prefs.university) ||
        eq(contact.university, prefs.university) ||
        (uni.length >= 5 && str(contact.firmName).includes(uni)))
    ) {
      bonus += SAME_SCHOOL;
    }
    // Teaching area maps to one of the user's target industries.
    if (
      matchesAny(contact.industry, prefs.targetIndustries) ||
      matchesAny(contact.title, prefs.targetIndustries)
    ) {
      bonus += FIELD_MATCH;
    }
    // Title seniority: a full professor outranks a lecturer / adjunct.
    const title = str(contact.title);
    if (/\bprofessor\b/.test(title) && !/\b(assistant|associate|adjunct)\b/.test(title)) {
      bonus += FULL_PROFESSOR;
    } else if (/\b(lecturer|instructor|adjunct)\b/.test(title)) {
      bonus += LECTURER;
    }
    return bonus;
  }

  // alumni + student share the four core affinity signals.
  let bonus = 0;
  if (prefs.greekOrg && eq(contact.greekOrg, prefs.greekOrg)) bonus += SHARED_GREEK;
  if (prefs.university && eq(contact.university, prefs.university)) bonus += SAME_COLLEGE;
  if (matchesAny(contact.firmName, prefs.targetFirms)) bonus += TARGET_FIRM;
  if (matchesAny(contact.industry, prefs.targetIndustries)) bonus += TARGET_INDUSTRY;

  // Student pool is broad — every affinity counts, including hometown.
  if (category === "student") {
    if (prefs.hometown && eq(contact.hometown, prefs.hometown)) bonus += SAME_HOMETOWN;
  }

  return bonus;
}
