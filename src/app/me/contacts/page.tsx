import { prisma, meUserEmail } from "@/lib/me/db";
import ImportCard from "./import-card";

// Contacts list for the /me workspace. Reads MeContact via Prisma (local DB),
// merges the per-contact memory for the relationship-type badge.

const REL_STYLE: Record<string, string> = {
  buyer: "text-[#E8643C] bg-[#E8643C]/10 border-[#E8643C]/30",
  practitioner: "text-[#7FB069] bg-[#7FB069]/10 border-[#7FB069]/30",
  ecosystem: "text-[#6EA8C7] bg-[#6EA8C7]/10 border-[#6EA8C7]/30",
};

export default async function MeContacts() {
  const userId = meUserEmail();
  const contacts = await prisma.meContact.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }],
    include: { memory: true },
    take: 1000,
  });

  return (
    <div className="max-w-5xl mx-auto px-10 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <span className="text-[13px] text-[#8A8077]">{contacts.length} total</span>
      </div>
      <p className="mt-2 text-[14px] text-[#B7AFA7]">
        Your network, imported and owned locally. This is the raw pool — ranking and
        pipelines build on top of it.
      </p>

      <div className="mt-6">
        <ImportCard />
      </div>

      {contacts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#38332F] bg-[#201E1D] p-10 text-center">
          <p className="text-[15px] text-[#C9C2BB]">No contacts yet</p>
          <p className="mt-1 text-[13px] text-[#8A8077]">
            Import your LinkedIn Connections.csv above to populate your network.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-[#38332F]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#232020] text-[#8A8077] uppercase tracking-wider text-[11px]">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Connected</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const rel = c.memory?.relationshipType || "";
                return (
                  <tr key={c.id} className="border-t border-[#2E2A27] hover:bg-[#232020] transition-colors">
                    <td className="px-4 py-2.5 text-white">
                      {c.linkedInUrl ? (
                        <a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="hover:text-[#E8643C]">
                          {c.name}
                        </a>
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#B7AFA7]">{c.firmName || "—"}</td>
                    <td className="px-4 py-2.5 text-[#B7AFA7]">{c.title || "—"}</td>
                    <td className="px-4 py-2.5">
                      {rel ? (
                        <span className={`text-[10px] uppercase tracking-wide rounded-full border px-2 py-0.5 ${REL_STYLE[rel] || ""}`}>
                          {rel}
                        </span>
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
        </div>
      )}
    </div>
  );
}
