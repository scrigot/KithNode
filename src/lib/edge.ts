// The Edge — network gap analysis.
//
// Pure, deterministic engine (no AI, no network, no supabase) that answers:
// "what do the people already in my target track commonly have that I don't?"
// across skills, clubs, and experience. The route layer (src/app/api/edge)
// fetches the user's own imported contacts + prefs and feeds this; the math
// lives here so it is unit-testable in isolation.
//
// Honesty is the hard requirement (see THE-EDGE-SPEC.md): a trait is only a
// "gap" when enough of a big-enough cohort share it. Below the thresholds we
// surface nothing rather than fabricate confidence off 1-2 data points.

import skillsPool from "@/lib/data/us-skills.json";
import clubsPool from "@/lib/data/college-clubs.json";
import { classifyCareer } from "@/lib/classify-career";
import { parseClubMemberships } from "@/lib/club-memberships";
import { parseExperiences } from "@/lib/educations";

/** Cohort must have at least this many people before we compute any gap. */
export const EDGE_MIN_COHORT = 5;
/** A trait needs at least this many holders to count — the real honesty gate, so
 * a "gap" is never drawn from 1-2 people. */
export const EDGE_MIN_HOLDERS = 3;
/** A loose long-tail cut only. Real networking data is long-tail (clubs/skills
 * spread thin), so a "majority" test surfaces nothing; we instead RANK by how
 * many of your network hold each trait and show the honest fraction. This floor
 * just drops the extreme tail (a trait held by a tiny sliver of a big cohort). */
export const EDGE_MIN_SUPPORT = 0.1;
/** Cap per dimension so a long tail can't flood the list. */
export const EDGE_MAX_PER_DIMENSION = 8;

export type EdgeDimension = "skills" | "clubs" | "experiences";
export const EDGE_DIMENSIONS: EdgeDimension[] = ["skills", "clubs", "experiences"];
export const EDGE_DIMENSION_LABELS: Record<EdgeDimension, string> = {
  skills: "Skills",
  clubs: "Clubs",
  experiences: "Experience",
};

// ── Canonicalization ─────────────────────────────────────────────────────────
// Both the user's profile and contacts were mapped to these SAME vendored pools
// at input time (resume extraction + the pooled selectors), so canonicalization
// is just case-folding to the pool's display casing — NOT fuzzy merging, which
// could dishonestly collapse distinct traits. Unknown tokens keep their own
// wording and still must clear the thresholds on their own.
//
// Known limitation (deferred — see THE-EDGE-SPEC.md open questions): the pools
// ship school-suffixed variants of the same real club ("180 Degrees Consulting"
// vs "...UNC-Chapel Hill"), and case-folding won't merge them. So a fragmented
// club can split below the holder floor and HIDE a real gap. This only ever
// hides gaps, never fabricates one — the honest, conservative failure direction.
// A curated synonym map is the fix when this proves to matter in practice.
function poolMap(arr: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of arr) {
    const key = s.trim().toLowerCase();
    if (key && !m.has(key)) m.set(key, s.trim());
  }
  return m;
}
const SKILLS_CANON = poolMap(skillsPool as string[]);
const CLUBS_CANON = poolMap(clubsPool as string[]);

const canonSkill = (raw: string): string => {
  const t = raw.trim();
  return t ? SKILLS_CANON.get(t.toLowerCase()) ?? t : "";
};
const canonClub = (raw: string): string => {
  const t = raw.trim();
  return t ? CLUBS_CANON.get(t.toLowerCase()) ?? t : "";
};

/** Case-insensitive, order-preserving dedupe. */
function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const t = (v || "").trim();
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Tolerant skills parse: the column is a JSON array string on User and may be
 * either a JSON array or a comma list on contacts. Handles both. */
