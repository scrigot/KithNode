import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import { ensurePipelines } from "@/lib/me/pipelines";
import { buildContactWhere, parseFilters } from "@/lib/me/contact-query";
import {
  rankAiConsulting,
  reconnectList,
  introList,
  type RankedContact,
} from "@/lib/me/rank-ai-consulting";
import AddToAiConsulting from "./actions";
import OpenContact from "@/components/me/open-contact";
import ContactFilterBar from "@/components/me/contact-filter-bar";

export default async function MeNetwork({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const userId = meUserEmail();
  await ensurePipelines(userId);
  const sp = await searchParams;
  const where = buildContactWhere(userId, parseFilters(sp));

  const [contacts, entries, aiPipe, profile, industriesRaw, sourcesRaw, total] = await Promise.all([
    prisma.meContact.findMany({ where, include: { memory: true }, take: 600 }),
    prisma.mePipelineEntry.findMany({ where: { userId }, select: { contactId: true } }),
    prisma.mePipeline.findFirst({ where: { userId, name: "AI Consulting" }, select: { id: true } }),
    prisma.meProfile.findUnique({ where: { userId } }),
    prisma.meContact.findMany({ where: { userId }, select: { industry: true }, distinct: ["industry"], orderBy: { industry: "asc" } }),
    prisma.meContact.findMany({ where: { userId }, select: { source: true }, distinct: ["source"], orderBy: { source: "asc" } }),
    prisma.meContact.count({ where }),
  ]);
  const inPipe = new Set(entries.map((e) => e.contactId));
  const industries = industriesRaw.map((r) => r.industry).filter((v): v is string => !!v && v.trim() !== "");
  const sources = sourcesRaw.map((r) => r.source).filter((v) => !!v && v.trim() !== "");
  const hasProfileSignals = Boolean(
    profile && [profile.schools, profile.pastFirms, profile.hometown, profile.location].some((v) => v.trim()),
  );

  const ranked = rankAiConsulting(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      firmName: c.firmName || "",
      title: c.title || "",
      email: c.email || "",
      relationshipType: c.memory?.relationshipType || "",
      inPipeline: inPipe.has(c.id),
      education: c.education || "",
      pastFirms: c.pastFirms || "",
      location: c.location || "",
    })),
    profile
      ? { profile: { schools: profile.schools, pastFirms: profile.pastFirms, hometown: profile.hometown, location: profile.location } }
      : {},
  );
  const reconnect = reconnectList(ranked);
  const intros = introList(ranked);
  const pipelineId = aiPipe?.id ?? null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Network</h1>
      <p className="mt-1 text-[14px] text-[#B7AFA7]">
        Ranked for AI consulting. Fit signals find buyers, practitioners, and ecosystem connectors;
        warmth signals come from your Settings profile. Manual labels override.
      </p>

      <div className="mt-5"><ContactFilterBar industries={industries} sources={sources} total={total} /></div>

      {!hasProfileSignals && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#E8643C]/30 bg-[#E8643C]/[0.06] px-4 py-3">
          <p className="text-[13px] text-[#E7E1DB]">
            Add schools, past firms, and locations in Settings to turn on warm-signal scoring.
          </p>
          <Link href="/me/settings" className="shrink-0 rounded-lg bg-[#E8643C] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#d4562f]">
            Tune profile
          </Link>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#38332F] bg-[#201E1D] p-10 text-center">
          <p className="text-[15px] text-[#C9C2BB]">No matches</p>
          <p className="mt-1 text-[13px] text-[#8A8077]">Import contacts on the Contacts tab, or clear a filter.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Reconnect with" subtitle="Highest-value — fresh ones first" rows={reconnect} pipelineId={pipelineId} />
          <Section title="Can intro me" subtitle="Connectors & ecosystem — warm-intro paths" rows={intros} pipelineId={pipelineId} hideScoreBar />
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
                    <OpenContact id={c.id} className="text-[14px] font-medium text-white hover:text-[#E8643C] truncate text-left">{c.name}</OpenContact>
                    {c.inPipeline && <span className="text-[9px] uppercase tracking-wide text-[#7FB069] shrink-0">tracked</span>}
                  </div>
                  <p className="text-[12px] text-[#9C948C] truncate">{[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}</p>
                  <SignalChips c={c} />
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <ScoreBreakdown c={c} hideTotal={hideScoreBar} />
                  {!c.inPipeline && <AddToAiConsulting contactId={c.id} pipelineId={pipelineId} />}
                </div>
              </div>
              {!hideScoreBar && (
                <div className="mt-2 h-1.5 rounded-full bg-[#2E2A27] overflow-hidden">
                  <div className="flex h-full" style={{ width: `${Math.round((c.score / max) * 100)}%` }}>
                    <div className="h-full bg-[#E8643C]/70" style={{ width: `${Math.round((c.icpScore / Math.max(c.score, 1)) * 100)}%` }} />
                    {c.warmthScore > 0 && <div className="h-full flex-1 bg-[#6EA8C7]/80" />}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScoreBreakdown({ c, hideTotal }: { c: RankedContact; hideTotal?: boolean }) {
  return (
    <div className="text-right">
      {!hideTotal && <div className="text-[13px] font-mono text-[#E8643C]">{c.score}</div>}
      <div className="text-[10px] font-mono text-[#8A8077]">
        fit {c.icpScore}
        {c.warmthScore > 0 ? <span className="text-[#6EA8C7]"> + warm {c.warmthScore}</span> : null}
      </div>
    </div>
  );
}

function SignalChips({ c }: { c: RankedContact }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {c.icpReasons.map((r) => (
        <span key={`fit-${r}`} className="text-[10px] text-[#D7C6B8] bg-[#2E2A27] rounded px-1.5 py-0.5">
          fit · {r}
        </span>
      ))}
      {c.warmthReasons.map((r) => (
        <span key={`warm-${r}`} className="text-[10px] text-[#9FC4D7] bg-[#6EA8C7]/10 border border-[#6EA8C7]/20 rounded px-1.5 py-0.5">
          warm · {r}
        </span>
      ))}
      {c.reasons.length === 0 && (
        <span className="text-[10px] text-[#6F665E] bg-[#2E2A27] rounded px-1.5 py-0.5">no strong signal yet</span>
      )}
    </div>
  );
}
