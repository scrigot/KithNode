"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { GitBranch, ArrowRight, ArrowLeft, Mail, Loader2, X, Copy, Check, AlertTriangle, Plus, Trash2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/posthog";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { PipelineContact, PipelineResponse, PipelineStageMeta } from "@/lib/api";

// Per-stage colors keyed by stage key (main's recruiting palette). Unknown keys
// fall back to the per-pipeline color token carried on the stage record.
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

// Fallback color tokens for stages whose key isn't in the recruiting palette
// (custom pipelines carry a `color` token name on each stage record).
const STAGE_COLOR_TOKEN: Record<string, { header: string; badge: string }> = {
  zinc: { header: "bg-zinc-500/10 border-zinc-500/30 border-t-zinc-500", badge: "bg-zinc-500/20 text-zinc-400" },
  blue: { header: "bg-blue-500/10 border-blue-500/30 border-t-blue-500", badge: "bg-blue-500/20 text-blue-400" },
  sky: { header: "bg-sky-500/10 border-sky-500/30 border-t-sky-400", badge: "bg-sky-500/20 text-sky-400" },
  amber: { header: "bg-amber-500/10 border-amber-500/30 border-t-amber-500", badge: "bg-amber-500/20 text-amber-400" },
  green: { header: "bg-green-500/10 border-green-500/30 border-t-green-500", badge: "bg-green-500/20 text-green-400" },
  teal: { header: "bg-primary/10 border-primary/30 border-t-primary", badge: "bg-primary/20 text-primary" },
};

function stageHeaderClass(stage: PipelineStageMeta): string {
  return STAGE_HEADER_COLORS[stage.key] || STAGE_COLOR_TOKEN[stage.color]?.header || STAGE_COLOR_TOKEN.zinc.header;
}
function stageBadgeClass(stage: PipelineStageMeta): string {
  return STAGE_BADGE_COLORS[stage.key] || STAGE_COLOR_TOKEN[stage.color]?.badge || STAGE_COLOR_TOKEN.zinc.badge;
}

const TIER_STYLES: Record<string, string> = {
  kith: "text-amber-300",
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIER_BADGE_STYLES: Record<string, string> = {
  kith: "bg-amber-300/20 text-amber-300 border-amber-300/30",
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

function freshnessClass(days: number | null): string {
  if (days === null) return "bg-zinc-500";
  if (days < 7) return "bg-green-400";
  if (days < 21) return "bg-amber-400";
  return "bg-red-400";
}

function DraftModal({ contact, onClose }: { contact: PipelineContact; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
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
        if (res.status === 402) {
          if (!cancelled) setUpgradeRequired(true);
          return;
        }
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
    return () => { cancelled = true; };
  }, [contact.id]);

  const copy = async (text: string, which: "subject" | "body") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">DRAFT OUTREACH · {contact.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Drafting via AI Gateway...
          </div>
        )}
        {!loading && upgradeRequired && (
          <div className="px-5 py-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">Pro Feature</p>
            <p className="mt-2 text-[13px] text-foreground">AI outreach drafts require a KithNode Pro subscription.</p>
            <a href="/dashboard/billing" className="mt-3 inline-block border border-accent-teal bg-accent-teal/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal hover:text-white">View Plans →</a>
          </div>
        )}
        {!loading && !upgradeRequired && error && (
          <div className="px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Error</p>
            <p className="mt-1 text-[12px] text-foreground">{error}</p>
          </div>
        )}
        {!loading && !upgradeRequired && !error && (
          <div className="space-y-4 px-5 py-5">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Subject</p>
                <button onClick={() => copy(subject, "subject")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  {copied === "subject" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === "subject" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1 font-mono text-[13px] font-bold text-foreground">{subject}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Body</p>
                <button onClick={() => copy(body, "body")} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  {copied === "body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === "body" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-1 whitespace-pre-wrap border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">{body}</pre>
            </div>
          </div>
        )}
        <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
          <button onClick={onClose} className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]">CLOSE</button>
        </div>
      </div>
    </div>
  );
}

