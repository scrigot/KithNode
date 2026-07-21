import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const source = await prisma.linkedInProfile.findFirst({ where: { id, userId } });
  if (!source) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const profile = await prisma.$transaction(async (tx) => {
    const created = await tx.linkedInProfile.create({ data: {
      userId,
      name: `${source.name} copy`.slice(0, 200),
      linkedInUrl: source.linkedInUrl,
      source: "duplicate",
      status: "draft",
      content: source.content as Prisma.InputJsonValue,
      audit: source.audit as Prisma.InputJsonValue,
      score: source.score,
      docVersion: source.docVersion,
    } });
    await tx.linkedInProfileRevision.create({ data: {
      profileId: created.id,
      userId,
      version: 1,
      content: source.content as Prisma.InputJsonValue,
      audit: source.audit as Prisma.InputJsonValue,
      score: source.score,
      changeSummary: `Duplicated from ${source.name}`,
      source: "create",
    } });
    return created;
  });
  return NextResponse.json({ profile }, { status: 201 });
}
