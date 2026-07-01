// Shared search/filter → Prisma where builder for MeContact. Pure + testable;
// reused by the contacts list (and network/prep next) so the filter semantics
// are identical everywhere. Text search spans name/firm/title/education so a
// school query like "UNC" matches.
import { Prisma } from "@/generated/prisma/client";

export interface ContactFilters {
  q?: string;
  industry?: string;
  relationshipType?: string;
  source?: string;
  inPipeline?: string; // "in" | "out"
  actions?: string; // "open"
}

export function parseFilters(sp: Record<string, string | undefined>): ContactFilters {
  return {
    q: sp.q?.trim() || undefined,
    industry: sp.industry || undefined,
    relationshipType: sp.relationshipType || undefined,
    source: sp.source || undefined,
    inPipeline: sp.inPipeline === "in" || sp.inPipeline === "out" ? sp.inPipeline : undefined,
    actions: sp.actions === "open" ? "open" : undefined,
  };
}

export function buildContactWhere(userId: string, f: ContactFilters): Prisma.MeContactWhereInput {
  const and: Prisma.MeContactWhereInput[] = [];
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { name: contains },
        { firmName: contains },
        { title: contains },
        { education: contains },
      ],
    });
  }
  if (f.industry) and.push({ industry: f.industry });
  if (f.source) and.push({ source: f.source });
  if (f.relationshipType) and.push({ memory: { is: { relationshipType: f.relationshipType } } });
  if (f.inPipeline === "in") and.push({ pipelineEntries: { some: { userId } } });
  if (f.inPipeline === "out") and.push({ pipelineEntries: { none: { userId } } });
  if (f.actions === "open") and.push({ memory: { is: { actionItems: { not: [] } } } });
  return { userId, AND: and };
}

export function buildContactSearchWhere(
  userId: string,
  q: string,
  excludePipelineId?: string,
): Prisma.MeContactWhereInput {
  const and: Prisma.MeContactWhereInput[] = [];
  const trimmed = q.trim();
  if (trimmed) {
    const contains = { contains: trimmed, mode: "insensitive" as const };
    and.push({
      OR: [
        { name: contains },
        { firmName: contains },
        { title: contains },
        { education: contains },
      ],
    });
  }
  if (excludePipelineId) {
    and.push({ pipelineEntries: { none: { userId, pipelineId: excludePipelineId } } });
  }
  return { userId, AND: and };
}