function AddContactModal({ pipelineId, pipelineName, onClose, onAdded }: { pipelineId: string; pipelineName: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [firmName, setOrganization] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/pipeline/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, firmName, title, pipelineId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || `HTTP ${res.status}`); return; }
      onAdded();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<[string, string, (v: string) => void, string]> = [
    ["Name", name, setName, "Dr. Anil Gupta"],
    ["Organization", firmName, setOrganization, "UNC Robotics Lab"],
    ["Title", title, setTitle, "CS Faculty"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md border border-primary/30 bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">Add contact · {pipelineName}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {fields.map(([label, val, setter, ph]) => (
            <label key={label} className="block">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
              <input value={val} onChange={(e) => setter(e.target.value)} placeholder={ph} className="mt-1 w-full border border-white/[0.12] bg-black/40 px-3 py-2 text-[13px] text-foreground outline-none focus-visible:border-primary" />
            </label>
          ))}
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
          <button onClick={onClose} className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 border border-primary/30 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80 disabled:opacity-50">{saving ? "Adding…" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ contact, isAll, isFirst, isLast, onMove, onDraft, onRemove }: {
  contact: PipelineContact;
  isAll: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (c: PipelineContact, direction: "forward" | "backward") => void;
  onDraft: (c: PipelineContact) => void;
  onRemove: (c: PipelineContact) => void;
}) {
  const tier = (contact.tier || "cold").toLowerCase();
  const hasScore = (contact.total_score || 0) > 0;
  const days = contact.daysSinceTouch;

  // Two-click remove: idle → armed (3s timeout) → confirmed.
  const [removeState, setRemoveState] = useState<"idle" | "armed">("idle");
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (removeState !== "armed") return;
    removeTimerRef.current = setTimeout(() => setRemoveState("idle"), 3000);
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, [removeState]);

  function handleRemoveClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (removeState === "idle") {
      setRemoveState("armed");
    } else {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      setRemoveState("idle");
      onRemove(contact);
    }
  }

  return (
    <div className="border border-white/[0.06] bg-card px-3 py-3 transition-colors hover:border-white/[0.18]">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${freshnessClass(days)}`}
          title={days === null ? "no touch yet" : `${days}d since touch`}
        />
        <Link
          href={`/contact/${contact.id}`}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 break-words text-[13px] font-bold leading-snug text-foreground hover:underline hover:decoration-white/40"
        >
          {contact.name}
        </Link>
        {isAll && contact.pipelineKind ? (
          <span className="ml-auto border border-white/[0.12] px-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            {contact.pipelineKind.slice(0, 4)}
          </span>
        ) : (
          days !== null && (
            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">{days}d</span>
          )
        )}
      </div>

      <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground">
        {contact.title}
        {contact.title && contact.company_name ? " @ " : ""}
        <span className="text-foreground">{contact.company_name}</span>
      </p>

      <div className="mt-1.5 flex items-center gap-1.5">
        {hasScore ? (
          <>
            <span className={`text-[12px] font-bold tabular-nums ${TIER_STYLES[tier] || "text-zinc-400"}`}>
              {Math.round(contact.total_score)}
            </span>
            <Badge
              variant="outline"
              className={`text-[8px] px-1 py-0 uppercase ${TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.cold}`}
            >
              {contact.tier}
            </Badge>
          </>
        ) : (
          // Score-0 (manual contact): days-since-touch is the primary metric, no 0·COLD chip.
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">↻ {days === null ? "new" : `${days}d since touch`}</span>
        )}
        {contact.linkedin_url &&
          !contact.linkedin_url.includes("█") &&
          contact.linkedin_url.includes("linkedin.com") && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-slate-500 transition-colors hover:text-accent-teal"
              title="LinkedIn profile"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>
            </a>
          )}
        {isAll && contact.nativeStageLabel && (
          <span className={`text-[8px] uppercase tracking-wider text-muted-foreground/60 ${contact.linkedin_url ? "" : "ml-auto"}`}>
            {contact.nativeStageLabel}
          </span>
        )}
      </div>

      {contact.warmPaths && contact.warmPaths.length > 0 && (
        <p className="mt-1.5 break-words border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[9px] leading-snug text-primary">
          <span className="text-muted-foreground">via </span>
          {contact.warmPaths[0].intermediaryName}
          {contact.warmPaths.length > 1 && (
            <span className="text-muted-foreground"> (+{contact.warmPaths.length - 1})</span>
          )}
        </p>
      )}

      {contact.affiliations.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {contact.affiliations.map((a) => (
            <Badge
              key={a}
              variant="outline"
              className="text-[8px] px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30"
            >
              {a}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-stretch gap-1">
        {!isFirst && (
          <button
            onClick={() => onMove(contact, "backward")}
            title="Move back"
            aria-label="Move back"
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
        {!isLast && (
          <button
            onClick={() => onMove(contact, "forward")}
            title="Advance"
            aria-label="Advance"
            className="border border-primary/30 bg-primary px-1.5 py-1 text-white transition-colors hover:bg-primary/80"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {/* Two-click remove from pipeline */}
        {removeState === "armed" ? (
          <button
            onClick={handleRemoveClick}
            className="border border-red-500/30 px-1.5 py-1 text-[9px] font-bold text-red-400 transition-colors hover:bg-red-500/10"
          >
            CONFIRM?
          </button>
        ) : (
          <button
            onClick={handleRemoveClick}
            title="Remove from pipeline"
            aria-label="Remove from pipeline"
            className="flex items-center px-1 text-muted-foreground/40 transition-colors hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [active, setActive] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [draftTarget, setDraftTarget] = useState<PipelineContact | null>(null);
  const [addingTo, setAddingTo] = useState<{ id: string; name: string } | null>(null);

  const fetchPipeline = useCallback(async (pipeline: string) => {
    try {
      const res = await apiFetch(`/api/pipeline?pipeline=${encodeURIComponent(pipeline)}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      Sentry.captureException(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPipeline(active); }, [active, fetchPipeline]);

  const switchTab = useCallback((id: string, label: string) => {
    setActive(id);
    trackEvent("pipeline_viewed", { pipeline: id, label });
  }, []);

  const moveStage = useCallback(
    async (contact: PipelineContact, direction: "forward" | "backward") => {
      const res = await apiFetch(`/api/pipeline/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, pipelineId: contact.pipelineId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.conversion) {
          trackEvent("conversion_tracked", {
            contactId: json.conversion.contactId,
            source: json.conversion.source,
            stage: json.conversion.stage,
            warmPathCount: json.conversion.warmPathCount,
            pipelineKind: json.conversion.pipelineKind,
          });
        }
      }
      await fetchPipeline(active);
    },
    [active, fetchPipeline],
  );

  const removeContact = useCallback(
    async (contact: PipelineContact) => {
      const res = await apiFetch(
        `/api/pipeline/${contact.id}?pipelineId=${encodeURIComponent(contact.pipelineId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        trackEvent("pipeline_removed", { contactId: contact.id, pipelineId: contact.pipelineId });
      }
      await fetchPipeline(active);
    },
    [active, fetchPipeline],
  );

  const columns: PipelineStageMeta[] = useMemo(() => data?.stages || [], [data]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const col of columns) m[col.key] = (data?.contacts[col.key] || []).length;
    return m;
  }, [columns, data]);

  if (loading) {
    return (
      <div className="min-h-full p-5">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse bg-muted" />)}
        </div>
      </div>
    );
  }

  const pipelines = data?.pipelines || [];
  const activeLabel = active === "all" ? "All" : pipelines.find((p) => p.id === active)?.name || "Pipeline";

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* page title reflects the active pipeline (trunk test) */}
      <h1 className="text-sm font-bold uppercase tracking-wider text-primary">
        My Pipelines <span className="font-medium text-muted-foreground">· {activeLabel}</span>
      </h1>

      {/* tab switcher */}
      <div className="mt-3 flex items-end gap-0.5 overflow-x-auto border-b border-white/[0.06]" role="tablist" aria-label="Pipelines">
        {[{ id: "all", name: "All", count: data?.total || 0 }, ...pipelines].map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={active === p.id}
            onClick={() => switchTab(p.id, p.name)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 ${active === p.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <span className="text-[13px] font-semibold uppercase tracking-wide">{p.name}</span>
            <span className={`px-1.5 text-[10px] font-bold tabular-nums ${active === p.id ? "bg-primary/20 text-primary" : "bg-white/[0.07] text-muted-foreground"}`}>{p.count}</span>
          </button>
        ))}
        {active !== "all" && (
          <button onClick={() => setAddingTo({ id: active, name: activeLabel })} className="ml-auto flex items-center gap-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80">
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {/* GOING COLD rail — rendered ONLY when non-empty (no "0 overdue" noise) */}
      {data && data.goingCold.length > 0 && (
        <div className="mt-3 border border-amber-500/30 bg-amber-500/5" role="region" aria-label="Going cold">
          <div className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Going cold · {data.goingCold.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 p-2">
            {data.goingCold.map((c) => (
              <div key={`${c.id}-${c.pipelineId}`} className="flex items-center gap-2 border border-white/[0.06] bg-card px-2 py-1 text-[10px]">
                <span className={`h-1.5 w-1.5 rounded-full ${freshnessClass(c.daysSinceTouch)}`} />
                <span className="font-bold text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.pipelineKind?.slice(0, 4)} · {c.nativeStageLabel} · {c.daysSinceTouch}d</span>
                <button onClick={() => setDraftTarget(c)} className="text-primary hover:underline">draft →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* empty state */}
      {data && data.total === 0 && active === "all" && (
        <div className="mt-8 border border-white/[0.06] bg-card p-10 text-center">
          <GitBranch size={32} strokeWidth={1.5} className="mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold text-foreground">No pipelines yet</p>
          <p className="mt-2 text-[12px] text-muted-foreground">Seed your Funding, Professors, and Work pipelines to start tracking.</p>
        </div>
      )}

      {/* board: responsive — horizontal columns on desktop, single stacked list on mobile */}
      {columns.length > 0 && (
        <div className="mt-3 flex-1 overflow-x-auto">
          <div className="flex flex-col gap-2 md:grid md:min-w-[1000px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }} role="list">
            {columns.map((stage, idx) => {
              const items = data?.contacts[stage.key] || [];
              return (
                <div key={stage.key} className="flex flex-col" role="listitem">
                  <div className={`sticky top-0 z-[1] flex items-center justify-between border border-t-2 px-3 py-2 ${stageHeaderClass(stage)}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stage.label}</span>
                    <span className={`inline-flex h-4 min-w-[16px] items-center justify-center px-1 text-[9px] font-bold tabular-nums ${stageBadgeClass(stage)}`}>{counts[stage.key] || 0}</span>
                  </div>
                  <div className="flex max-h-[calc(100vh-220px)] flex-1 flex-col gap-2 overflow-y-auto border border-t-0 border-white/[0.06] bg-card/30 p-2">
                    {items.length === 0 ? (
                      <div className="hidden flex-1 flex-col items-center justify-center gap-2 border border-dashed border-white/[0.1] py-6 md:flex">
                        <span className="text-[10px] text-muted-foreground/60">empty</span>
                        {active !== "all" && idx === 0 && (
                          <button onClick={() => setAddingTo({ id: active, name: activeLabel })} className="border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">+ Add contact</button>
                        )}
                      </div>
                    ) : (
                      items.map((contact) => (
                        <PipelineCard
                          key={`${contact.id}-${contact.pipelineId}`}
                          contact={contact}
                          isAll={active === "all"}
                          isFirst={idx === 0}
                          isLast={idx === columns.length - 1}
                          onMove={moveStage}
                          onDraft={setDraftTarget}
                          onRemove={removeContact}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {draftTarget && <DraftModal contact={draftTarget} onClose={() => setDraftTarget(null)} />}
      {addingTo && <AddContactModal pipelineId={addingTo.id} pipelineName={addingTo.name} onClose={() => setAddingTo(null)} onAdded={() => fetchPipeline(active)} />}
    </div>
  );
}
