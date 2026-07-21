import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/me/db";
import type { Prisma } from "@/generated/prisma/client";
import { careerWorkspaceEmail } from "@/lib/career-workspace-user";

export const runtime = "nodejs";

/** GET /api/me/resume — the user's most-recent resume draft (or null). */
export async function GET() {
  const userId = await careerWorkspaceEmail();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resume = await prisma.meResume.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ resume });
}

/**
 * POST /api/me/resume — create or update the resume draft.
 * Body: { id?, title?, track?, templateId?, content?, score?, dimensions?, notes? }
 */
export async function POST(req: NextRequest) {
  const userId = await careerWorkspaceEmail();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data = {
    title: typeof body.title === "string" ? body.title.slice(0, 200) : undefined,
    track: typeof body.track === "string" ? body.track : undefined,
    templateId: typeof body.templateId === "string" ? body.templateId : undefined,
    content: (body.content ?? undefined) as Prisma.InputJsonValue | undefined,
    docVersion: typeof body.docVersion === "number" ? body.docVersion : undefined,
    userContext: typeof body.userContext === "string" ? body.userContext.slice(0, 4000) : undefined,
    score: typeof body.score === "number" ? Math.round(body.score) : undefined,
    dimensions: (body.dimensions ?? undefined) as Prisma.InputJsonValue | undefined,
    notes: (body.notes ?? undefined) as Prisma.InputJsonValue | undefined,
  };

  // Update an existing draft only when it belongs to this user; otherwise create.
  if (typeof body.id === "string" && body.id) {
    const existing = await prisma.meResume.findFirst({ where: { id: body.id, userId } });
    if (existing) {
      const resume = await prisma.meResume.update({ where: { id: existing.id }, data });
      return NextResponse.json({ resume });
    }
  }

  const resume = await prisma.meResume.create({
    data: {
      userId,
      title: data.title ?? "Untitled resume",
      track: data.track ?? "ai-consulting",
      templateId: data.templateId ?? "dense",
      content: data.content ?? {},
      docVersion: data.docVersion ?? 2,
      userContext: data.userContext ?? "",
      score: data.score ?? 0,
      dimensions: data.dimensions ?? [],
      notes: data.notes ?? [],
    },
  });
  return NextResponse.json({ resume });
}