export function parseSkillsField(val: string | null | undefined): string[] {
  if (!val) return [];
  const s = val.trim();
  if (s.startsWith("[")) {
    try {
      const p: unknown = JSON.parse(s);
      if (Array.isArray(p)) return p.map(String);
    } catch {
      /* fall through to comma parse */
    }
  }
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

/** Tolerant clubs parse from the flat `clubs` column (comma names) — only used
 * as a fallback when structured clubMemberships is empty. */
function parseClubsFlat(val: string | null | undefined): string[] {
  if (!val) return [];
  return val.split(",").map((x) => x.trim()).filter(Boolean);
}

/** Raw stored fields for one person (user or contact). */
export interface EdgeRawProfile {
  skills?: string | null;
  clubMemberships?: string | null;
  clubs?: string | null;
  experiences?: string | null;
}

/**
 * Derive canonical trait sets for one person.
 *
 * `excludeExperienceRoles` drops experience roles equal to the viewer's OWN
 * target role(s) — otherwise the experiences dimension would trivially report
 * "people targeting IB have IB experience." Excluding at ROLE (not track)
 * granularity is deliberate: an IB-targeting student should still see that their
 * IB-network commonly also did Private Equity / Sales & Trading / Hedge Fund
 * stints (genuine aspirational gaps in the SAME Finance track), so only the
 * bullseye role is suppressed, not the whole field.
 */
export function personTraits(
  raw: EdgeRawProfile,
  opts?: { excludeExperienceRoles?: string[] },
): Record<EdgeDimension, string[]> {
  const skills = uniq(parseSkillsField(raw.skills).map(canonSkill));

  const memberships = parseClubMemberships(raw.clubMemberships ?? "");
  const clubNames = memberships.length
    ? memberships.map((m) => m.club)
    : parseClubsFlat(raw.clubs);
  const clubs = uniq(clubNames.map(canonClub));

  const exclude = new Set((opts?.excludeExperienceRoles ?? []).map((r) => r.toLowerCase()));
  const experiences = uniq(
    parseExperiences(raw.experiences ?? "")
      .map((e) => classifyCareer({ title: e.title, firmName: e.firm }).role)
      .filter((role) => role && !exclude.has(role.toLowerCase())),
  );

  return { skills, clubs, experiences };
}

/** Map the user's free-text targets onto the career-track taxonomy. */
export function viewerTargetTracks(
  targetIndustries: string[],
  onboardingGoal?: string | null,
): string[] {
  const tracks = new Set<string>();
  for (const raw of [...targetIndustries, onboardingGoal ?? ""]) {
    const t = (raw || "").trim();
    if (!t) continue;
    const { track } = classifyCareer({ title: t });
    if (track) tracks.add(track);
  }
  return Array.from(tracks);
}

/** The user's bullseye role(s) — used to suppress only the trivial "you lack
 * your own target role's experience" gap, while still surfacing same-track but
 * off-bullseye experience the cohort holds. */
export function viewerTargetRoles(
  targetIndustries: string[],
  onboardingGoal?: string | null,
): string[] {
  const roles = new Set<string>();
  for (const raw of [...targetIndustries, onboardingGoal ?? ""]) {
    const t = (raw || "").trim();
    if (!t) continue;
    const { role } = classifyCareer({ title: t });
    if (role) roles.add(role);
  }
  return Array.from(roles);
}

export interface EdgePerson {
  id: string;
  name: string;
  traits: Record<EdgeDimension, string[]>;
}

export interface EdgeHolder {
  id: string;
  name: string;
}

export interface EdgeGap {
  dimension: EdgeDimension;
  /** Canonical trait display name (e.g. "Investment Club"). */
  trait: string;
  holderCount: number;
  /** Cohort members who have ANY data in this dimension — the honest
   * denominator. Most imported contacts have empty skills/clubs/experience, so
   * dividing by the WHOLE cohort would make every gap unreachable; we measure
   * prevalence only among contacts whose data we actually know. */
  eligibleCount: number;
  /** holderCount / eligibleCount, 0..1. */
  support: number;
  /** The cohort members who have this trait — your warm reasons to reach out. */
  holders: EdgeHolder[];
}

export interface EdgeMathResult {
  cohortSize: number;
  enoughCohort: boolean;
  /** Per dimension, how many cohort members have ANY data there (coverage). */
  dimensionEligible: Record<EdgeDimension, number>;
  gaps: EdgeGap[];
}

/**
 * Compute gaps: traits the cohort commonly has that the viewer lacks. Pure set
 * math. Returns nothing (enoughCohort=false) below EDGE_MIN_COHORT so a thin
 * network never produces fabricated gaps.
 */
export function computeEdge(args: {
  viewer: Record<EdgeDimension, string[]>;
  cohort: EdgePerson[];
  minCohort?: number;
  minHolders?: number;
  minSupport?: number;
}): EdgeMathResult {
  const minCohort = args.minCohort ?? EDGE_MIN_COHORT;
  const minHolders = args.minHolders ?? EDGE_MIN_HOLDERS;
  const minSupport = args.minSupport ?? EDGE_MIN_SUPPORT;

  const cohortSize = args.cohort.length;
  const emptyEligible: Record<EdgeDimension, number> = { skills: 0, clubs: 0, experiences: 0 };
  if (cohortSize < minCohort) {
    return { cohortSize, enoughCohort: false, dimensionEligible: emptyEligible, gaps: [] };
  }

  const gaps: EdgeGap[] = [];
  const dimensionEligible: Record<EdgeDimension, number> = { skills: 0, clubs: 0, experiences: 0 };

  for (const dim of EDGE_DIMENSIONS) {
    const viewerHas = new Set(args.viewer[dim].map((t) => t.toLowerCase()));
    // lowercased trait -> { display name, holders }
    const byTrait = new Map<string, { display: string; holders: EdgeHolder[] }>();
    // Honest denominator: only cohort members whose data in THIS dimension we
    // actually have. A blank profile is "unknown", never "doesn't have it".
    let eligibleCount = 0;

    for (const person of args.cohort) {
      if (person.traits[dim].length === 0) continue; // no data → not eligible
      eligibleCount++;
      const seen = new Set<string>();
      for (const trait of person.traits[dim]) {
        const key = trait.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        if (viewerHas.has(key)) continue; // viewer already has it — not a gap
        let entry = byTrait.get(key);
        if (!entry) {
          entry = { display: trait.trim(), holders: [] };
          byTrait.set(key, entry);
        }
        entry.holders.push({ id: person.id, name: person.name });
      }
    }

    dimensionEligible[dim] = eligibleCount;

    const dimGaps: EdgeGap[] = [];
    for (const { display, holders } of byTrait.values()) {
      const holderCount = holders.length;
      const support = eligibleCount > 0 ? holderCount / eligibleCount : 0;
      if (holderCount >= minHolders && support >= minSupport) {
        dimGaps.push({ dimension: dim, trait: display, holderCount, eligibleCount, support, holders });
      }
    }
    // Rank by prevalence (how many of your network hold it), then cap the tail.
    dimGaps.sort(
      (a, b) => b.holderCount - a.holderCount || a.trait.localeCompare(b.trait),
    );
    gaps.push(...dimGaps.slice(0, EDGE_MAX_PER_DIMENSION));
  }

  // Global order drives the default-selected gap (the single most prevalent);
  // the UI re-groups by dimension, so within-dimension order stays prevalence-desc.
  gaps.sort(
    (a, b) => b.holderCount - a.holderCount || a.trait.localeCompare(b.trait),
  );

  return { cohortSize, enoughCohort: true, dimensionEligible, gaps };
}
