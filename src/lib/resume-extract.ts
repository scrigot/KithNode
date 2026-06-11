// Resume (PDF) → structured profile extraction. The PDF is parsed by an
// Anthropic model through the AI Gateway and NEVER stored anywhere.
//
// This module holds the pure, framework-free pieces (input validation, the
// zod output schema, and the canonical-pool prompt builder) so they can be
// unit-tested without importing next-auth. The route handler
// (src/app/api/profile/resume/route.ts) wires these into auth + the gateway.

import { z } from "zod";
import greekOrgs from "@/lib/data/greek-orgs.json";
import clubs from "@/lib/data/college-clubs.json";
import majors from "@/lib/data/us-majors.json";
import minors from "@/lib/data/unc-minors.json";
import concentrations from "@/lib/data/unc-concentrations.json";
import skills from "@/lib/data/us-skills.json";
import { INDUSTRY_OPTIONS, ALL_DEGREES } from "@/lib/data/preference-options";

// Flattened, deduped list of every named concentration across all majors —
// the closed pool the resume extractor maps a stated concentration against.
const CONCENTRATION_NAMES = [
  ...new Set(Object.values(concentrations as Record<string, string[]>).flat()),
];

/** Hard cap on the decoded PDF size. Resumes are 1-2 pages; 4MB is generous. */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

/** Structured profile we ask the model to extract from a resume. */
export const resumeSchema = z.object({
  university: z.string(),
  highSchool: z.string(),
  hometown: z.string(),
  greekOrg: z.string(),
  clubs: z.array(z.string()).max(3),
  skills: z.array(z.string()).max(10),
  majors: z.array(z.string()).max(2),
  minors: z.array(z.string()).max(2),
  degrees: z.array(z.string()).max(3),
  concentration: z.string(),
  targetIndustries: z.array(z.string()).max(4),
  pastFirms: z.array(z.string()).max(5),
});

export type ResumeExtract = z.infer<typeof resumeSchema>;

export type ResumeValidation =
  | { ok: true; bytes: Buffer }
  | { ok: false; error: string };

/**
 * Decode + validate a base64 PDF payload. Pure (no next-auth, no network) so
 * the route's input guards can be tested in isolation. Rejects when:
 *   - the payload is missing / not a string
 *   - the decoded bytes exceed MAX_RESUME_BYTES
 *   - the decoded bytes don't start with the %PDF magic header
 */
export function validateResumePdf(pdf: unknown): ResumeValidation {
  if (typeof pdf !== "string" || pdf.length === 0) {
    return { ok: false, error: "pdf is required" };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(pdf, "base64");
  } catch {
    return { ok: false, error: "Invalid base64" };
  }

  if (bytes.length === 0) {
    return { ok: false, error: "Invalid base64" };
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    return { ok: false, error: "PDF too large (max 4MB)" };
  }
  // %PDF magic bytes: 0x25 0x50 0x44 0x46
  if (
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    return { ok: false, error: "Not a PDF" };
  }

  return { ok: true, bytes };
}

/**
 * Build the extraction prompt, embedding the canonical pools so the model maps
 * resume wording to exact canonical names when confident. The pools are large,
 * so they're joined into compact comma lists rather than one-per-line.
 */
export function buildResumePrompt(): string {
  return `You are extracting a student's profile from their resume PDF to autofill an onboarding form. Extract the CANDIDATE'S OWN attributes only — never a reference, employer, or someone else mentioned in the resume.

For each field, map to the closest canonical name from the provided lists when you are confident it matches; otherwise return the resume's own wording. Use an empty string or empty array when the attribute is not present in the resume.

Return:
- university: the candidate's current/most-recent university (full name).
- highSchool: the candidate's high school name, if listed.
- hometown: the candidate's hometown as "City, ST" if derivable.
- greekOrg: the candidate's fraternity/sorority, mapped to the GREEK ORGS list when confident.
- clubs: up to 3 clubs/student orgs the candidate belongs to, mapped to the CLUBS list when confident.
- skills: up to 10 of the candidate's skills, mapped to the SKILLS list when confident.
- majors: up to 2 of the candidate's majors, mapped to the MAJORS list when confident.
- minors: up to 2 of the candidate's minors, mapped to the MINORS list when confident.
- degrees: up to 3 degree designations the candidate holds or is pursuing, mapped to this exact list: ${ALL_DEGREES.join(", ")}.
- concentration: the candidate's formal concentration/area of emphasis within the major if stated, mapped to the CONCENTRATIONS list when confident; otherwise "".
- targetIndustries: up to 4 industries the candidate targets/works in, chosen from the INDUSTRIES list.
- pastFirms: up to 5 employers from the candidate's work experience section (company names only).

INDUSTRIES: ${INDUSTRY_OPTIONS.join(", ")}

GREEK ORGS: ${(greekOrgs as string[]).join(", ")}

CLUBS: ${(clubs as string[]).join(", ")}

MAJORS: ${(majors as string[]).join(", ")}

MINORS: ${(minors as string[]).join(", ")}

CONCENTRATIONS: ${CONCENTRATION_NAMES.join(", ")}

SKILLS: ${(skills as string[]).join(", ")}

Return the result as JSON matching the schema exactly.`;
}
