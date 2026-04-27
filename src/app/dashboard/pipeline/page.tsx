"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { GitBranch, ArrowRight, ArrowLeft, Mail, Loader2, X, Copy, Check, AlertTriangle } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { PipelineContact, PipelineResponse } from "@/lib/api";

interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
}
interface EnrichedPipelineContact extends PipelineContact {
  warmPaths?: WarmPath[];
}
interface EnrichedPipelineResponse extends Omit<PipelineResponse, "contacts"> {
  contacts: Record<string, EnrichedPipelineContact[]>;
}

const STAGE_LABELS: Record<string, string> = {
  researched: "RESEARCHED",
  connected: "CONNECTED",
  email_sent: "EMAIL SENT",
  follow_up: "FOLLOW UP",
  responded: "RESPONDED",
  meeting_set: "MEETING SET",
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  researched: "bg-zinc-500/10 border-zinc-500/30 border-t-zinc-500",
  connected: "bg-blue-500/10 border-blue-500/30 border-t-blue-500",
  email_sent: "bg-sky-500/10 border-sky-500/30 border-t-sky-400",
  follow_up: "bg-amber-500/10 border-amber-500/30 border-t-amber-500",
  responded: "bg-green-500/10 border-green-500/30 border-t-green-500",
  meeting_set: "bg-purple-500/10 border-purple-500/30 border-t-purple-500",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  researched: "bg-zinc-500/20 text-zinc-400",
  connected: "bg-blue-500/20 text-blue-400",
  email_sent: "bg-sky-500/20 text-sky-400",
  follow_up: "bg-amber-500/20 text-amber-400",
  responded: "bg-green-500/20 text-green-400",
  meeting_set: "bg-primary/20 text-primary",
};

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIER_BADGE_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function freshnessClass(days: number): string {
  if (days < 7) return "bg-green-400";
  if (days < 21) return "bg-amber-400";
  return "bg-red-400";
}

