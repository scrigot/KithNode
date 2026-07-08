import { prisma, meUserEmail } from "@/lib/me/db";
import { buildApplicationOrderBy, buildApplicationWhere, parseApplicationFilters } from "@/lib/me/applications";
import ApplicationsClient, { type ApplicationContactView, type ApplicationView, type ResumeOption } from "./applications-client";

export default async function MeApplications({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const userId = meUserEmail();
  const sp = await searchParams;
  const filters = parseApplicationFilters(sp);
  const where = buildApplicationWhere(userId, filters);
  const orderBy = buildApplicationOrderBy(filters);

  const [applications, total, resumes, contacts] = await Promise.all([
    prisma.meInternshipApplication.findMany({
      where,
      include: {
        resume: { select: { id: true, title: true, track: true, score: true } },
        contacts: { include: { contact: { select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true } } } },
        events: { orderBy: { createdAt: "desc" }, take: 8 },
      },
      orderBy,
      take: 300,
    }),
    prisma.meInternshipApplication.count({ where }),
    prisma.meResume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, track: true, content: true, score: true },
    }),
    prisma.meContact.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true },
      take: 500,
    }),
  ]);

  const appViews: ApplicationView[] = applications.map((app) => ({
    id: app.id,
    company: app.company,
    role: app.role,
    location: app.location,
    season: app.season,
    jobUrl: app.jobUrl,
    source: app.source,
    deadline: app.deadline?.toISOString() || "",
    status: app.status,
    priority: app.priority,
    resumeId: app.resumeId || "",
    resumeTitle: app.resume?.title || "",
    jobDescription: app.jobDescription,
    notes: app.notes,
    nextAction: app.nextAction,
    nextActionDue: app.nextActionDue?.toISOString() || "",
    appliedAt: app.appliedAt?.toISOString() || "",
    archived: app.archived,
    updatedAt: app.updatedAt.toISOString(),
    contacts: app.contacts.map((link) => ({
      id: link.contact.id,
      name: link.contact.name,
      firmName: link.contact.firmName || "",
      title: link.contact.title || "",
      linkedInUrl: link.contact.linkedInUrl || "",
    })),
    events: app.events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      detail: event.detail,
      createdAt: event.createdAt.toISOString(),
    })),
  }));

  const resumeOptions: ResumeOption[] = resumes.map((resume) => ({
    id: resume.id,
    title: resume.title,
    track: resume.track,
    score: resume.score,
    content: resume.content,
  }));
  const contactViews: ApplicationContactView[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    firmName: contact.firmName || "",
    title: contact.title || "",
    linkedInUrl: contact.linkedInUrl || "",
  }));

  return (
    <div className="px-8 py-10">
      <div className="max-w-7xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">internship crm</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
            <p className="mt-2 max-w-3xl text-[14px] text-[#B7AFA7]">
              Spreadsheet-style tracker for internships, deadlines, resumes, contacts, and next actions.
            </p>
          </div>
          <span className="rounded-full border border-[#38332F] px-3 py-1.5 text-[12px] text-[#8A8077]">{total} row{total === 1 ? "" : "s"}</span>
        </div>
        <ApplicationsClient applications={appViews} resumes={resumeOptions} contacts={contactViews} total={total} />
      </div>
    </div>
  );
}
