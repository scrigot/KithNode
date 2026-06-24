import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import PrepView from "./prep-view";
import DraftButton from "./draft-button";

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
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {c.linkedInUrl ? (
          <a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="hover:text-[#E8643C]">{c.name}</a>
        ) : (
          c.name
        )}
      </h1>
      <p className="text-[14px] text-[#9C948C]">{[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}</p>
      <PrepView contactId={contactId} />
      <DraftButton contactId={contactId} />
    </div>
  );
}
