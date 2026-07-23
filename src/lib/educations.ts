// Structured education + experience entries.
//
// The UI edits these structured rows; the flat columns (major, degrees,
// concentration, pastFirms) are DERIVED from them on every save and stay the
// only inputs to the warmth matchers (Same Major / Same Program / Shared
// Employer) — scoring never has to understand rows. Stored JSON-stringified in
// TEXT columns, the same pattern clubs/skills/pastFirms use.

import { GRAD_DEGREES } from "@/lib/data/preference-options";
import { normalizeDegrees } from "@/lib/normalize-degrees";

export interface EducationEntry {
  /** Major/program name. "" allowed for degree-only rows (e.g. a lone MBA). */
  major: string;
  /** Canonical degree designation from ALL_DEGREES, or "". */
  degree: string;
  /** Area of emphasis within THIS major, or "". */
  concentration: string;
}

export interface ExperienceEntry {
  title: string;
  firm: string;
  /** Employment arrangement when the source states it (e.g. Full-time). */
  employmentType?: string;
  /** Period start, free text e.g. "Jun 2025". */
  start: string;
  /** Period end, free text e.g. "Aug 2025", or "Present" when ongoing. */
  end: string;
}

export const MAX_EDUCATIONS = 6;
export const MAX_EXPERIENCES = 8;

const GRAD_SET = new Set(GRAD_DEGREES.map((d) => d.toUpperCase()));

const clean = (v: unknown, cap: number): string =>
  typeof v === "string" ? v.trim().slice(0, cap) : "";

const splitList = (s: string): string[] =>
  s.split(",").map((t) => t.trim()).filter(Boolean);

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

/** Tolerant parse of a JSON-stringified EducationEntry[] column. Invalid JSON,
 * non-arrays, and all-empty rows are dropped; degree tokens are canonicalized
 * (unknown → ""). Never throws. */
export function parseEducations(val: string | null | undefined): EducationEntry[] {
  if (!val) return [];
  try {
    const parsed: unknown = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e: Record<string, unknown>) => ({
        major: clean(e?.major, 160),
        degree: normalizeDegrees(clean(e?.degree, 40)),
        concentration: clean(e?.concentration, 160),
      }))
      .filter((e) => e.major || e.degree || e.concentration)
      .slice(0, MAX_EDUCATIONS);
  } catch {
    return [];
  }
}

/** Tolerant parse of a JSON-stringified ExperienceEntry[] column. Rows with
 * neither title nor firm are dropped. Never throws. */
export function parseExperiences(val: string | null | undefined): ExperienceEntry[] {
  if (!val) return [];
  try {
    const parsed: unknown = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e: Record<string, unknown>) => {
        const employmentType = clean(e?.employmentType, 80);
        return {
          title: clean(e?.title, 160),
          firm: clean(e?.firm, 160),
          ...(employmentType ? { employmentType } : {}),
          // Legacy rows stored a single `dates` string — fold it into `start` so
          // existing experiences keep rendering after the start/end split.
          start: clean(e?.start, 40) || clean(e?.dates, 40),
          end: clean(e?.end, 40),
        };
      })
      .filter((e) => e.title || e.firm)
      .slice(0, MAX_EXPERIENCES);
  } catch {
    return [];
  }
}

/** Keep the canonical headline role in the structured timeline. Older guided
 * research drafts stored only additional positions, so this also repairs those
 * contacts at read time without rewriting their reviewed source data. */
export function mergePrimaryExperience(
  rows: ExperienceEntry[],
  primary: { title?: string | null; firm?: string | null },
): ExperienceEntry[] {
  const title = clean(primary.title, 160);
  const firm = clean(primary.firm, 160);
  if (!title && !firm) return rows.slice(0, MAX_EXPERIENCES);

  const key = `${title.toLocaleLowerCase()}|${firm.toLocaleLowerCase()}`;
  const matchingIndex = rows.findIndex((row) =>
    `${row.title.trim().toLocaleLowerCase()}|${row.firm.trim().toLocaleLowerCase()}` === key,
  );
  const headline = matchingIndex >= 0
    ? rows[matchingIndex]
    : { title, firm, start: "", end: "Present" };
  const rest = rows.filter((_, index) => index !== matchingIndex);
  return [headline, ...rest].slice(0, MAX_EXPERIENCES);
}

/** Render an experience period for display: "Jun 2025 - Aug 2025", or a single
 * endpoint when only one is set ("Present"), or "" when neither. */
export function formatExperiencePeriod(e: { start: string; end: string }): string {
  const s = (e.start || "").trim();
  const en = (e.end || "").trim();
  if (s && en) return `${s} - ${en}`;
  return s || en;
}

/** Synthesize rows from the legacy flat columns (profiles saved before rows
 * existed). Pairing is only safe with exactly ONE major: it gets the first
 * undergrad degree + the flat concentration. Everything unpairable becomes its
 * own degree-only / concentration-only row, so the round trip back to flat
 * strings is lossless. */
export function educationsFromFlat(
  major: string | null | undefined,
  degrees: string | null | undefined,
  concentration: string | null | undefined,
): EducationEntry[] {
  const majors = dedupe(splitList(major ?? ""));
  let degs = splitList(normalizeDegrees(degrees ?? ""));
  let concs = dedupe(splitList(concentration ?? ""));

  const rows: EducationEntry[] = majors.map((m) => ({
    major: m,
    degree: "",
    concentration: "",
  }));
  if (rows.length === 1) {
    const firstUndergrad = degs.find((d) => !GRAD_SET.has(d.toUpperCase()));
    if (firstUndergrad) {
      rows[0].degree = firstUndergrad;
      degs = degs.filter((d) => d !== firstUndergrad);
    }
    if (concs.length) {
      rows[0].concentration = concs.join(", ");
      concs = [];
    }
  }
  for (const d of degs) rows.push({ major: "", degree: d, concentration: "" });
  for (const c of concs) rows.push({ major: "", degree: "", concentration: c });
  return rows.slice(0, MAX_EDUCATIONS);
}

/** Derive the flat matcher-facing columns from rows. */
export function flatFromEducations(rows: EducationEntry[]): {
  major: string;
  degrees: string;
  concentration: string;
} {
  return {
    major: dedupe(rows.map((r) => r.major.trim()).filter(Boolean)).join(", "),
    degrees: normalizeDegrees(
      rows.map((r) => r.degree).filter(Boolean).join(", "),
    ),
    concentration: dedupe(rows.flatMap((r) => splitList(r.concentration))).join(
      ", ",
    ),
  };
}

/** Unique experience firm names, order-preserving — the derived pastFirms list
 * that keeps the Shared Employer matcher fed. */
export function firmsFromExperiences(rows: ExperienceEntry[]): string[] {
  return dedupe(rows.map((r) => r.firm.trim()).filter(Boolean));
}
