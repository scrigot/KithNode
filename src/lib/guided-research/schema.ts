import { z } from "zod";

export const RESEARCH_SCALAR_FIELDS = [
  "name",
  "title",
  "firmName",
  "location",
  "education",
  "notes",
] as const;

export const RESEARCH_FIELDS = [...RESEARCH_SCALAR_FIELDS, "skills", "positions"] as const;

export const researchPositionSchema = z.object({
  title: z.string().trim().max(160).default(""),
  firm: z.string().trim().max(160).default(""),
  employmentType: z.string().trim().max(80).default(""),
  start: z.string().trim().max(40).default(""),
  end: z.string().trim().max(40).default("Present"),
});

export const normalizeResearchSkills = (skills: string[]): string[] => {
  const seen = new Set<string>();
  return skills
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
};

export const researchPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(180).default(""),
  firmName: z.string().trim().max(160).default(""),
  location: z.string().trim().max(160).default(""),
  education: z.string().trim().max(200).default(""),
  linkedInUrl: z.string().trim().max(500),
  notes: z.string().trim().max(2000).default(""),
  whyRelevant: z.string().trim().max(800).default(""),
  skills: z.array(z.string().trim().min(1).max(100)).max(100).default([]).transform(normalizeResearchSkills),
  positions: z.array(researchPositionSchema).max(8).default([]).transform((positions) => positions.filter((position) => position.title || position.firm)),
});

export const researchTargetSchema = z.object({
  company: z.string().trim().max(160).default(""),
  role: z.string().trim().max(160).default(""),
  location: z.string().trim().max(160).default(""),
  school: z.string().trim().max(200).default(""),
});

export const createResearchDraftSchema = z.object({
  sourceType: z.enum(["manual", "linkedin_manual", "company_page", "conversation"]).default("manual"),
  sourceUrl: z.string().trim().max(500).default(""),
  target: researchTargetSchema.default({ company: "", role: "", location: "", school: "" }),
  payload: researchPayloadSchema,
  selectedFields: z.array(z.enum(RESEARCH_FIELDS)).default([...RESEARCH_FIELDS]),
});

export type ResearchPayload = z.infer<typeof researchPayloadSchema>;
export type ResearchPosition = z.infer<typeof researchPositionSchema>;

export function mergePrimaryPosition(input: Pick<ResearchPayload, "title" | "firmName" | "positions">): ResearchPosition[] {
  const title = input.title.trim();
  const firm = input.firmName.trim();
  const key = `${title.toLocaleLowerCase()}|${firm.toLocaleLowerCase()}`;
  const matchingIndex = input.positions.findIndex((position) =>
    `${position.title.trim().toLocaleLowerCase()}|${position.firm.trim().toLocaleLowerCase()}` === key,
  );
  const primary = matchingIndex >= 0
    ? input.positions[matchingIndex]
    : { title, firm, employmentType: "", start: "", end: "Present" };
  const rest = input.positions.filter((_, index) => index !== matchingIndex);
  return (title || firm ? [primary, ...rest] : rest).slice(0, 8);
}
