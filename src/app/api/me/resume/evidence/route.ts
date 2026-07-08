import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

export const runtime = "nodejs";

const KINDS = new Set(["project", "class", "work", "leadership", "metric", "skill"]);

/** GET /api/me/resume/evidence — the user's reusable evidence bank. */
export async function GET() {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const evidence = await prisma.meEvidence.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ evidence });
}

/** POST /api/me/resume/evidence — create or update an evidence item. */
export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const b = await req.json().catch(() => ({}));
  const data = {
    kind: KINDS.has(b?.kind) ? b.kind : "project",
    title: typeof b?.title === "string" ? b.title.slice(0, 300) : "",
    detail: typeof b?.detail === "string" ? b.detail.slice(0, 2000) : "",
    metric: typeof b?.metric === "string" ? b.metric.slice(0, 300) : "",
    proofUrl: typeof b?.proofUrl === "string" ? b.proofUrl.slice(0, 500) : "",
  };
  if (!data.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  if (typeof b?.id === "string" && b.id) {
    const existing = await prisma.meEvidence.findFirst({ where: { id: b.id, userId } });
    if (existing) {
      const evidence = await prisma.meEvidence.update({ where: { id: existing.id }, data });
      return NextResponse.json({ evidence });
    }
  }
  const evidence = await prisma.meEvidence.create({ data: { userId, ...data } });
  return NextResponse.json({ evidence });
}

/** DELETE /api/me/resume/evidence?id=… */
export async function DELETE(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.meEvidence.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
