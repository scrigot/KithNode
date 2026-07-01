import { prisma, meUserEmail } from "@/lib/me/db";
import ResumeBuilder from "./resume-builder";

// The /me resume builder: upload or write a resume, see live how a recruiter for
// your target AI track would score it, get AI fixes, and export to PDF. Loads the
// most-recent draft (if any) for the dogfood user.
export default async function MeResumePage() {
  const userId = meUserEmail();
  const resume = await prisma.meResume.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const initial = resume
    ? {
        id: resume.id,
        title: resume.title,
        track: resume.track,
        templateId: resume.templateId,
        content: resume.content,
        userContext: resume.userContext,
      }
    : null;

  return <ResumeBuilder initial={initial} />;
}
