"use client";

import { Lock, X, Star, ExternalLink, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const SCORE_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

export interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
}

export interface DeckContact {
  id: string;
  name: string;
  title: string;
  firmName: string;
  email: string;
  linkedInUrl: string;
  education: string;
  location: string;
  warmthScore: number;
  tier: string;
  affiliations: string;
  source: string;
  warmPaths?: WarmPath[];
  isRedacted?: boolean;
  // Optional enrichment fields — surfaced only when the payload carries them.
  track?: string;
  role?: string;
  graduationYear?: string | number;
  hometown?: string;
  degrees?: string;
  concentration?: string;
}

/** One labelled value cell. Renders nothing when the value is empty so blank
 * rows never appear in the dense two-column body. */
function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-[12px] text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  alumni: "Alumni",
  professor: "Professor",
  student: "Active student",
};

/**
 * Detail-rich Tinder-style card. Surfaces every field the API provides per
 * contact, collapsing empty rows. Redacted (locked) contacts keep the blurred
 * name treatment from the shared pool and swap the LinkedIn link for an
 * import-to-unlock affordance.
 *
 * `phase`:
 *   - "rate":    bottom buttons are SKIP / HIGH VALUE (the primary deck loop).
 *   - "confirm": post high-value reveal — the contact is unlocked and shown
 *                with KEEP BROWSING / SEND TO PIPELINE.
 */
