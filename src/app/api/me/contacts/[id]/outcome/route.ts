import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { logContactActivity } from "@/lib/me/activity";
import { appendMemoryNotes, mergeActionItems, outcomeDetail, sanitizeOutcomeInput } from "@/lib/me/outcome";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id: contactId } = await params;
  const body = await req.json().catch(() => ({}));
  const data = sanitizeOutcomeInput(body);
  if (!data.summary && !data.takeaways && data.nextSteps.length === 0) {
    return NextResponse.json({ error: "Outcome details required" }, { status: 400 });
  }

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: {
      memory: true,
      pipelineEntries: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const now = new Date();
  const detail = outcomeDetail(data);
  const activity = await logContactActivity({
    userId,
    contactId,
    type: "coffee_chat",
    title: "Coffee chat outcome",
    detail,
    occurredAt: now,
    meta: { stage: data.stage, nextSteps: data.nextSteps },
  });

  const existingItems = contact.memory?.actionItems;
  const memory = await prisma.meContactMemory.upsert({
    where: { contactId },
    create: {
      userId,
      contactId,
      notes: appendMemoryNotes("", data),
      actionItems: mergeActionItems([], data.nextSteps) as Prisma.InputJsonValue,
    },
    update: {
      notes: appendMemoryNotes(contact.memory?.notes || "", data),
      actionItems: mergeActionItems(existingItems, data.nextSteps) as Prisma.InputJsonValue,
    },
  });

  await prisma.meContact.update({
    where: { id: contactId },
    data: { lastSpokenAt: now },
  });

  const entry = contact.pipelineEntries[0]
    ? await prisma.mePipelineEntry.update({
        where: { id: contact.pipelineEntries[0].id },
        data: { stage: data.stage, lastTouchAt: now },
      })
    : null;

  return NextResponse.json({ activity, memory, entry });
}
