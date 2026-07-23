import { z } from "zod";

export const ORGANIZATION_TYPES = [
  "company",
  "school",
  "club",
  "fund",
  "nonprofit",
  "program",
  "other",
] as const;

export const DOCUMENT_TYPES = [
  "resume",
  "linkedin",
  "essay",
  "cover_letter",
  "outreach",
  "meeting_brief",
  "custom",
] as const;

export const CRM_WORKSPACES = [
  "people",
  "companies",
  "applications",
  "documents",
  "research",
] as const;

const optionalPublicUrl = z.union([z.string().url(), z.literal("")]).default("");

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(1).max(240),
  type: z.enum(ORGANIZATION_TYPES).default("company"),
  domain: z.string().trim().max(240).default(""),
  website: optionalPublicUrl,
  logoUrl: optionalPublicUrl,
  location: z.string().trim().max(300).default(""),
  industry: z.string().trim().max(200).default(""),
  description: z.string().trim().max(20_000).default(""),
  status: z.enum(["active", "archived"]).default("active"),
  source: z.string().trim().max(120).default("manual"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const organizationPatchSchema = organizationCreateSchema.partial();

export const careerDocumentCreateSchema = z.object({
  type: z.enum(DOCUMENT_TYPES).default("custom"),
  title: z.string().trim().min(1).max(300),
  status: z.enum(["draft", "current", "archived"]).default("draft"),
  variantType: z.enum(["", "job", "internship", "club", "school", "general"]).default(""),
  content: z.record(z.string(), z.unknown()).default({}),
  evidence: z.array(z.unknown()).max(200).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  links: z
    .array(
      z.object({
        entityType: z.enum(["application", "person", "organization"]),
        entityId: z.string().trim().min(1).max(200),
        relation: z.string().trim().max(120).default("reference"),
      }),
    )
    .max(50)
    .default([]),
});

export const careerDocumentPatchSchema = careerDocumentCreateSchema.omit({ links: true }).partial();

export const savedViewSchema = z.object({
  workspace: z.enum(CRM_WORKSPACES),
  name: z.string().trim().min(1).max(120),
  isDefault: z.boolean().default(false),
  filters: z.record(z.string(), z.unknown()).default({}),
  sort: z.array(z.unknown()).max(20).default([]),
  columns: z.array(z.unknown()).max(80).default([]),
});

export const memoryCorrectionSchema = z.object({
  action: z.enum(["correct", "forget", "restore"]),
  content: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().trim().max(1000).default(""),
});

export function organizationNameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

