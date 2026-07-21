import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ResumeBuilder from "@/app/me/resume/resume-builder";
import { CareerToolkitNav } from "@/components/career-toolkit-nav";

export const dynamic = "force-dynamic";

export default async function DashboardResumePage() {
  const session = await auth();
  const userEmail = session?.user?.email?.trim().toLowerCase();
  if (!userEmail) redirect("/sign-in?callbackUrl=/dashboard/resume");

  const resume = await prisma.meResume.findFirst({
    where: { userId: userEmail },
    orderBy: { updatedAt: "desc" },
  });

  const initial = resume ? {
    id: resume.id,
    title: resume.title,
    track: resume.track,
    templateId: resume.templateId,
    content: resume.content,
    userContext: resume.userContext,
  } : null;

  return <div className="min-h-full bg-bg-primary"><CareerToolkitNav /><ResumeBuilder initial={initial} apiBase="/api/resume" printBase="/resume/print" embedded /></div>;
}
