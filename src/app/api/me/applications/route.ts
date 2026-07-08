import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import {
  buildApplicationWhere,
  buildApplicationOrderBy,
  parseApplicationFilters,
  sanitizeApplicationInput,
  validateApplication,
  validateApplicationEnums,
} from "@/lib/me/applications";

export const runtime = "nodejs";

async function assertResume(userId: string, resumeId: string | null) {
  if (!resumeId) return true;
  const resume = await prisma.meResume.findFirst({ where: { id: resumeId, userId }, select: { id: true } });
  return Boolean(resume);
}

export async function GET(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const filters = parseApplicationFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const where = buildApplicationWhere(userId, filters);
  const orderBy = buildApplicationOrderBy(filters);
  const applications = await prisma.meInternshipApplication.findMany({
    where,
    include: {
      resume: { select: { id: true, title: true, track: true, score: true } },
      contacts: { include: { contact: { select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy,
    take: 300,
  });
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const body = await req.json().catch(() => ({}));
  const enumError = validateApplicationEnums(body);
  if (enumError) return NextResponse.json({ error: enumError }, { status: 400 });
  const data = sanitizeApplicationInput(body);
  const validationError = validateApplication(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (!(await assertResume(userId, data.resumeId))) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const application = await prisma.meInternshipApplication.create({
    data: {
      userId,
      company: data.company,
      role: data.role,
      location: data.location,
      season: data.season,
      jobUrl: data.jobUrl,
      source: data.source,
      deadline: data.deadline,
      status: data.status,
      priority: data.priority,
      resumeId: data.resumeId,
      jobDescription: data.jobDescription,
      notes: data.notes,
      nextAction: data.nextAction,
      nextActionDue: data.nextActionDue,
      appliedAt: data.appliedAt,
      archived: data.archived,
      events: {
        create: {
          userId,
          type: "created",
          title: "Application created",
          detail: `${data.role} at ${data.company}`,
          meta: { status: data.status },
        },
      },
    },
    include: {
      resume: { select: { id: true, title: true, track: true, score: true } },
      contacts: { include: { contact: { select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return NextResponse.json({ application }, { status: 201 });
}
