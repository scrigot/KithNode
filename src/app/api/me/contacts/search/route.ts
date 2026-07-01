import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { buildContactSearchWhere } from "@/lib/me/contact-query";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const excludePipelineId = (sp.get("excludePipelineId") || "").trim() || undefined;

  if (q.length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  if (excludePipelineId) {
    const pipeline = await prisma.mePipeline.findFirst({
      where: { id: excludePipelineId, userId },
      select: { id: true },
    });
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const contacts = await prisma.meContact.findMany({
    where: buildContactSearchWhere(userId, q, excludePipelineId),
    orderBy: { name: "asc" },
    select: { id: true, name: true, firmName: true, title: true },
    take: 10,
  });

  return NextResponse.json({ contacts });
}
