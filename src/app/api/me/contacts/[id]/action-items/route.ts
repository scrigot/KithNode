import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { logContactActivity } from "@/lib/me/activity";

export const runtime = "nodejs";

function cleanItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id: contactId } = await params;
  const body = await req.json().catch(() => ({}));
  const done = typeof body.done === "string" ? body.done.trim() : "";
  if (!done) return NextResponse.json({ error: "done action item required" }, { status: 400 });

  const memory = await prisma.meContactMemory.findFirst({ where: { contactId, userId } });
  if (!memory) return NextResponse.json({ error: "Memory not found" }, { status: 404 });

  const target = done.toLowerCase();
  const next = cleanItems(memory.actionItems).filter((item) => item.toLowerCase() !== target);
  const updated = await prisma.meContactMemory.update({
    where: { contactId },
    data: { actionItems: next as Prisma.InputJsonValue },
  });

  await logContactActivity({
    userId,
    contactId,
    type: "touch",
    title: "Completed next step",
    detail: done,
    meta: { actionItem: done },
  });

  return NextResponse.json({ memory: updated });
}
