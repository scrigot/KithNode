import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import {
  sanitizeApplicationInput,
  validateApplication,
  validateApplicationEnums,
  type ApplicationPriority,
  type ApplicationStatus,
} from "@/lib/me/applications";

export const runtime = "nodejs";

const APPLIED_STATUSES = new Set(["applied", "assessment", "interview", "offer", "accepted", "rejected", "withdrawn"]);

async function assertResume(userId: string, resumeId: string | null) {
  if (!resumeId) return true;
  const resume = await prisma.meResume.findFirst({ where: { id: resumeId, userId }, select: { id: true } });
  return Boolean(resume);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const existing = await prisma.meInternshipApplication.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const enumError = validateApplicationEnums(body);
  if (enumError) return NextResponse.json({ error: enumError }, { status: 400 });
  const data = sanitizeApplicationInput(body, {
    company: existing.company,
    role: existing.role,
    location: existing.location,
    season: existing.season,
    jobUrl: existing.jobUrl,
    source: existing.source,
    deadline: existing.deadline,
    status: existing.status as ApplicationStatus,
    priority: existing.priority as ApplicationPriority,
    resumeId: existing.resumeId,
    jobDescription: existing.jobDescription,
    notes: existing.notes,
    nextAction: existing.nextAction,
    nextActionDue: existing.nextActionDue,
    appliedAt: existing.appliedAt,
    archived: existing.archived,
  });
  const validationError = validateApplication(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (!(await assertResume(userId, data.resumeId))) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const appliedAt = data.appliedAt ?? (APPLIED_STATUSES.has(data.status) && !existing.appliedAt ? new Date() : null);
  const application = await prisma.meInternshipApplication.update({
    where: { id },
    data: {
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
      appliedAt,
      archived: data.archived,
      events: data.status !== existing.status
        ? {
            create: {
              userId,
              type: "status_change",
              title: "Status changed",
              detail: `${existing.status.replaceAll("_", " ")} → ${data.status.replaceAll("_", " ")}`,
              meta: { from: existing.status, to: data.status },
            },
          }
        : undefined,
    },
    include: {
      resume: { select: { id: true, title: true, track: true, score: true } },
      contacts: { include: { contact: { select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  return NextResponse.json({ application });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const res = await prisma.meInternshipApplication.deleteMany({ where: { id, userId } });
  if (res.count === 0) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
