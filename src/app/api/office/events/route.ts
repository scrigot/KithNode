// /api/office/events — last 20 events for the authenticated user, desc.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const LIMIT = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const events = await prisma.agentEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include: { room: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      roomId: e.roomId,
      roomName: e.room.name,
      roomSlug: e.room.slug,
      kind: e.kind,
      summary: e.summary,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
