// Shared deterministic text analyzers + resume lint.
//
// Single source of truth for bullet/quality heuristics so the SCORING rubric
// (grade-resume.ts) and the inline LINT (this file) can never drift — the eng
// review flagged duplicated metric/verb logic as a guaranteed-to-diverge risk.
// Pure + framework-free → unit-tested, reused everywhere.
import type { ResumeDoc, EntriesSection, EducationSection, SkillsSection } from "./resume-doc";

/** A bullet carries a quantified outcome: a digit AND a magnitude/impact token. */
export function hasMetric(text: string): boolean {
  return /\d/.test(text) && /[%$]|\b(x|×|users|hours|reduced|increased|saved|grew|cut|ms|requests|accuracy|k|m|bn|users|customers|revenue|downloads|stars)\b/i.test(text);
}

const WEAK_OPENERS = [
  "responsible for",
  "assisted with",
  "assisted in",
  "helped",
  "worked on",
  "duties included",
  "participated in",
  "involved in",
  "tasked with",
  "in charge of",
];

/** The weak opener phrase at the start of a bullet, or null. */
export function detectWeakOpener(text: string): string | null {
  const t = text.trim().toLowerCase();
  return WEAK_OPENERS.find((w) => t.startsWith(w)) ?? null;
}

/** First-person pronouns (resumes are written without them). */
export function hasPronoun(text: string): boolean {
  return /\b(i|i'm|my|me|we|our|us)\b/i.test(text);
}

/** Strong action verb that opens a bullet (used to reward / not flag). */
export function startsWithVerb(text: string): boolean {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return /(ed|t|d)$/.test(first) || STRONG_VERBS.has(first);
}
const STRONG_VERBS = new Set(["build", "lead", "ship", "drive", "own", "design", "launch", "scale", "automate", "reduce", "grow", "cut", "create", "deliver"]);

export type LintSeverity = "error" | "warn" | "info";
export interface LintWarning {
  sectionId: string;
  entryId?: string;
  field: string;
  severity: LintSeverity;
  message: string;
  scoreImpact: number; // negative points this issue is costing (0 = informational)
}

/**
 * Deterministic resume lint. Severity mapping (design review): error = export-blocking
 * structural problem, warn = score penalty, info = suggestion. scoreImpact mirrors
 * the kind of penalty the rubric applies, so the UI can show "missing metric −3".
 */
export function lintResume(doc: ResumeDoc): LintWarning[] {
  const out: LintWarning[] = [];

  if (!doc.header.name) {
    out.push({ sectionId: "header", field: "name", severity: "error", message: "Add your name — ATS parsers key on it", scoreImpact: -8 });
  }
  if (!doc.header.links.length) {
    out.push({ sectionId: "header", field: "links", severity: "warn", message: "Add a LinkedIn/GitHub/portfolio link", scoreImpact: -3 });
  }

  let totalBullets = 0;
  let quantified = 0;
  const verbCounts = new Map<string, number>();

  for (const s of doc.sections) {
    if (!s.visible) continue;

    if (s.kind === "entries") {
      const sec = s as EntriesSection;
      for (const e of sec.entries) {
        if ((s.type === "experience" || s.type === "education") && !e.start && !e.end) {
          out.push({ sectionId: s.id, entryId: e.id, field: "dates", severity: "warn", message: `"${e.title || "entry"}" is missing dates`, scoreImpact: -4 });
        }
        for (const b of e.bullets) {
          if (!b.trim()) continue;
          totalBullets += 1;
          if (hasMetric(b)) quantified += 1;
          else out.push({ sectionId: s.id, entryId: e.id, field: "bullet", severity: "warn", message: `Bullet lacks a measurable outcome: "${truncate(b)}"`, scoreImpact: -3 });
          const weak = detectWeakOpener(b);
          if (weak) out.push({ sectionId: s.id, entryId: e.id, field: "bullet", severity: "warn", message: `Weak opener "${weak}" — lead with an action verb`, scoreImpact: -2 });
          if (hasPronoun(b)) out.push({ sectionId: s.id, entryId: e.id, field: "bullet", severity: "warn", message: `Drop pronouns: "${truncate(b)}"`, scoreImpact: -2 });
          const verb = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
          if (verb) verbCounts.set(verb, (verbCounts.get(verb) ?? 0) + 1);
        }
      }
    }
  }

  for (const [verb, n] of verbCounts) {
    if (n >= 3 && verb.length > 2) {
      out.push({ sectionId: "global", field: "bullet", severity: "info", message: `"${verb}" opens ${n} bullets — vary your verbs`, scoreImpact: 0 });
    }
  }

  const hasSkills = doc.sections.some((s) => s.visible && s.kind === "skills" && (s as SkillsSection).groups.some((g) => g.items.length));
  if (!hasSkills) out.push({ sectionId: "global", field: "skills", severity: "warn", message: "Add a skills section", scoreImpact: -3 });

  const hasEdu = doc.sections.some((s) => s.visible && s.kind === "education" && (s as EducationSection).entries.some((e) => e.school));
  if (!hasEdu) out.push({ sectionId: "global", field: "education", severity: "info", message: "No education listed", scoreImpact: 0 });

  if (totalBullets && quantified / totalBullets < 0.5) {
    out.push({ sectionId: "global", field: "impact", severity: "warn", message: `Only ${quantified}/${totalBullets} bullets quantified — aim for 70%+`, scoreImpact: 0 });
  }

  // Rough one-page heuristic: bullets + entries + section overhead → estimated lines.
  if (estimateLines(doc) > 52) {
    out.push({ sectionId: "global", field: "length", severity: "warn", message: "Likely over one page — trim for early-career", scoreImpact: 0 });
  }

  return out;
}

function truncate(s: string, n = 48): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Very rough rendered-length estimate (lines), for the one-page heuristic. */
export function estimateLines(doc: ResumeDoc): number {
  let lines = 4; // header
  for (const s of doc.sections) {
    if (!s.visible) continue;
    lines += 2; // heading + spacing
    if (s.kind === "entries") lines += s.entries.reduce((n, e) => n + 1 + e.bullets.filter((b) => b.trim()).length, 0);
    else if (s.kind === "education") lines += s.entries.length * 2;
    else if (s.kind === "skills") lines += s.groups.length;
    else if (s.kind === "list") lines += s.items.length;
    else if (s.kind === "text") lines += Math.ceil((s.body.length || 0) / 90);
  }
  return lines;
}
