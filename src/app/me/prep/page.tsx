import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import { buildContactWhere, parseFilters } from "@/lib/me/contact-query";
import ContactFilterBar from "@/components/me/contact-filter-bar";

// Picker: search/filter to find who you're meeting, then jump to their brief.
export default async function MePrepPicker({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const userId = meUserEmail();
  const sp = await searchParams;
  const where = buildContactWhere(userId, parseFilters(sp));

  const [contacts, total, industriesRaw, sourcesRaw] = await Promise.all([
    prisma.meContact.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, firmName: true, title: true }, take: 300 }),
    prisma.meContact.count({ where }),
    prisma.meContact.findMany({ where: { userId }, select: { industry: true }, distinct: ["industry"], orderBy: { industry: "asc" } }),
    prisma.meContact.findMany({ where: { userId }, select: { source: true }, distinct: ["source"], orderBy: { source: "asc" } }),
  ]);
  const industries = industriesRaw.map((r) => r.industry).filter((v): v is string => !!v && v.trim() !== "");
  const sources = sourcesRaw.map((r) => r.source).filter((v) => !!v && v.trim() !== "");

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Coffee-chat prep</h1>
      <p className="mt-1 text-[14px] text-[#B7AFA7]">
        Pick who you&rsquo;re meeting — get a one-screen brief, tailored to the meeting, with the ask.
      </p>

      <div className="mt-6">
        <ContactFilterBar industries={industries} sources={sources} total={total} />
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#38332F] bg-[#201E1D] p-10 text-center">
          <p className="text-[15px] text-[#C9C2BB]">No matches</p>
          <p className="mt-1 text-[13px] text-[#8A8077]">Import contacts or clear a filter.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#38332F] overflow-hidden">
          {contacts.map((c) => (
            <Link key={c.id} href={`/me/prep/${c.id}`}
              className="flex items-center justify-between gap-3 border-t border-[#2E2A27] first:border-t-0 px-4 py-3 hover:bg-[#232020] transition-colors">
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-white truncate">{c.name}</div>
                <div className="text-[12px] text-[#9C948C] truncate">{[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <span className="text-[12px] text-[#E8643C] shrink-0">Prep →</span>
            </Link>
          ))}
          {total > contacts.length && (
            <div className="px-4 py-2.5 text-[12px] text-[#6F665E] border-t border-[#2E2A27]">Showing {contacts.length} of {total} — narrow with search.</div>
          )}
        </div>
      )}
    </div>
  );
}
