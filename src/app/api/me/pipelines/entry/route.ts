import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { FIRST_STAGE } from "@/lib/me/pipelines";
import { logContactActivity } from "@/lib/me/activity";

export const runtime = "nodejs";

// Add a contact to a pipeline (idempotent on userId+contactId+pipelineId).
export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();

  const { pipelineId, contactId, stage } = await req.json().catch(() => ({}));
  if (!pipelineId || !contactId) {
    return NextResponse.json({ error: "pipelineId and contactId required" }, { status: 400 });
  }
  // Verify both belong to this user (the entry's FK + scoping guard).
  const [pipeline, contact] = await Promise.all([
    prisma.mePipeline.findFirst({ where: { id: pipelineId, userId } }),
    prisma.meContact.findFirst({ where: { id: contactId, userId } }),
  ]);
  if (!pipeline || !contact) {
    return NextResponse.json({ error: "Pipeline or contact not found" }, { status: 404 });
  }

  const existingEntry = await prisma.mePipelineEntry.findUnique({
    where: { userId_contactId_pipelineId: { userId, contactId, pipelineId } },
    select: { id: true },
  });
  const entry = await prisma.mePipelineEntry.upsert({
    where: { userId_contactId_pipelineId: { userId, contactId, pipelineId } },
    create: { userId, contactId, pipelineId, stage: stage || FIRST_STAGE, lastTouchAt: new Date() },
    update: {}, // already present → no-op
  });
  if (!existingEntry) {
    await logContactActivity({
      userId,
      contactId,
      type: "stage_change",
      title: `Added to ${pipeline.name}`,
      detail: `Stage: ${(stage || FIRST_STAGE).replaceAll("_", " ")}`,
      meta: { pipeline: pipeline.name, stage: stage || FIRST_STAGE },
    });
  }
  return NextResponse.json({ entry });
}
