// Person-type classifier for Discover pools (Alumni | Professor | Student).
//
// Discover sorts contacts into three pools by what they ARE, not where they
// were imported from. Most imported LinkedIn contacts (~98%) carry no
// graduationYear / personType, so we infer personType from the fields we DO
// have — current title + firm (+ education when present) — through the AI
// Gateway, mirroring src/lib/professors/classifier.ts. graduationYear is
// best-effort: only returned when clearly stated, never guessed.
//
// The backfill (scripts/backfill/classify-person-type.ts) persists the result
// onto AlumniContact.personType; the import path classifies new contacts the
// same way. A heuristic fallback keeps a gateway outage from crashing the run.

import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";

export type PersonType = "student" | "alum" | "professor";

export interface PersonInput {
  name: string;
  title: string;
  firmName: string;
  education?: string;
  graduationYear?: number;
}

export interface PersonTypeResult {
  personType: PersonType;
  graduationYear: number | null;
  confidence: number;
}

const Schema = z.object({
  personType: z.enum(["student", "alum", "professor"]),
  graduationYear: z.number().int().min(1950).max(2035).nullable(),
  confidence: z.number().min(0).max(1),
});

const SYSTEM_PROMPT = `You classify a person's relationship to college, for a student networking app, into exactly one of:
- "student": currently enrolled undergraduate or graduate student. Signals: internships ("Intern", "Summer Analyst", "Co-op"), campus jobs, fraternity/sorority officer roles, student-club or student-government leadership, research assistant while enrolled, no full-time post-graduation role.
- "alum": has graduated and works a real full-time professional role (e.g. Analyst / Associate / VP / Manager at a company). Interns are NOT alumni.
- "professor": faculty, lecturer, instructor, adjunct, or teaching/research staff employed BY a university.

Decide from the current title and firm/org. A title that is clearly an internship or a campus / Greek / student-club role => student. A clear full-time professional role at a company => alumni. When genuinely ambiguous between student and alumni, prefer "student" (this app's contacts skew current-undergrad).

Only classify as "professor" when the TITLE is a faculty/teaching title (Professor, Lecturer, Instructor, Adjunct, Dean, Provost) or the person clearly teaches/researches at a university. A generic "Officer", "Director", "Coordinator", "Manager", or "Analyst" at a non-university organization is NEVER a professor — it is alumni (or student if it reads as an internship / campus role). A "Research Analyst" or "Equity Research Analyst" at a student-run investment fund or club is a student, not alumni.

graduationYear: return a year ONLY if clearly stated or strongly implied (e.g. education says "Class of 2026"); otherwise return null. Never guess.
confidence: 0-1 reflecting your certainty.`;

function buildPrompt(p: PersonInput): string {
  return [
    `Name: ${p.name || "(unknown)"}`,
    `Current title: ${p.title || "(unknown)"}`,
    `Current firm/org: ${p.firmName || "(unknown)"}`,
    p.education ? `Education: ${p.education}` : "",
    p.graduationYear ? `Stated graduation year: ${p.graduationYear}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const UNIVERSITY_RE = /\b(university|college|school of|institute of technology)\b/i;
const PROFESSOR_RE = /\b(professor|lecturer|faculty|instructor|adjunct|dean|provost)\b/i;
const STUDENT_RE = /\b(intern|internship|co-?op|summer analyst|fellow|student|undergrad|class of|chair|chairman|chairwoman|president|treasurer|secretary|rush|recruitment|pledge)\b/i;

/** Offline fallback used only when the gateway call fails — never crash a batch
 * of thousands over one outage. Cheap title/firm heuristics; conservative. */
export function heuristicPersonType(p: PersonInput): PersonTypeResult {
  const t = (p.title || "").toLowerCase();
  const f = (p.firmName || "").toLowerCase();
  if (PROFESSOR_RE.test(t) || (UNIVERSITY_RE.test(f) && PROFESSOR_RE.test(`${t} ${f}`))) {
    return { personType: "professor", graduationYear: p.graduationYear || null, confidence: 0.3 };
  }
  if (STUDENT_RE.test(t)) {
    return { personType: "student", graduationYear: p.graduationYear || null, confidence: 0.3 };
  }
  // Unknown full-time-ish role: this app skews current students, but a bare
  // professional title with no internship marker is more likely alumni.
  return { personType: "alum", graduationYear: p.graduationYear || null, confidence: 0.2 };
}

export async function classifyPersonType(p: PersonInput): Promise<PersonTypeResult> {
  try {
    const { object } = await generateObject({
      model: gateway("anthropic/claude-haiku-4.5"),
      schema: Schema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(p),
    });
    return {
      personType: object.personType,
      graduationYear: object.graduationYear ?? (p.graduationYear || null),
      confidence: object.confidence,
    };
  } catch (err) {
    console.error(`[classify-person-type] gateway failed for "${p.name}":`, err);
    return heuristicPersonType(p);
  }
}

export async function classifyPersonTypeBatch(
  people: PersonInput[],
  opts?: { concurrency?: number },
): Promise<PersonTypeResult[]> {
  const concurrency = opts?.concurrency ?? 5;
  const results: PersonTypeResult[] = new Array(people.length);
  for (let i = 0; i < people.length; i += concurrency) {
    const chunk = people.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((p) => classifyPersonType(p)));
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }
  return results;
}
