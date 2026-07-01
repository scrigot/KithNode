import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { sanitizeDiscoveryLeadInput, validateDiscoveryLead, DISCOVERY_STATUSES } from "@/lib/me/discovery-lead";
import { sanitizeProfileInput } from "@/lib/me/profile";

export const runtime = "nodejs";

async function getProfile(userId: string) {
  const profile = await prisma.meProfile.findUnique({ where: { userId } });
  return profile ? sanitizeProfileInput(profile) : undefined;
}

export async function GET(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const status = req.nextUrl.searchParams.get("status") || "";
  const where = {
    userId,
    ...(DISCOVERY_STATUSES.includes(status as (typeof DISCOVERY_STATUSES)[number])
      ? { status }
      : { status: { not: "dismissed" } }),
  };

  const leads = await prisma.meDiscoveryLead.findMany({
    where,
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    include: { savedContact: { select: { id: true, name: true } } },
    take: 200,
  });

  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const body = await req.json().catch(() => ({}));
  const data = sanitizeDiscoveryLeadInput(body, await getProfile(userId));
  const validationError = validateDiscoveryLead(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const writeData = {
    userId,
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
  };

  const lead = data.linkedInUrl
    ? await prisma.meDiscoveryLead.upsert({
        where: { userId_linkedInUrl: { userId, linkedInUrl: data.linkedInUrl } },
        create: writeData,
        update: { ...writeData, status: "researching" },
        include: { savedContact: { select: { id: true, name: true } } },
      })
    : await prisma.meDiscoveryLead.create({
        data: writeData,
        include: { savedContact: { select: { id: true, name: true } } },
      });

  return NextResponse.json({ lead }, { status: 201 });
}
