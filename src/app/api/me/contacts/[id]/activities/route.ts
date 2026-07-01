import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { sanitizeActivityInput } from "@/lib/me/activity";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const contact = await prisma.meContact.findFirst({ where: { id, userId }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await prisma.meContactActivity.findMany({
    where: { userId, contactId: id },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const contact = await prisma.meContact.findFirst({ where: { id, userId }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data = sanitizeActivityInput(body);
  const activity = await prisma.meContactActivity.create({
    data: {
      userId,
      contactId: id,
      type: data.type,
      title: data.title,
      detail: data.detail,
      occurredAt: data.occurredAt,
      meta: data.meta,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
