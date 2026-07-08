import { Prisma } from "@/generated/prisma/client";

export const APPLICATION_STATUSES = [
  "interested",
  "applying",
  "applied",
  "assessment",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_PRIORITIES = ["low", "medium", "high"] as const;
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];

export interface ApplicationInput {
  company?: unknown;
  role?: unknown;
  location?: unknown;
  season?: unknown;
  jobUrl?: unknown;
  source?: unknown;
  deadline?: unknown;
  status?: unknown;
  priority?: unknown;
  resumeId?: unknown;
  jobDescription?: unknown;
  notes?: unknown;
  nextAction?: unknown;
  nextActionDue?: unknown;
  appliedAt?: unknown;
  archived?: unknown;
}

export interface ApplicationData {
  company: string;
  role: string;
  location: string;
  season: string;
  jobUrl: string;
  source: string;
  deadline: Date | null;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  resumeId: string | null;
  jobDescription: string;
  notes: string;
  nextAction: string;
  nextActionDue: Date | null;
  appliedAt: Date | null;
  archived: boolean;
}

export interface ApplicationFilters {
  q?: string;
  company?: string;
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
  resumeId?: string;
  deadline?: "upcoming" | "overdue" | "none";
  actions?: "open";
  sort?: "deadline_asc" | "deadline_desc" | "updated_desc" | "company_asc" | "status_asc";
  archived?: "1";
}

const TEXT_MAX = 4000;
const SHORT_MAX = 300;
const URL_MAX = 1000;

const clean = (value: unknown, max = SHORT_MAX) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const cleanField = (value: unknown, fallback: string | null | undefined, max = SHORT_MAX) =>
  value === undefined ? fallback || "" : clean(value, max);

export function parseOptionalDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sanitizeApplicationInput(input: ApplicationInput, fallback: Partial<ApplicationData> = {}): ApplicationData {
  const status = APPLICATION_STATUSES.includes(input.status as ApplicationStatus)
    ? (input.status as ApplicationStatus)
    : fallback.status || "interested";
  const priority = APPLICATION_PRIORITIES.includes(input.priority as ApplicationPriority)
    ? (input.priority as ApplicationPriority)
    : fallback.priority || "medium";

  return {
    company: cleanField(input.company, fallback.company, SHORT_MAX),
    role: cleanField(input.role, fallback.role, SHORT_MAX),
    location: cleanField(input.location, fallback.location, SHORT_MAX),
    season: cleanField(input.season, fallback.season, SHORT_MAX),
    jobUrl: cleanField(input.jobUrl, fallback.jobUrl, URL_MAX),
    source: cleanField(input.source, fallback.source, SHORT_MAX),
    deadline: input.deadline === undefined ? fallback.deadline ?? null : parseOptionalDate(input.deadline),
    status,
    priority,
    resumeId: input.resumeId === undefined ? fallback.resumeId || null : clean(input.resumeId, SHORT_MAX) || null,
    jobDescription: cleanField(input.jobDescription, fallback.jobDescription, TEXT_MAX),
    notes: cleanField(input.notes, fallback.notes, TEXT_MAX),
    nextAction: cleanField(input.nextAction, fallback.nextAction, SHORT_MAX),
    nextActionDue: input.nextActionDue === undefined ? fallback.nextActionDue ?? null : parseOptionalDate(input.nextActionDue),
    appliedAt: input.appliedAt === undefined ? fallback.appliedAt ?? null : parseOptionalDate(input.appliedAt),
    archived: typeof input.archived === "boolean" ? input.archived : fallback.archived || false,
  };
}

export function validateApplication(data: ApplicationData) {
  if (!data.company) return "Company required";
  if (!data.role) return "Role required";
  return null;
}

export function validateApplicationEnums(input: ApplicationInput) {
  if (input.status !== undefined && !APPLICATION_STATUSES.includes(input.status as ApplicationStatus)) {
    return "Invalid status";
  }
  if (input.priority !== undefined && !APPLICATION_PRIORITIES.includes(input.priority as ApplicationPriority)) {
    return "Invalid priority";
  }
  return null;
}

export function parseApplicationFilters(sp: Record<string, string | undefined>): ApplicationFilters {
  return {
    q: sp.q?.trim() || undefined,
    company: sp.company?.trim() || undefined,
    status: APPLICATION_STATUSES.includes(sp.status as ApplicationStatus) ? (sp.status as ApplicationStatus) : undefined,
    priority: APPLICATION_PRIORITIES.includes(sp.priority as ApplicationPriority) ? (sp.priority as ApplicationPriority) : undefined,
    resumeId: sp.resumeId?.trim() || undefined,
    deadline: sp.deadline === "upcoming" || sp.deadline === "overdue" || sp.deadline === "none" ? sp.deadline : undefined,
    actions: sp.actions === "open" ? "open" : undefined,
    sort:
      sp.sort === "deadline_asc" ||
      sp.sort === "deadline_desc" ||
      sp.sort === "updated_desc" ||
      sp.sort === "company_asc" ||
      sp.sort === "status_asc"
        ? sp.sort
        : undefined,
    archived: sp.archived === "1" ? "1" : undefined,
  };
}

export function buildApplicationWhere(userId: string, filters: ApplicationFilters, now = new Date()): Prisma.MeInternshipApplicationWhereInput {
  const and: Prisma.MeInternshipApplicationWhereInput[] = [];
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    and.push({ OR: [{ company: contains }, { role: contains }, { location: contains }, { season: contains }, { notes: contains }] });
  }
  if (filters.company) and.push({ company: { contains: filters.company, mode: "insensitive" } });
  if (filters.status) and.push({ status: filters.status });
  if (filters.priority) and.push({ priority: filters.priority });
  if (filters.resumeId) and.push({ resumeId: filters.resumeId });
  if (filters.actions === "open") and.push({ nextAction: { not: "" } });
  if (filters.deadline === "none") and.push({ deadline: null });
  if (filters.deadline === "overdue") and.push({ deadline: { lt: now } });
  if (filters.deadline === "upcoming") and.push({ deadline: { gte: now, lte: new Date(now.getTime() + 14 * 86_400_000) } });
  and.push({ archived: filters.archived === "1" });
  return { userId, AND: and };
}

export function buildApplicationOrderBy(filters: ApplicationFilters): Prisma.MeInternshipApplicationOrderByWithRelationInput[] {
  if (filters.sort === "deadline_desc") return [{ deadline: "desc" }, { updatedAt: "desc" }];
  if (filters.sort === "updated_desc") return [{ updatedAt: "desc" }];
  if (filters.sort === "company_asc") return [{ company: "asc" }, { role: "asc" }];
  if (filters.sort === "status_asc") return [{ status: "asc" }, { deadline: "asc" }];
  return [{ deadline: "asc" }, { updatedAt: "desc" }];
}

const COMPANY_STOPWORDS = new Set(["inc", "incorporated", "llc", "ltd", "co", "company", "corp", "corporation", "the"]);

export function normalizeCompany(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !COMPANY_STOPWORDS.has(token))
    .join(" ");
}

export function companyMatchesContact(company: string, contactFirm: string | null | undefined) {
  const a = normalizeCompany(company);
  const b = normalizeCompany(contactFirm || "");
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
