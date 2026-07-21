import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLinkedInProfile } from "@/lib/linkedin-profile/audit";
import { normalizeLinkedInProfile } from "@/lib/linkedin-profile/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, revisionId } = await params;
  const revision = await prisma.linkedInProfileRevision.findFirst({ where: { id: revisionId, profileId: id, userId } });
  if (!revision) return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  const content = normalizeLinkedInProfile(revision.content);
  const audit = auditLinkedInProfile(content);
  const profile = await prisma.$transaction(async (tx) => {
    const latest = await tx.linkedInProfileRevision.aggregate({ where: { profileId: id }, _max: { version: true } });
    const updated = await tx.linkedInProfile.update({ where: { id }, data: {
      content: content as unknown as Prisma.InputJsonValue,
      audit: audit as unknown as Prisma.InputJsonValue,
      score: audit.score,
      source: "restored",
    } });
    await tx.linkedInProfileRevision.create({ data: {
      profileId: id,
      userId,
      version: (latest._max.version || 0) + 1,
      content: content as unknown as Prisma.InputJsonValue,
      audit: audit as unknown as Prisma.InputJsonValue,
      score: audit.score,
      changeSummary: `Restored version ${revision.version}`,
      source: "restore",
    } });
    return updated;
  });
  return NextResponse.json({ profile });
}
