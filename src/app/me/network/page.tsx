import { prisma, meUserEmail } from "@/lib/me/db";
import { ensurePipelines } from "@/lib/me/pipelines";
import {
  rankAiConsulting,
  reconnectList,
  introList,
  type RankedContact,
} from "@/lib/me/rank-ai-consulting";
import AddToAiConsulting from "./actions";

export default async function MeNetwork() {
  const userId = meUserEmail();
  await ensurePipelines(userId);

  const [contacts, entries, aiPipe] = await Promise.all([
    prisma.meContact.findMany({ where: { userId }, include: { memory: true } }),
    prisma.mePipelineEntry.findMany({ where: { userId }, select: { contactId: true } }),
    prisma.mePipeline.findFirst({ where: { userId, name: "AI Consulting" }, select: { id: true } }),
  ]);
  const inPipe = new Set(entries.map((e) => e.contactId));

  const ranked = rankAiConsulting(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      firmName: c.firmName || "",
      title: c.title || "",
      email: c.email || "",
      relationshipType: c.memory?.relationshipType || "",
      inPipeline: inPipe.has(c.id),
    })),
  );
  const reconnect = reconnectList(ranked);
  const intros = introList(ranked);
  const pipelineId = aiPipe?.id ?? null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Network</h1>
      <p className="mt-1 text-[14px] text-[#B7AFA7]">
        Your imported network, ranked for in-field AI consulting — buyers first, then
        practitioners, then ecosystem. Manual labels override the inference.
      </p>

      {contacts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#38332F] bg-[#201E1D] p-10 text-center">
          <p className="text-[15px] text-[#C9C2BB]">No network yet</p>
          <p className="mt-1 text-[13px] text-[#8A8077]">
            Import your LinkedIn connections on the Contacts tab, then this ranks them.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Reconnect with"
            subtitle="Highest-value people — fresh ones surface first"
            rows={reconnect}
            pipelineId={pipelineId}
          />
          <Section
            title="Can intro me"
            subtitle="Connectors & ecosystem — your warm-intro paths"
            rows={intros}
            pipelineId={pipelineId}
            hideScoreBar
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  rows,
  pipelineId,
  hideScoreBar,
}: {
  title: string;
  subtitle: string;
  rows: RankedContact[];
  pipelineId: string | null;
  hideScoreBar?: boolean;
}) {
  const max = rows[0]?.score || 1;
  return (
    <div>
      <h2 className="text-[13px] uppercase tracking-[0.16em] text-[#8A8077]">{title}</h2>
      <p className="text-[12px] text-[#6F665E] mb-3">{subtitle}</p>
      <div className="rounded-xl border border-[#38332F] overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[#6F665E] text-center">nothing here yet</p>
        ) : (
          rows.map((c) => (
            <div key={c.id} className="border-t border-[#2E2A27] first:border-t-0 px-4 py-3 hover:bg-[#232020] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-white truncate">{c.name}</span>
                    {c.inPipeline && (
                      <span className="text-[9px] uppercase tracking-wide text-[#7FB069] shrink-0">tracked</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#9C948C] truncate">
                    {[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.reasons.map((r) => (
                      <span key={r} className="text-[10px] text-[#9C948C] bg-[#2E2A27] rounded px-1.5 py-0.5">{r}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!hideScoreBar && <span className="text-[13px] font-mono text-[#E8643C]">{c.score}</span>}
                  {!c.inPipeline && <AddToAiConsulting contactId={c.id} pipelineId={pipelineId} />}
                </div>
              </div>
              {!hideScoreBar && (
                <div className="mt-2 h-1 rounded-full bg-[#2E2A27] overflow-hidden">
                  <div className="h-full bg-[#E8643C]/60" style={{ width: `${Math.round((c.score / max) * 100)}%` }} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