function DraftModal({
  contact,
  onClose,
}: {
  contact: EnrichedPipelineContact;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/outreach/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: contact.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setError(data.error || data.detail || `HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setSubject(data.subject || "");
        setBody(data.body || "");
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contact.id]);

  const copy = async (text: string, which: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              DRAFT OUTREACH · {contact.name}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Drafting via AI Gateway...
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Error
            </p>
            <p className="mt-1 text-[12px] text-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4 px-5 py-5">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Subject
                </p>
                <button
                  onClick={() => copy(subject, "subject")}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {copied === "subject" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied === "subject" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1 font-mono text-[13px] font-bold text-foreground">
                {subject}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Body
                </p>
                <button
                  onClick={() => copy(body, "body")}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {copied === "body" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied === "body" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-1 whitespace-pre-wrap border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                {body}
              </pre>
            </div>
          </div>
        )}

        <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            onClick={onClose}
            className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineCard({
  contact,
  stageIndex,
  totalStages,
  onMove,
  onDraft,
}: {
  contact: EnrichedPipelineContact;
  stageIndex: number;
  totalStages: number;
  onMove: (contactId: string, direction: "forward" | "backward") => void;
  onDraft: (contact: EnrichedPipelineContact) => void;
}) {
  const days = daysSince(contact.added_at);
  const tier = (contact.tier || "cold").toLowerCase();
  const canAdvance = stageIndex < totalStages - 1;
  const canRegress = stageIndex > 0;

  return (
    <div className="border border-white/[0.06] bg-card px-3 py-2.5 transition-colors hover:border-white/[0.18]">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${freshnessClass(days)}`}
          title={`${days}d since added`}
        />
        <p className="truncate text-[12px] font-bold text-foreground">
          {contact.name}
        </p>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          {days}d
        </span>
      </div>

      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
        {contact.title}
        {contact.title && contact.company_name ? " @ " : ""}
        <span className="text-foreground">{contact.company_name}</span>
      </p>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`text-[12px] font-bold tabular-nums ${TIER_STYLES[tier] || "text-zinc-400"}`}
        >
          {Math.round(contact.total_score)}
        </span>
        <Badge
          variant="outline"
          className={`text-[8px] px-1 py-0 uppercase ${TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.cold}`}
        >
          {contact.tier}
        </Badge>
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[9px] font-bold uppercase tracking-wider text-primary hover:underline"
          >
            LI
          </a>
        )}
      </div>

      {contact.warmPaths && contact.warmPaths.length > 0 && (
        <p
          className="mt-1.5 truncate border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[9px] text-primary"
          title={contact.warmPaths
            .map(
              (wp) =>
                `Via ${wp.intermediaryName} (${wp.intermediaryRelation}) -> ${wp.firmName}`,
            )
            .join(" · ")}
        >
          <span className="text-muted-foreground">via </span>
          {contact.warmPaths[0].intermediaryName}
          {contact.warmPaths.length > 1 && (
            <span className="text-muted-foreground">
              {" "}
              (+{contact.warmPaths.length - 1})
            </span>
          )}
        </p>
      )}

      {contact.affiliations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {contact.affiliations.slice(0, 2).map((a) => (
            <Badge
              key={a}
              variant="outline"
              className="text-[8px] px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30"
            >
              {a}
            </Badge>
          ))}
          {contact.affiliations.length > 2 && (
            <span className="text-[8px] text-muted-foreground/60">
              +{contact.affiliations.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-stretch gap-1">
        {canRegress && (
          <button
            onClick={() => onMove(contact.id, "backward")}
            title="Move back"
            className="border border-white/[0.08] px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-white/[0.24] hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={() => onDraft(contact)}
          className="flex flex-1 items-center justify-center gap-1 border border-primary/30 bg-primary/10 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
        >
          <Mail className="h-3 w-3" />
          Draft
        </button>
        {canAdvance && (
          <button
            onClick={() => onMove(contact.id, "forward")}
            title="Advance"
            className="border border-primary/30 bg-primary px-1.5 py-1 text-white transition-colors hover:bg-primary/80"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [data, setData] = useState<EnrichedPipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftTarget, setDraftTarget] = useState<EnrichedPipelineContact | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pipeline");
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const moveStage = useCallback(
    async (contactId: string, direction: "forward" | "backward") => {
      if (!data) return;
      let currentStage: string | null = null;
      for (const s of data.stages) {
        if ((data.contacts[s] || []).some((c) => c.id === contactId)) {
          currentStage = s;
          break;
        }
      }
      if (!currentStage) return;
      const idx = data.stages.indexOf(currentStage);
      const nextIdx =
        direction === "forward"
          ? Math.min(idx + 1, data.stages.length - 1)
          : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      const nextStage = data.stages[nextIdx];

      // Optimistic update: move the card locally before the refetch lands.
      setData((prev) => {
        if (!prev) return prev;
        const nextContacts = { ...prev.contacts };
        const moving = (nextContacts[currentStage] || []).find(
          (c) => c.id === contactId,
        );
        nextContacts[currentStage] = (nextContacts[currentStage] || []).filter(
          (c) => c.id !== contactId,
        );
        if (moving) {
          nextContacts[nextStage] = [
            { ...moving, stage: nextStage },
            ...(nextContacts[nextStage] || []),
          ];
        }
        return { ...prev, contacts: nextContacts };
      });

      const res = await apiFetch(`/api/pipeline/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.conversion) {
          trackEvent("conversion_tracked", {
            contactId: json.conversion.contactId,
            source: json.conversion.source,
            stage: json.conversion.stage,
            warmPathCount: json.conversion.warmPathCount,
          });
        }
      }
      await fetchPipeline();
    },
    [data, fetchPipeline],
  );

  const overdue = useMemo(() => {
    if (!data) return [];
    const all: Array<{ contact: EnrichedPipelineContact; stage: string; days: number }> = [];
    for (const stage of data.stages) {
      for (const c of data.contacts[stage] || []) {
        const d = daysSince(c.added_at);
        if (d >= 7 && stage !== "responded" && stage !== "meeting_set") {
          all.push({ contact: c, stage, days: d });
        }
      }
    }
    return all.sort((a, b) => b.days - a.days).slice(0, 6);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-full p-5">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="min-h-full p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          PIPELINE
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Active outreach workflow
        </p>
        <div className="mt-4 h-px bg-border" />
        <div className="mt-8 border border-white/[0.06] bg-card p-10 text-center">
          <GitBranch size={32} strokeWidth={1.5} className="mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold text-foreground">Your pipeline is empty</p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Start by discovering and rating contacts, then add your top matches to the outreach pipeline.
          </p>
          <a
            href="/dashboard/discover"
            className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/80"
          >
            Discover Alumni
          </a>
        </div>
      </div>
    );
  }

  const stageCounts: Record<string, number> = {};
  for (const s of data.stages) stageCounts[s] = (data.contacts[s] || []).length;

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            PIPELINE
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Active outreach workflow
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
          <span className="flex items-baseline gap-1">
            <span className="font-bold tabular-nums text-foreground">
              {data.total}
            </span>
            <span className="text-muted-foreground">total</span>
          </span>
          {data.stages.map((s) => (
            <span key={s} className="flex items-baseline gap-1">
              <span className={`font-bold tabular-nums ${STAGE_BADGE_COLORS[s]?.split(" ")[1] || ""}`}>
                {stageCounts[s]}
              </span>
              <span className="text-muted-foreground">{STAGE_LABELS[s]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Overdue strip */}
      {overdue.length > 0 && (
        <div className="mt-3 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Overdue follow-ups · {overdue.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 p-2">
            {overdue.map(({ contact, stage, days }) => (
              <div
                key={contact.id}
                className="flex items-center gap-2 border border-white/[0.06] bg-card px-2 py-1 text-[10px]"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${freshnessClass(days)}`} />
                <span className="font-bold text-foreground">{contact.name}</span>
                <span className="text-muted-foreground">
                  {STAGE_LABELS[stage]} · {days}d
                </span>
                <button
                  onClick={() => setDraftTarget(contact)}
                  className="text-primary hover:underline"
                >
                  draft →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal 6-col kanban */}
      <div className="mt-3 flex-1 overflow-x-auto">
        <div className="grid min-w-[1200px] grid-cols-6 gap-2">
          {data.stages.map((stage, stageIndex) => {
            const contacts = data.contacts[stage] || [];
            return (
              <div key={stage} className="flex flex-col">
                <div
                  className={`flex items-center justify-between border border-t-2 px-3 py-2 ${STAGE_HEADER_COLORS[stage]}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span
                    className={`inline-flex h-4 min-w-[16px] items-center justify-center px-1 text-[9px] font-bold tabular-nums ${STAGE_BADGE_COLORS[stage]}`}
                  >
                    {contacts.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 border border-t-0 border-white/[0.06] bg-card/30 p-2">
                  {contacts.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center border border-dashed border-white/[0.1] py-6">
                      <span className="text-[10px] text-muted-foreground/60">
                        empty
                      </span>
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <PipelineCard
                        key={c.id}
                        contact={c}
                        stageIndex={stageIndex}
                        totalStages={data.stages.length}
                        onMove={moveStage}
                        onDraft={setDraftTarget}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {draftTarget && (
        <DraftModal contact={draftTarget} onClose={() => setDraftTarget(null)} />
      )}
    </div>
  );
}
