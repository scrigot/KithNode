import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { sanitizeDiscoveryLeadInput, validateDiscoveryLead } from "@/lib/me/discovery-lead";
import { sanitizeProfileInput } from "@/lib/me/profile";

export const runtime = "nodejs";

async function getProfile(userId: string) {
  const profile = await prisma.meProfile.findUnique({ where: { userId } });
  return profile ? sanitizeProfileInput(profile) : undefined;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const existing = await prisma.meDiscoveryLead.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data = sanitizeDiscoveryLeadInput(
    {
      status: body.status ?? existing.status,
      name: body.name ?? existing.name,
      firmName: body.firmName ?? existing.firmName,
      title: body.title ?? existing.title,
      linkedInUrl: body.linkedInUrl ?? existing.linkedInUrl,
      email: body.email ?? existing.email,
      location: body.location ?? existing.location,
      education: body.education ?? existing.education,
      industry: body.industry ?? existing.industry,
      notes: body.notes ?? existing.notes,
      sourceQuery: body.sourceQuery ?? existing.sourceQuery,
      sourceUrl: body.sourceUrl ?? existing.sourceUrl,
    },
    await getProfile(userId),
  );
  const validationError = validateDiscoveryLead(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const lead = await prisma.meDiscoveryLead.update({
    where: { id },
    data: {
      status: data.status,
      name: data.name,
      firmName: data.firmName,
      title: data.title,
      linkedInUrl: data.linkedInUrl,
      email: data.email,
      location: data.location,
      education: data.education,
      industry: data.industry,
      notes: data.notes,
      sourceQuery: data.sourceQuery,
      sourceUrl: data.sourceUrl,
      score: data.score,
      reasons: data.reasons as Prisma.InputJsonValue,
    },
    include: { savedContact: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const res = await prisma.meDiscoveryLead.deleteMany({ where: { id, userId } });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
