import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

export const runtime = "nodejs";

// Full contact for the profile modal: scalar fields + memory + pipeline
// memberships + recent enrichment notes.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;

  const contact = await prisma.meContact.findFirst({
    where: { id, userId },
    include: {
      memory: true,
      pipelineEntries: {
        orderBy: { updatedAt: "desc" },
        include: { pipeline: { select: { id: true, name: true, cadenceDays: true, stages: true } } },
      },
      enrichmentNotes: { orderBy: { createdAt: "desc" }, take: 50 },
      prepBriefs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, model: true, meta: true },
      },
      activities: { orderBy: { occurredAt: "desc" }, take: 100 },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

// Edit any profile field. Only the whitelisted scalar columns are writable, and
// the update is userId-scoped so you can only edit your own rows.
const EDITABLE = [
  "name",
  "firmName",
  "title",
  "linkedInUrl",
  "email",
  "location",
  "education",
  "industry",
  "seniorityLevel",
  "pastFirms",
  "notes",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  for (const key of EDITABLE) {
    if (key in body) {
      const v = body[key];
      if (v === null || typeof v === "string") {
        // name must stay non-empty; everything else may be cleared to null.
        if (key === "name") {
          if (typeof v === "string" && v.trim()) data.name = v.trim();
        } else {
          data[key] = v === null || v === "" ? (key === "notes" ? "" : null) : v.trim();
        }
      }
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const res = await prisma.meContact.updateMany({ where: { id, userId }, data });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contact = await prisma.meContact.findFirst({ where: { id, userId }, include: { memory: true } });
  return NextResponse.json({ contact });
}
