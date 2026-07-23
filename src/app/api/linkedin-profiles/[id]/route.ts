import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLinkedInProfile } from "@/lib/linkedin-profile/audit";
import { normalizeLinkedInProfile, updateLinkedInProfileSchema } from "@/lib/linkedin-profile/schema";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const profile = await prisma.linkedInProfile.findFirst({
    where: { id, userId },
    include: { revisions: { orderBy: { version: "desc" }, take: 50 } },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = updateLinkedInProfileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile", issues: parsed.error.issues }, { status: 400 });
  const existing = await prisma.linkedInProfile.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const content = parsed.data.content === undefined
      ? normalizeLinkedInProfile(existing.content)
      : normalizeLinkedInProfile(parsed.data.content);
    const audit = auditLinkedInProfile(content);
    const profile = await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await tx.linkedInProfile.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
      }
      const latest = await tx.linkedInProfileRevision.aggregate({ where: { profileId: id }, _max: { version: true } });
      const updated = await tx.linkedInProfile.update({
        where: { id },
        data: {
          name: parsed.data.name,
          linkedInUrl: parsed.data.linkedInUrl,
          status: parsed.data.status,
          isPrimary: parsed.data.status === "archived" ? false : parsed.data.isPrimary,
          content: content as unknown as Prisma.InputJsonValue,
          audit: audit as unknown as Prisma.InputJsonValue,
          score: audit.score,
        },
      });
      await tx.linkedInProfileRevision.create({
        data: {
          profileId: id,
          userId,
          version: (latest._max.version || 0) + 1,
          content: content as unknown as Prisma.InputJsonValue,
          audit: audit as unknown as Prisma.InputJsonValue,
          score: audit.score,
          changeSummary: parsed.data.changeSummary || "Edited profile",
          source: "save",
        },
      });
      if (updated.status === "archived" && existing.isPrimary) {
        const replacement = await tx.linkedInProfile.findFirst({
          where: { userId, id: { not: id }, status: { not: "archived" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        if (replacement) {
          await tx.linkedInProfile.update({
            where: { id: replacement.id },
            data: { isPrimary: true, status: "current" },
          });
        }
      }
      return updated;
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save profile" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.linkedInProfile.findFirst({
        where: { id, userId },
        select: { id: true, isPrimary: true },
      });
      if (!profile) return null;

      // Revisions are removed by the schema's onDelete: Cascade relation.
      await tx.linkedInProfile.delete({ where: { id: profile.id } });

      let promotedProfileId: string | null = null;
      if (profile.isPrimary) {
        const replacement = await tx.linkedInProfile.findFirst({
          where: { userId, status: { not: "archived" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
        if (replacement) {
          await tx.linkedInProfile.update({
            where: { id: replacement.id },
            data: { isPrimary: true, status: "current" },
          });
          promotedProfileId = replacement.id;
        }
      }

      return { deleted: true, promotedProfileId };
    });
    if (!result) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not delete profile" }, { status: 500 });
  }
}
