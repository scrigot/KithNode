import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mergePrimaryPosition, RESEARCH_FIELDS, RESEARCH_SCALAR_FIELDS, researchPayloadSchema } from "@/lib/guided-research/schema";
import { normalizeLinkedInProfileUrl } from "@/lib/guided-research/source-policy";
import { firmsFromExperiences } from "@/lib/educations";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

const commitSchema = z.object({
  selectedFields: z.array(z.enum(RESEARCH_FIELDS)).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const selection = commitSchema.safeParse(await request.json().catch(() => ({})));
  if (!selection.success) return NextResponse.json({ error: "Select at least one field" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const draft = await tx.researchDraft.findFirst({ where: { id, userId } });
      if (!draft) throw new Error("draft_not_found");
      if (draft.status === "committed" && draft.contactId) {
        return { contactId: draft.contactId, overlay: false, idempotent: true };
      }
      if (draft.status === "discarded") throw new Error("draft_discarded");

      const payload = researchPayloadSchema.parse(draft.payload);
      const linkedInUrl = normalizeLinkedInProfileUrl(payload.linkedInUrl);
      if (!linkedInUrl) throw new Error("invalid_linkedin_url");
      const slug = linkedInUrl.split("/in/")[1];
      const existing = await tx.alumniContact.findFirst({
        where: { linkedInUrl: { contains: `/in/${slug}`, mode: "insensitive" } },
      });
      const selected = new Set(selection.data.selectedFields);
      const positions = mergePrimaryPosition(payload);
      const updates: Record<string, string> = Object.fromEntries(
        RESEARCH_SCALAR_FIELDS.filter((field) => selected.has(field)).map((field) => [field, payload[field]]),
      );
      if (selected.has("skills")) updates.skills = payload.skills.join(", ");
      if (selected.has("positions")) {
        updates.experiences = JSON.stringify(positions);
        updates.pastFirms = firmsFromExperiences(positions).join(", ");
      }

      let contactId: string;
      let overlay = false;
      if (!existing) {
        const contact = await tx.alumniContact.create({
          data: {
            name: payload.name,
            title: payload.title,
            firmName: payload.firmName,
            linkedInUrl,
            university: payload.education,
            education: payload.education,
            location: payload.location,
            notes: payload.notes,
            skills: selected.has("skills") ? payload.skills.join(", ") : "",
            experiences: selected.has("positions") ? JSON.stringify(positions) : "[]",
            pastFirms: selected.has("positions") ? firmsFromExperiences(positions).join(", ") : "",
            graduationYear: 0,
            source: "guided_research",
            importedByUserId: userId,
          },
        });
        contactId = contact.id;
      } else if (!existing.importedByUserId || existing.importedByUserId === userId) {
        const ownerUpdates = { ...updates } as Record<string, string>;
        if (selected.has("education")) ownerUpdates.university = payload.education;
        await tx.alumniContact.update({ where: { id: existing.id }, data: ownerUpdates });
        contactId = existing.id;
      } else {
        overlay = true;
        contactId = existing.id;
        const link = await tx.userDiscover.findFirst({ where: { userId, contactId } });
        if (link) await tx.userDiscover.update({ where: { id: link.id }, data: { rating: "high_value" } });
        else await tx.userDiscover.create({ data: { userId, contactId, rating: "high_value" } });
        const prior = await tx.contactOverride.findUnique({ where: { userId_contactId: { userId, contactId } } });
        await tx.contactOverride.upsert({
          where: { userId_contactId: { userId, contactId } },
          create: { userId, contactId, overrides: updates as Prisma.InputJsonValue },
          update: { overrides: { ...((prior?.overrides as Record<string, unknown>) ?? {}), ...updates } as Prisma.InputJsonValue },
        });
      }

      await tx.contactFieldProvenance.createMany({
        data: selection.data.selectedFields.map((field) => ({
          userId,
          contactId,
          field: field === "positions" ? "experiences" : field,
          source: draft.sourceType,
          value: field === "positions" ? positions : payload[field],
          confidence: 1,
          verified: true,
        })),
      });
      await tx.auditLog.create({
        data: { userId, contactId, action: "guided_research_commit", detail: JSON.stringify({ draftId: id, fields: selection.data.selectedFields }) },
      });
      await tx.researchDraft.update({
        where: { id },
        data: { status: "committed", contactId, selectedFields: selection.data.selectedFields, committedAt: new Date() },
      });
      return { contactId, overlay, idempotent: false };
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "commit_failed";
    const status = code === "draft_not_found" ? 404 : code.startsWith("draft_") || code.startsWith("invalid_") ? 400 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
