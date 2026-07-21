import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLinkedInProfile } from "@/lib/linkedin-profile/audit";
import { createLinkedInProfileSchema, normalizeLinkedInProfile } from "@/lib/linkedin-profile/schema";
import { extensionIdentity } from "@/lib/extension-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profiles = await prisma.linkedInProfile.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { revisions: true } } },
  });
  return NextResponse.json({ profiles });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const identity = session?.user?.id ? null : await extensionIdentity(request, "profiles:write");
  const userId = session?.user?.id || identity?.userId;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createLinkedInProfileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile", issues: parsed.error.issues }, { status: 400 });

  try {
    const content = normalizeLinkedInProfile(parsed.data.content);
    if (parsed.data.linkedInUrl && !content.basics.profileUrl) content.basics.profileUrl = parsed.data.linkedInUrl;
    const audit = auditLinkedInProfile(content);
    const existingCount = await prisma.linkedInProfile.count({ where: { userId } });
    const displayName = parsed.data.name
      || [content.basics.firstName, content.basics.lastName].filter(Boolean).join(" ")
      || "Untitled LinkedIn profile";
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.linkedInProfile.create({
        data: {
          userId,
          name: displayName,
          linkedInUrl: parsed.data.linkedInUrl || content.basics.profileUrl,
          source: parsed.data.source,
          isPrimary: existingCount === 0,
          status: existingCount === 0 ? "current" : "draft",
          content: content as unknown as Prisma.InputJsonValue,
          audit: audit as unknown as Prisma.InputJsonValue,
          score: audit.score,
        },
      });
      await tx.linkedInProfileRevision.create({
        data: {
          profileId: created.id,
          userId,
          version: 1,
          content: content as unknown as Prisma.InputJsonValue,
          audit: audit as unknown as Prisma.InputJsonValue,
          score: audit.score,
          changeSummary: parsed.data.source === "json_import" ? "Imported profile" : "Created profile",
          source: parsed.data.source === "json_import" ? "import" : "create",
        },
      });
      return created;
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create profile" }, { status: 400 });
  }
}
