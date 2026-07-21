import { z } from "zod";

export const OPPORTUNITY_STATUSES = [
  "discovered",
  "saved",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "archived",
] as const;

export const OPPORTUNITY_PRIORITIES = ["low", "medium", "high"] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];

const optionalDate = z
  .union([z.string().datetime(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .default("");

const opportunityFields = {
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(300),
  location: z.string().trim().max(300),
  workMode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
  jobUrl: z.union([z.string().url(), z.literal("")]),
  applyUrl: z.union([z.string().url(), z.literal("")]),
  source: z.enum(["manual", "greenhouse", "lever", "ashby", "jsonld", "legacy_me"]),
  externalId: z.string().trim().max(500),
  description: z.string().max(50_000),
  status: z.enum(OPPORTUNITY_STATUSES),
  priority: z.enum(OPPORTUNITY_PRIORITIES),
  season: z.string().trim().max(120),
  notes: z.string().max(20_000),
  nextAction: z.string().trim().max(500),
  nextActionDue: optionalDate,
  appliedAt: optionalDate,
  deadline: optionalDate,
  fitScore: z.number().int().min(0).max(100),
  networkScore: z.number().int().min(0).max(100),
  matchReasons: z.array(z.string().max(500)).max(12),
  postedAt: optionalDate,
  sourceFreshAt: optionalDate,
  resumeId: z.union([z.string().trim().max(200), z.literal(""), z.null()]).optional().transform((value) => value || null),
};

export const opportunityCreateSchema = z.object({
  company: opportunityFields.company,
  role: opportunityFields.role,
  location: opportunityFields.location.default(""),
  workMode: opportunityFields.workMode.default("unknown"),
  jobUrl: optionalUrl,
  applyUrl: optionalUrl,
  source: opportunityFields.source.default("manual"),
  externalId: opportunityFields.externalId.default(""),
  description: opportunityFields.description.default(""),
  status: opportunityFields.status.default("saved"),
  priority: opportunityFields.priority.default("medium"),
  season: opportunityFields.season.default(""),
  notes: opportunityFields.notes.default(""),
  nextAction: opportunityFields.nextAction.default(""),
  nextActionDue: optionalDate,
  appliedAt: optionalDate,
  deadline: optionalDate,
  fitScore: opportunityFields.fitScore.default(0),
  networkScore: opportunityFields.networkScore.default(0),
  matchReasons: opportunityFields.matchReasons.default([]),
  postedAt: optionalDate,
  sourceFreshAt: optionalDate,
  resumeId: opportunityFields.resumeId,
});

// Keep patch fields default-free. Applying create defaults during PATCH would
// overwrite untouched application data (for example, reset status to `saved`).
export const opportunityPatchSchema = z.object(opportunityFields).partial();

export const opportunityEventSchema = z.object({
  type: z.enum(["note", "interview", "deadline", "follow_up", "milestone"]).default("note"),
  title: z.string().trim().min(1).max(240),
  detail: z.string().trim().max(10_000).default(""),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const opportunityContactSchema = z.object({
  contactId: z.string().trim().min(1).max(200),
});

export function opportunityCompanyKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isExternalOpportunityUrl(value: string | null | undefined) {
  return Boolean(value && (value.startsWith("https://") || value.startsWith("http://")));
}

export function escapePostgrestSearch(value: string) {
  return value.replace(/[,%()]/g, " ").trim().slice(0, 120);
}

export function statusLabel(status: OpportunityStatus | string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
