import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { logContactActivity } from "@/lib/me/activity";

export const runtime = "nodejs";

// Move an entry's stage and/or mark it touched (resets the going-cold timer).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const data: { stage?: string; lastTouchAt?: Date } = {};
  if (typeof body.stage === "string") data.stage = body.stage;
  if (body.touch === true) data.lastTouchAt = new Date();
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await prisma.mePipelineEntry.findFirst({
    where: { id, userId },
    include: { pipeline: { select: { name: true } }, contact: { select: { id: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entry = await prisma.mePipelineEntry.update({ where: { id }, data });
  if (data.stage && data.stage !== existing.stage) {
    await logContactActivity({
      userId,
      contactId: existing.contact.id,
      type: "stage_change",
      title: `Moved in ${existing.pipeline.name}`,
      detail: `${existing.stage.replaceAll("_", " ")} → ${data.stage.replaceAll("_", " ")}`,
      meta: { pipeline: existing.pipeline.name, from: existing.stage, to: data.stage },
    });
  }
  if (body.touch === true) {
    await logContactActivity({
      userId,
      contactId: existing.contact.id,
      type: "touch",
      title: `Touched in ${existing.pipeline.name}`,
      detail: data.stage && data.stage !== existing.stage ? `Also moved to ${data.stage.replaceAll("_", " ")}` : "",
      meta: { pipeline: existing.pipeline.name, stage: data.stage || existing.stage },
    });
  }
  return NextResponse.json({ ok: true, entry });
}

// Remove a contact from a pipeline.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const res = await prisma.mePipelineEntry.deleteMany({ where: { id, userId } });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