export function DeckCard({
  contact,
  phase,
  pipelineState = "idle",
  inFlight = false,
  onSkip,
  onHighValue,
  onAskIntro,
  onKeepBrowsing,
  onSendToPipeline,
}: {
  contact: DeckContact;
  phase: "rate" | "confirm";
  pipelineState?: "idle" | "pending" | "sent";
  inFlight?: boolean;
  onSkip?: () => void;
  onHighValue?: () => void;
  onAskIntro?: (warmPath: WarmPath) => void;
  onKeepBrowsing?: () => void;
  onSendToPipeline?: () => void;
}) {
  const isProfessor = contact.source === "professor";
  const tierKey = (contact.tier || "cold").toLowerCase();
  const affiliationList = contact.affiliations
    ? contact.affiliations.split(",").map((a) => a.trim()).filter(Boolean)
    : [];
  const warmPaths = contact.warmPaths ?? [];
  const sourceLabel = SOURCE_LABELS[contact.source] ?? contact.source;
  const sep = contact.title && contact.firmName ? (isProfessor ? " · " : " @ ") : "";

  return (
    <div
      className={`flex flex-col border bg-card ${
        phase === "confirm"
          ? "border-primary/40 shadow-sm shadow-primary/10"
          : "border-white/[0.06]"
      }`}
    >
      {/* ─── Header: tier + score (the prominent warmth number) ─── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[9px] font-bold ${TIER_STYLES[tierKey] || TIER_STYLES.cold}`}
          >
            {(contact.tier || "COLD").toUpperCase()}
          </Badge>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {sourceLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Warmth
          </span>
          <span
            className={`text-3xl font-bold tabular-nums leading-none ${SCORE_STYLES[tierKey] || "text-zinc-400"}`}
          >
            {Math.round(contact.warmthScore || 0)}
          </span>
        </div>
      </div>

      {/* ─── Identity ─── */}
      <div className="border-b border-white/[0.06] px-5 py-4">
        {phase === "confirm" && (
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-primary/70">
            Added to your network
          </p>
        )}
        <h3
          className={`flex items-center gap-1.5 text-lg font-bold ${
            contact.isRedacted ? "text-muted-foreground/80" : "text-foreground"
          }`}
        >
          {contact.isRedacted && <Lock className="h-4 w-4 shrink-0 opacity-70" />}
          {contact.isRedacted ? (
            <span className="truncate">{contact.name}</span>
          ) : (
            <a
              href={`/contact/${contact.id}`}
              className="truncate hover:underline hover:decoration-white/40"
            >
              {contact.name}
            </a>
          )}
        </h3>
        {contact.isRedacted && (
          <span className="mt-1 inline-block border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">
            Blurred · High value to unlock
          </span>
        )}
        {(contact.title || contact.firmName) && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {contact.title}
            {sep}
            <span className="font-medium text-foreground">{contact.firmName}</span>
          </p>
        )}

        {/* Track + role chips */}
        {(contact.track || contact.role) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.track && (
              <span className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                {contact.track}
              </span>
            )}
            {contact.role && (
              <span className="border border-white/[0.12] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {contact.role}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Dense two-column detail body (single column on mobile) ─── */}
      <div className="grid flex-1 grid-cols-1 gap-x-5 gap-y-3 px-5 py-4 sm:grid-cols-2">
        <Field label="Education" value={contact.education} />
        <Field label="Graduation" value={contact.graduationYear} />
        <Field label="Degrees" value={contact.degrees} />
        <Field label="Concentration" value={contact.concentration} />
        <Field label="Location" value={contact.location} />
        <Field label="Hometown" value={contact.hometown} />
        <Field label="Source" value={sourceLabel} />
        <Field
          label="LinkedIn"
          value={
            contact.isRedacted
              ? undefined
              : contact.linkedInUrl
                ? contact.linkedInUrl.replace(/^https?:\/\/(www\.)?/, "")
                : undefined
          }
          mono
        />
      </div>

      {/* ─── Affiliation / signal chips ─── */}
      {affiliationList.length > 0 && (
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Signals
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {affiliationList.map((a) => (
              <span
                key={a}
                className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Warm paths ("via <intermediary> at <firm>") ─── */}
      {warmPaths.length > 0 && (
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Warm paths
          </p>
          <div className="mt-1.5 space-y-1">
            {warmPaths.map((wp, i) => (
              <button
                key={`${wp.intermediaryName}-${i}`}
                type="button"
                onClick={() => onAskIntro && onAskIntro(wp)}
                disabled={!onAskIntro}
                title={`Via ${wp.intermediaryName} (${wp.intermediaryRelation}) -> ${wp.title} at ${wp.firmName}`}
                className="block w-full truncate border border-primary/20 bg-primary/5 px-2 py-1.5 text-left font-mono text-[11px] text-primary enabled:hover:bg-primary/10 disabled:cursor-default"
              >
                <span className="text-muted-foreground">via </span>
                {wp.intermediaryName}
                <span className="text-muted-foreground"> ({wp.intermediaryRelation})</span>
                <span className="text-muted-foreground"> -&gt; </span>
                {wp.title} at {wp.firmName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom actions ─── */}
      {phase === "rate" ? (
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={inFlight}
            className="flex items-center justify-center gap-1.5 border border-white/[0.12] py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            aria-label={`Skip ${contact.name}`}
          >
            <X className="h-4 w-4" />
            Skip
          </button>
          <button
            type="button"
            onClick={onHighValue}
            disabled={inFlight}
            className="flex items-center justify-center gap-1.5 bg-primary py-3 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
            aria-label={`Rate ${contact.name} high value`}
          >
            <Star className="h-4 w-4" />
            High value
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
          <button
            type="button"
            onClick={onKeepBrowsing}
            disabled={pipelineState === "pending"}
            className="flex items-center justify-center gap-1.5 border border-white/[0.12] py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            Keep browsing
          </button>
          {!contact.isRedacted && contact.linkedInUrl ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onSendToPipeline}
                disabled={pipelineState !== "idle"}
                className={`flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors disabled:cursor-default ${
                  pipelineState === "sent"
                    ? "border border-green-500/30 bg-green-500/10 text-green-400"
                    : pipelineState === "pending"
                      ? "bg-primary/60 text-white"
                      : "bg-primary text-white hover:bg-primary/80"
                }`}
              >
                <Send className="h-4 w-4" />
                {pipelineState === "sent"
                  ? "In pipeline"
                  : pipelineState === "pending"
                    ? "..."
                    : "Pipeline"}
              </button>
              <a
                href={contact.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center border border-white/[0.12] px-3 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="View LinkedIn profile"
                title="View LinkedIn profile"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSendToPipeline}
              disabled={pipelineState !== "idle"}
              className={`flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors disabled:cursor-default ${
                pipelineState === "sent"
                  ? "border border-green-500/30 bg-green-500/10 text-green-400"
                  : pipelineState === "pending"
                    ? "bg-primary/60 text-white"
                    : "bg-primary text-white hover:bg-primary/80"
              }`}
            >
              <Send className="h-4 w-4" />
              {pipelineState === "sent"
                ? "In pipeline"
                : pipelineState === "pending"
                  ? "..."
                  : "Send to pipeline"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
