import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import PrepView from "./prep-view";
import DraftButton from "./draft-button";
import OpenContact from "@/components/me/open-contact";

export default async function PrepDetail({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  const userId = meUserEmail();
  const c = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    select: { name: true, firmName: true, title: true, linkedInUrl: true },
  });
  if (!c) notFound();

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link href="/me/prep" className="text-[12px] text-[#8A8077] hover:text-white">← all contacts</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight flex items-center gap-3">
        <OpenContact id={contactId} className="hover:text-[#E8643C] text-left">{c.name}</OpenContact>
        {c.linkedInUrl && (
          <a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="text-[12px] font-normal text-[#8A8077] hover:text-[#E8643C]">
            LinkedIn ↗
          </a>
        )}
      </h1>
      <p className="text-[14px] text-[#9C948C]">{[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}</p>
      <PrepView contactId={contactId} />
      <DraftButton contactId={contactId} />
    </div>
  );
}
