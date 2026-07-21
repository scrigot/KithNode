import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ResumePaper } from "@/app/me/resume/templates";
import { normalizeDoc } from "@/lib/me/resume-doc";
import PrintTrigger from "@/app/me/resume/print/[id]/print-trigger";

export const dynamic = "force-dynamic";

export default async function ResumePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userEmail = session?.user?.email?.trim().toLowerCase();
  if (!userEmail) redirect("/sign-in");
  const { id } = await params;
  const resume = await prisma.meResume.findFirst({ where: { id, userId: userEmail } });
  if (!resume) notFound();

  return (
    <div style={{ background: "#3a3a3a", minHeight: "100vh", padding: "24px 0" }}>
      <PrintTrigger />
      <div className="resume-print-root"><ResumePaper doc={normalizeDoc(resume.content)} templateId={resume.templateId} /></div>
      <style>{`@media print { @page { size: letter; margin: 0; } body { background: #fff !important; } .resume-print-root .resume-paper { box-shadow: none !important; margin: 0 !important; } }`}</style>
    </div>
  );
}
