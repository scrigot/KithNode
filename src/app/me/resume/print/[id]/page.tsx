import { notFound } from "next/navigation";
import { prisma, meUserEmail } from "@/lib/me/db";
import { ResumePaper } from "../../templates";
import { normalizeDoc } from "@/lib/me/resume-doc";
import PrintTrigger from "./print-trigger";

// Print/export view: renders the resume on a clean white page with print CSS that
// hides everything but the paper, then auto-opens the browser print dialog so the
// user can "Save as PDF". Zero PDF dependencies. Scoped to the dogfood user.
export default async function ResumePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = meUserEmail();
  const resume = await prisma.meResume.findFirst({ where: { id, userId } });
  if (!resume) notFound();

  const doc = normalizeDoc(resume.content);

  return (
    <div style={{ background: "#3a3a3a", minHeight: "100vh", padding: "24px 0" }}>
      <PrintTrigger />
      <div className="resume-print-root">
        <ResumePaper doc={doc} templateId={resume.templateId} />
      </div>
      <style>{`
        @media print {
          @page { size: letter; margin: 0; }
          body { background: #fff !important; }
          .resume-print-root .resume-paper { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
