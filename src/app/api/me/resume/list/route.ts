import { NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

export const runtime = "nodejs";

/** GET /api/me/resume/list — all of the user's saved resumes (full rows, for client-side switching). */
export async function GET() {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const resumes = await prisma.meResume.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, track: true, templateId: true, content: true, userContext: true, score: true, updatedAt: true },
  });
  return NextResponse.json({ resumes });
}
