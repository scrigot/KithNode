"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface BoardStage {
  key: string;
  label: string;
  color: string;
  universalPhase: string;
}
export interface BoardPipeline {
  id: string;
  name: string;
  cadenceDays: number | null;
  stages: BoardStage[];
}
export interface BoardEntry {
  id: string;
  pipelineId: string;
  stage: string;
  daysSince: number | null;
  relationshipType: string;
  contact: { id: string; name: string; firmName: string; title: string; linkedInUrl: string };
}

const UNIVERSAL_PHASES = [
  { key: "identified", label: "Identified" },
  { key: "contacted", label: "Contacted" },
  { key: "engaged", label: "Engaged" },
  { key: "advanced", label: "Advanced" },
];

const REL = ["", "buyer", "practitioner", "ecosystem"];
const REL_DOT: Record<string, string> = {
  buyer: "#E8643C",
  practitioner: "#7FB069",
  ecosystem: "#6EA8C7",
};

export default function Board({
  pipelines,
  entries,
  contacts,
}: {
  pipelines: BoardPipeline[];
  entries: BoardEntry[];
  contacts: { id: string; name: string; firmName: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<string>(pipelines[0]?.id ?? "all");

  function mutate(url: string, method: string, body?: unknown) {
    start(async () => {
      await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      router.refresh();
    });
  }

  const isCold = (e: BoardEntry, cadence: number | null) =>
    e.daysSince != null && cadence != null && e.daysSince > cadence;

  const activePipeline = pipelines.find((p) => p.id === tab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#38332F] mb-5">
        {pipelines.map((p) => {
          const count = entries.filter((e) => e.pipelineId === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setTab(p.id)}
              className={`px-3.5 py-2 text-[13px] -mb-px border-b-2 transition-colors ${
                tab === p.id
                  ? "border-[#E8643C] text-white"
                  : "border-transparent text-[#9C948C] hover:text-white"
              }`}
            >
              {p.name} <span className="text-[#6F665E]">{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setTab("all")}
          className={`px-3.5 py-2 text-[13px] -mb-px border-b-2 transition-colors ${
            tab === "all" ? "border-[#E8643C] text-white" : "border-transparent text-[#9C948C] hover:text-white"
          }`}
        >
          All
        </button>
        {pending && <span className="ml-2 text-[11px] text-[#6F665E]">saving…</span>}
      </div>

      {tab === "all" ? (
        <Rollup pipelines={pipelines} entries={entries} />
      ) : activePipeline ? (
        <PipelineView
          pipeline={activePipeline}
          entries={entries.filter((e) => e.pipelineId === activePipeline.id)}
          contacts={contacts}
          isCold={isCold}
          mutate={mutate}
        />
      ) : null}
    </div>
  );
}

function Card({
  e,
  stages,
  cold,
  mutate,
}: {
  e: BoardEntry;
  stages: BoardStage[];
  cold: boolean;
  mutate: (url: string, method: string, body?: unknown) => void;
}) {
  return (
    <div className="rounded-lg border border-[#38332F] bg-[#262220] p-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {e.contact.linkedInUrl ? (
            <a href={e.contact.linkedInUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-white hover:text-[#E8643C] truncate block">
              {e.contact.name}
            </a>
          ) : (
            <span className="text-[13px] font-medium text-white truncate block">{e.contact.name}</span>
          )}
          <p className="text-[11px] text-[#9C948C] truncate">
            {[e.contact.title, e.contact.firmName].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <button
          onClick={() => mutate(`/api/me/pipelines/entry/${e.id}`, "DELETE")}
          className="opacity-0 group-hover:opacity-100 text-[#6F665E] hover:text-[#E8643C] text-xs leading-none"
          title="Remove from pipeline"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        {/* relationship type */}
        <select
          value={e.relationshipType}
          onChange={(ev) =>
            mutate(`/api/me/contacts/${e.contact.id}/memory`, "PATCH", { relationshipType: ev.target.value })
          }
          className="text-[10px] bg-[#1C1A19] border border-[#38332F] rounded px-1.5 py-1 text-[#C9C2BB] outline-none"
        >
          {REL.map((r) => (
            <option key={r} value={r}>{r || "type…"}</option>
          ))}
        </select>
        {e.relationshipType && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: REL_DOT[e.relationshipType] }} />
        )}

        {/* move stage */}
        <select
          value={e.stage}
          onChange={(ev) => mutate(`/api/me/pipelines/entry/${e.id}`, "PATCH", { stage: ev.target.value })}
          className="text-[10px] bg-[#1C1A19] border border-[#38332F] rounded px-1.5 py-1 text-[#C9C2BB] outline-none"
        >
          {stages.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <button
          onClick={() => mutate(`/api/me/pipelines/entry/${e.id}`, "PATCH", { touch: true })}
          className={`text-[10px] rounded px-1.5 py-1 border ${
            cold ? "border-[#E8643C]/40 text-[#E8643C]" : "border-[#38332F] text-[#8A8077] hover:text-white"
          }`}
          title="Mark touched (resets cold timer)"
        >
          {e.daysSince == null ? "touch" : cold ? `${e.daysSince}d cold` : `${e.daysSince}d`}
        </button>
      </div>
    </div>
  );
}

function PipelineView({
  pipeline,
  entries,
  contacts,
  isCold,
  mutate,
}: {
  pipeline: BoardPipeline;
  entries: BoardEntry[];
  contacts: { id: string; name: string; firmName: string | null }[];
  isCold: (e: BoardEntry, cadence: number | null) => boolean;
  mutate: (url: string, method: string, body?: unknown) => void;
}) {
  const inPipeline = new Set(entries.map((e) => e.contact.id));
  const available = contacts.filter((c) => !inPipeline.has(c.id));
  const coldCount = entries.filter((e) => isCold(e, pipeline.cadenceDays)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-[#8A8077]">
          {entries.length} contacts
          {coldCount > 0 && <span className="text-[#E8643C]"> · {coldCount} going cold</span>}
          {pipeline.cadenceDays != null && <span> · cadence {pipeline.cadenceDays}d</span>}
        </div>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) mutate("/api/me/pipelines/entry", "POST", { pipelineId: pipeline.id, contactId: e.target.value });
          }}
          className="text-[12px] bg-[#232020] border border-[#38332F] rounded-lg px-2.5 py-1.5 text-[#C9C2BB] outline-none max-w-[240px]"
        >
          <option value="">+ Add contact…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.firmName ? ` — ${c.firmName}` : ""}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {pipeline.stages.map((s) => {
          const col = entries.filter((e) => e.stage === s.key);
          return (
            <div key={s.key} className="w-[230px] shrink-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[12px] font-medium text-[#C9C2BB]">{s.label}</span>
                <span className="text-[11px] text-[#6F665E]">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((e) => (
                  <Card key={e.id} e={e} stages={pipeline.stages} cold={isCold(e, pipeline.cadenceDays)} mutate={mutate} />
                ))}
                {col.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#322E2B] p-3 text-[11px] text-[#5C544D]">empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Rollup({ pipelines, entries }: { pipelines: BoardPipeline[]; entries: BoardEntry[] }) {
  // Map each entry's native stage → its universal phase via its pipeline's stages.
  const phaseOf = (e: BoardEntry): string => {
    const p = pipelines.find((p) => p.id === e.pipelineId);
    const st = p?.stages.find((s) => s.key === e.stage);
    return st?.universalPhase ?? "identified";
  };
  const nameOf = (id: string) => pipelines.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {UNIVERSAL_PHASES.map((ph) => {
        const col = entries.filter((e) => phaseOf(e) === ph.key);
        return (
          <div key={ph.key} className="w-[240px] shrink-0">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[12px] font-medium text-[#C9C2BB]">{ph.label}</span>
              <span className="text-[11px] text-[#6F665E]">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((e) => (
                <div key={e.id} className="rounded-lg border border-[#38332F] bg-[#262220] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-white truncate">{e.contact.name}</span>
                    <span className="text-[9px] uppercase tracking-wide text-[#8A8077] bg-[#1C1A19] border border-[#38332F] rounded px-1.5 py-0.5 shrink-0">
                      {nameOf(e.pipelineId)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9C948C] truncate mt-0.5">
                    {[e.contact.title, e.contact.firmName].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ))}
              {col.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#322E2B] p-3 text-[11px] text-[#5C544D]">empty</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
