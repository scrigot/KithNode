"use client";

import { X, ExternalLink, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TIER_STYLES: Record<string, string> = {
  kith: "bg-amber-300/20 text-amber-300 border-amber-300/30",
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const SCORE_STYLES: Record<string, string> = {
  kith: "text-amber-300",
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
  // Set by the deck payload for contacts resurfaced after a "later" rating.
  deferred?: boolean;
  // Kith & Nodes: owner name when this is a node friend's shared contact.
  viaFriend?: string;
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
  if (value === null || value === undefined || value === "" || value === 0 || value === "0") return null;
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
 * Detail-rich deck card. Surfaces every field the API provides per contact,
 * collapsing empty rows. Every card is fully revealed: the primary action is
 * "Add to pipeline" and the secondary "Skip" advances the deck. `pipelineState`
 * drives the add button's pending/sent feedback.
 */
export function DeckCard({
  contact,
  pipelineState = "idle",
  inFlight = false,
  onSkip,
  onAddToPipeline,
  onAskIntro,
}: {
  contact: DeckContact;
  pipelineState?: "idle" | "pending" | "sent";
  inFlight?: boolean;
  onSkip?: () => void;
  onAddToPipeline?: () => void;
  onAskIntro?: (warmPath: WarmPath) => void;
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
    <div className="flex flex-col border border-white/[0.06] bg-card">
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
        <h3 className="flex items-center gap-1.5 text-lg font-bold text-foreground">
          <a
            href={`/contact/${contact.id}`}
            className="truncate hover:underline hover:decoration-white/40"
          >
            {contact.name}
          </a>
        </h3>
        {contact.deferred && (
          <span className="mt-1 inline-block border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">
            Later
          </span>
        )}
        {(contact.title || contact.firmName) && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {contact.title}
            {sep}
            <span className="font-medium text-foreground">{contact.firmName}</span>
          </p>
        )}

        {/* Kith & Nodes: warm path through a node friend who owns this contact */}
        {contact.viaFriend && (
          <div className="mt-2 inline-flex items-center gap-1 border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
            via {contact.viaFriend}
          </div>
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
            contact.linkedInUrl
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

      {/* ─── Bottom actions ─── Primary: Add to pipeline. Secondary: Skip. ─── */}
      <div className="flex flex-col gap-2 border-t border-white/[0.06] p-3">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={inFlight || pipelineState === "pending"}
            className="flex items-center justify-center gap-1.5 border border-white/[0.12] px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            aria-label={`Skip ${contact.name}`}
          >
            <X className="h-4 w-4" />
            Skip
          </button>
          {contact.linkedInUrl ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onAddToPipeline}
                disabled={pipelineState !== "idle"}
                className={`flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors disabled:cursor-default ${
                  pipelineState === "sent"
                    ? "border border-green-500/30 bg-green-500/10 text-green-400"
                    : pipelineState === "pending"
                      ? "bg-primary/60 text-white"
                      : "bg-primary text-white hover:bg-primary/80"
                }`}
                aria-label={`Add ${contact.name} to pipeline`}
              >
                <Send className="h-4 w-4" />
                {pipelineState === "sent"
                  ? "In pipeline"
                  : pipelineState === "pending"
                    ? "..."
                    : "Add to pipeline"}
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
              onClick={onAddToPipeline}
              disabled={pipelineState !== "idle"}
              className={`flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors disabled:cursor-default ${
                pipelineState === "sent"
                  ? "border border-green-500/30 bg-green-500/10 text-green-400"
                  : pipelineState === "pending"
                    ? "bg-primary/60 text-white"
                    : "bg-primary text-white hover:bg-primary/80"
              }`}
              aria-label={`Add ${contact.name} to pipeline`}
            >
              <Send className="h-4 w-4" />
              {pipelineState === "sent"
                ? "In pipeline"
                : pipelineState === "pending"
                  ? "..."
                  : "Add to pipeline"}
            </button>
          )}
        </div>
        {/* Edit profile: opens /contact/:id?edit=1 in a new tab so deck position is preserved. */}
        <a
          href={`/contact/${contact.id}?edit=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 border border-white/[0.12] py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Edit profile
        </a>
      </div>
    </div>
  );
}
