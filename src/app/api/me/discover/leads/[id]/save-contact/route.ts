import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { FIRST_STAGE } from "@/lib/me/pipelines";
import { logContactActivity } from "@/lib/me/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const pipelineId = typeof body.pipelineId === "string" && body.pipelineId.trim() ? body.pipelineId.trim() : "";

  const lead = await prisma.meDiscoveryLead.findFirst({ where: { id, userId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let pipeline = null;
  if (pipelineId) {
    pipeline = await prisma.mePipeline.findFirst({ where: { id: pipelineId, userId } });
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const contactData = {
    userId,
    name: lead.name,
    firmName: lead.firmName,
    title: lead.title,
    linkedInUrl: lead.linkedInUrl,
    email: lead.email,
    location: lead.location,
    education: lead.education,
    industry: lead.industry,
    notes: lead.notes,
    source: "discover_lead",
  };

  const contact = lead.linkedInUrl
    ? await prisma.meContact.upsert({
        where: { userId_linkedInUrl: { userId, linkedInUrl: lead.linkedInUrl } },
        create: contactData,
        update: {
          name: lead.name,
          firmName: lead.firmName,
          title: lead.title,
          email: lead.email,
          location: lead.location,
          education: lead.education,
          industry: lead.industry,
          notes: lead.notes,
        },
      })
    : await prisma.meContact.create({ data: contactData });

  await prisma.meContactMemory.upsert({
    where: { contactId: contact.id },
    create: {
      userId,
      contactId: contact.id,
      relationshipType: "practitioner",
      strategicValue: lead.reasons instanceof Array ? lead.reasons.join(", ") : "",
      notes: lead.notes,
    },
    update: {},
  });

  await logContactActivity({
    userId,
    contactId: contact.id,
    type: "note",
    title: "Saved from Discover",
    detail: lead.sourceQuery ? `Source query: ${lead.sourceQuery}` : lead.notes,
    meta: { leadId: lead.id, sourceUrl: lead.sourceUrl || lead.linkedInUrl || "" },
  });

  let entry = null;
  if (pipeline) {
    entry = await prisma.mePipelineEntry.upsert({
      where: { userId_contactId_pipelineId: { userId, contactId: contact.id, pipelineId: pipeline.id } },
      create: { userId, contactId: contact.id, pipelineId: pipeline.id, stage: FIRST_STAGE, lastTouchAt: new Date() },
      update: {},
    });
    await logContactActivity({
      userId,
      contactId: contact.id,
      type: "stage_change",
      title: `Added to ${pipeline.name}`,
      detail: `Stage: ${FIRST_STAGE.replaceAll("_", " ")}`,
      meta: { pipeline: pipeline.name, stage: FIRST_STAGE },
    });
  }

  const savedLead = await prisma.meDiscoveryLead.update({
    where: { id: lead.id },
    data: { status: "saved", savedContactId: contact.id },
    include: { savedContact: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ lead: savedLead, contact, entry });
}
