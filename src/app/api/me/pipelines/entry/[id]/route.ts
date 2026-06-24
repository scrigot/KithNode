import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

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

  // updateMany with the userId guard so you can only touch your own rows.
  const res = await prisma.mePipelineEntry.updateMany({ where: { id, userId }, data });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
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
