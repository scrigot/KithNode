// Pure profile-completeness scoring. No React, no I/O — fully unit-testable.
// Drives the meter on the settings page.
//
// Model: three categories (Identity / Targets / Depth) matching the onboarding
// mental model. Each category is weighted; within a category every atom counts
// equally. Overall is capped at 95% so the meter never reads "done" (always one
// more thing to add). Weights live here as constants so they're easy to rebalance.
//
// The atoms intentionally cover only fields the user can edit on the settings
// page, so a diligent user can actually reach the cap there (graduationYear /
// concentration live in onboarding, not the edit panel — excluded on purpose).

const filledStr = (s: string | null | undefined): boolean => !!s && s.trim().length > 0;
const filledArr = (a: unknown[] | null | undefined): boolean => Array.isArray(a) && a.length > 0;

/** Minimal structural shape both the settings `Preferences` (via an adapter) and
 *  the server `UserPrefs` satisfy. */
export interface CompletenessInput {
  university: string;
  highSchool: string;
  hometown: string;
  greekOrg: string;
  educations: unknown[];
  targetIndustries: string[];
  targetFirms: string[];
  targetLocations: string[];
  recruitingDate: string | null;
  skills: string[];
  minor: string;
  experiences: unknown[];
  clubMemberships: unknown[];
}

interface Atom {
  label: string;
  filled: (p: CompletenessInput) => boolean;
}

interface CategoryDef {
  key: string;
  label: string;
  weight: number;
  atoms: Atom[];
}

// Identity matters most for warmth, Targets drives discovery, Depth adds texture.
export const COMPLETENESS_CATEGORIES: CategoryDef[] = [
  {
    key: "identity",
    label: "Identity",
    weight: 0.4,
    atoms: [
      { label: "school", filled: (p) => filledStr(p.university) },
      { label: "high school", filled: (p) => filledStr(p.highSchool) },
      { label: "hometown", filled: (p) => filledStr(p.hometown) },
      { label: "Greek org", filled: (p) => filledStr(p.greekOrg) },
      { label: "education history", filled: (p) => filledArr(p.educations) },
    ],
  },
  {
    key: "targets",
    label: "Targets",
    weight: 0.35,
    atoms: [
      { label: "target industries", filled: (p) => filledArr(p.targetIndustries) },
      { label: "target firms", filled: (p) => filledArr(p.targetFirms) },
      { label: "target locations", filled: (p) => filledArr(p.targetLocations) },
      { label: "recruiting date", filled: (p) => filledStr(p.recruitingDate) },
    ],
  },
  {
    key: "depth",
    label: "Depth",
    weight: 0.25,
    atoms: [
      { label: "skills", filled: (p) => filledArr(p.skills) },
      { label: "minor", filled: (p) => filledStr(p.minor) },
      { label: "work experience", filled: (p) => filledArr(p.experiences) },
      { label: "clubs & activities", filled: (p) => filledArr(p.clubMemberships) },
    ],
  },
];

/** Never let the meter hit 100% — keep it motivational. */
export const COMPLETENESS_CAP = 95;

export interface CategoryScore {
  key: string;
  label: string;
  filled: number;
  total: number;
  percent: number; // 0-100 within the category
}

export interface CompletenessResult {
  percent: number; // 0-COMPLETENESS_CAP overall
  categories: CategoryScore[];
  missing: string[]; // labels of unfilled atoms, in display order
}

export function calculateProfileCompleteness(prefs: CompletenessInput): CompletenessResult {
  const categories: CategoryScore[] = [];
  const missing: string[] = [];
  let weighted = 0;

  for (const cat of COMPLETENESS_CATEGORIES) {
    let filled = 0;
    for (const atom of cat.atoms) {
      if (atom.filled(prefs)) filled += 1;
      else missing.push(atom.label);
    }
    const total = cat.atoms.length;
    const ratio = total === 0 ? 0 : filled / total;
    weighted += cat.weight * ratio;
    categories.push({
      key: cat.key,
      label: cat.label,
      filled,
      total,
      percent: Math.round(ratio * 100),
    });
  }

  return {
    percent: Math.round(weighted * COMPLETENESS_CAP),
    categories,
    missing,
  };
}
