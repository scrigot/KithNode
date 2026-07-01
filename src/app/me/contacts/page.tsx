import { prisma, meUserEmail } from "@/lib/me/db";
import { buildContactWhere, parseFilters } from "@/lib/me/contact-query";
import ImportCard from "./import-card";
import OpenContact from "@/components/me/open-contact";
import ContactFilterBar from "@/components/me/contact-filter-bar";

const REL_STYLE: Record<string, string> = {
  buyer: "text-[#E8643C] bg-[#E8643C]/10 border-[#E8643C]/30",
  practitioner: "text-[#7FB069] bg-[#7FB069]/10 border-[#7FB069]/30",
  ecosystem: "text-[#6EA8C7] bg-[#6EA8C7]/10 border-[#6EA8C7]/30",
};

function actionItemsOf(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [];
}

export default async function MeContacts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const userId = meUserEmail();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const where = buildContactWhere(userId, filters);
  const filtered = Object.keys({ ...filters }).some((k) => filters[k as keyof typeof filters]);

  const [contacts, total, industriesRaw, sourcesRaw] = await Promise.all([
    prisma.meContact.findMany({ where, orderBy: [{ name: "asc" }], include: { memory: true }, take: 500 }),
    prisma.meContact.count({ where }),
    prisma.meContact.findMany({ where: { userId }, select: { industry: true }, distinct: ["industry"], orderBy: { industry: "asc" } }),
    prisma.meContact.findMany({ where: { userId }, select: { source: true }, distinct: ["source"], orderBy: { source: "asc" } }),
  ]);
  const industries = industriesRaw.map((r) => r.industry).filter((v): v is string => !!v && v.trim() !== "");
  const sources = sourcesRaw.map((r) => r.source).filter((v) => !!v && v.trim() !== "");

  return (
    <div className="max-w-5xl mx-auto px-10 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="mt-2 text-[14px] text-[#B7AFA7]">
        Your network, owned locally. Click a name to open, edit, and enrich. Ranking and
        pipelines build on top.
      </p>

      <div className="mt-6">
        <ImportCard />
      </div>

      <div className="mt-6">
        <ContactFilterBar industries={industries} sources={sources} total={total} />
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#38332F] bg-[#201E1D] p-10 text-center">
          <p className="text-[15px] text-[#C9C2BB]">{filtered ? "No matches" : "No contacts yet"}</p>
          <p className="mt-1 text-[13px] text-[#8A8077]">
            {filtered ? "Try clearing a filter." : "Import your LinkedIn Connections.csv above to populate your network."}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#38332F]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#232020] text-[#8A8077] uppercase tracking-wider text-[11px]">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Next</th>
                <th className="px-4 py-2.5 font-medium">Connected</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const rel = c.memory?.relationshipType || "";
                const actions = actionItemsOf(c.memory?.actionItems);
                return (
                  <tr key={c.id} className="border-t border-[#2E2A27] hover:bg-[#232020] transition-colors">
                    <td className="px-4 py-2.5 text-white">
                      <OpenContact id={c.id} className="hover:text-[#E8643C] text-left">{c.name}</OpenContact>
                    </td>
                    <td className="px-4 py-2.5 text-[#B7AFA7]">{c.firmName || "—"}</td>
                    <td className="px-4 py-2.5 text-[#B7AFA7]">{c.title || "—"}</td>
                    <td className="px-4 py-2.5">
                      {rel ? (
                        <span className={`text-[10px] uppercase tracking-wide rounded-full border px-2 py-0.5 ${REL_STYLE[rel] || ""}`}>{rel}</span>
                      ) : (
                        <span className="text-[#6F665E]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {actions.length ? (
                        <OpenContact id={c.id} tab="memory" className="rounded-full border border-[#7FB069]/30 bg-[#7FB069]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#A9D19A] hover:border-[#E8643C] hover:text-white">
                          {actions.length}
                        </OpenContact>
                      ) : (
                        <span className="text-[#6F665E]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#8A8077]">
                      {c.connectedOn ? new Date(c.connectedOn).getFullYear() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > contacts.length && (
            <div className="px-4 py-2.5 text-[12px] text-[#6F665E] border-t border-[#2E2A27]">
              Showing first {contacts.length} of {total}. Narrow with search/filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
