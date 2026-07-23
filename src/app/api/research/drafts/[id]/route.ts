import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.researchDraft.updateMany({
    where: { id, userId, status: { in: ["draft", "ready"] } },
    data: { status: "discarded" },
  });
  if (!result.count) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({ discarded: true });
}
