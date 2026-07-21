import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLinkedInProfile } from "@/lib/linkedin-profile/audit";
import { normalizeLinkedInProfile } from "@/lib/linkedin-profile/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const profile = await prisma.linkedInProfile.findFirst({ where: { id, userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const audit = auditLinkedInProfile(normalizeLinkedInProfile(profile.content));
  await prisma.linkedInProfile.update({ where: { id }, data: { audit: audit as unknown as Prisma.InputJsonValue, score: audit.score } });
  return NextResponse.json({ audit });
}
