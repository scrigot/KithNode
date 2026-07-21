import { NextResponse } from "next/server";
import { prisma } from "@/lib/me/db";
import { careerWorkspaceEmail } from "@/lib/career-workspace-user";

export const runtime = "nodejs";

/** GET /api/me/resume/list — all of the user's saved resumes (full rows, for client-side switching). */
export async function GET() {
  const userId = await careerWorkspaceEmail();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resumes = await prisma.meResume.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, track: true, templateId: true, content: true, userContext: true, score: true, updatedAt: true },
  });
  return NextResponse.json({ resumes });
}
