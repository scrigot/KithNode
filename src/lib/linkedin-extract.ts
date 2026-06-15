// LinkedIn profile (page TEXT) → structured profile extraction.
//
// The capture extension grabs the rendered text of a LinkedIn profile and posts
// it here; an Anthropic model (via the AI Gateway) pulls the owner's structured
// data out of it. Reading TEXT instead of scraping CSS selectors is what makes
// this robust to LinkedIn's constant DOM churn. Mirrors resume-extract.ts: the
// pure pieces (schema, prompt) live here so they unit-test without next-auth.

import { z } from "zod";
import clubs from "@/lib/data/college-clubs.json";
import majors from "@/lib/data/us-majors.json";
import skills from "@/lib/data/us-skills.json";
import { ALL_DEGREES } from "@/lib/data/preference-options";

/** Generous cap on the page text we feed the model (a profile is a few KB). */
export const MAX_PROFILE_TEXT = 60_000;

export const linkedinProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  company: z.string(),
  location: z.string(),
  skills: z.array(z.string()).max(25),
  experiences: z
    .array(
      z.object({
        title: z.string(),
        firm: z.string(),
        start: z.string(),
        end: z.string(),
      }),
    )
    .max(10),
  educations: z
    .array(z.object({ school: z.string(), degree: z.string(), major: z.string() }))
    .max(6),
  clubs: z.array(z.string()).max(10),
  mutuals: z.array(z.object({ name: z.string(), slug: z.string().optional() })).optional().default([]),
  highSchool: z.string().optional().default(""),
  graduationYear: z.number().optional(),
  notes: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});

export type LinkedInExtract = z.infer<typeof linkedinProfileSchema>;

export type ProfileTextValidation =
  | { ok: true; text: string }
  | { ok: false; error: string };

/** Validate + trim the captured page text. */
export function validateProfileText(text: unknown): ProfileTextValidation {
  if (typeof text !== "string" || text.trim().length < 40) {
    return { ok: false, error: "Profile text is missing or too short" };
  }
  return { ok: true, text: text.slice(0, MAX_PROFILE_TEXT) };
}

/**
 * Build the extraction prompt. The canonical pools are embedded so the model
 * maps wording to your exact club/skill/major names when confident (keeps The
 * Edge's trait matching consistent), and it is told emphatically to extract ONLY
 * the profile owner — LinkedIn pages are full of OTHER people (sidebar
 * suggestions, "People also viewed") that must never bleed into the contact.
 */
export function buildLinkedInPrompt(pageText: string): string {
  return `You are extracting ONE person's profile from the raw text of their LinkedIn profile page, to fill a networking CRM contact.

CRITICAL: extract ONLY the person whose profile this is — the main person at the top of the page. IGNORE everyone else on the page: "People also viewed", "More profiles for you", suggested connections, "People you may know", message previews, and any other names in sidebars or lists. If you are unsure whether something belongs to the profile owner, leave it out.

Map to the closest canonical name from the lists below when you are confident; otherwise use the page's own wording. Use "" or [] when an attribute is not present.

Return:
- name: the profile owner's full name.
- headline: their headline / current title line (the text under their name).
- company: their CURRENT employer.
- location: "City, ST" or the stated location.
- skills: up to 25 of their skills (the "Skills" and "Top skills" sections), mapped to the SKILLS list when confident.
- experiences: up to 10 work experiences, each { title, firm, start, end }. start/end are short like "Jun 2025"; set end to "Present" if current.
- educations: up to 6, each { school, degree, major }. Map degree to one of: ${ALL_DEGREES.join(", ")}. Map major to the MAJORS list when confident.
- clubs: up to 10 clubs / student orgs / volunteering / organizations, mapped to the CLUBS list when confident.
- mutuals: the mutual connections between the VIEWER and the profile owner. LinkedIn surfaces these as blocks like "Khalil Rahman, Maria Lopez, and 9 other mutual connections" or "You and <owner> both know …". Return each NAMED person as { name }. Include slug ONLY if a literal /in/<slug> URL is visible for that person; otherwise omit slug entirely. A trailing "N other" count with no visible names must NOT produce entries. Never invent names. These are people the viewer and the profile owner both know — look for "mutual connections" text on the page.
- highSchool: their high school if shown.
- graduationYear: the year they graduate/graduated — read from the education entry's date-range END year or a "Class of 20XX" line. Return a number only (e.g. 2027); omit if unknown.
- notes: a 1-2 sentence plain-text summary for OUTREACH context, drawn from their About / headline / current role — not a list, just useful personal context to warm up a message.
- tags: up to 5 short career labels for this person (e.g. "Investment Banking", "AI", "Recruiter").

CLASSIFICATION RULE: student organizations, Greek fraternities/sororities, clubs, and volunteering ALWAYS go under clubs (each entry with the person's role if shown), NOT under experiences. experiences is for real jobs / internships ONLY — never put a club, fraternity, sorority, student org, or volunteering role in experiences.

SKILLS: ${(skills as string[]).join(", ")}

CLUBS: ${(clubs as string[]).join(", ")}

MAJORS: ${(majors as string[]).join(", ")}

LinkedIn profile page text:
"""
${pageText}
"""

Return JSON matching the schema exactly.`;
}
