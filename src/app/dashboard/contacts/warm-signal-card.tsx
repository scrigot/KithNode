"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Star, Trash2 } from "lucide-react";
import { CreditCost } from "@/components/credit-cost";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RankedContact } from "@/lib/api";
import { composeWhyNow } from "@/lib/why-now";

type WarmSignalContact = RankedContact & { isRedacted?: boolean };

const TIER_STYLES: Record<string, string> = {
  kith: "bg-amber-400/15 text-amber-300 border-amber-400/40",
  hot: "bg-red-500/15 text-red-400 border-red-500/20",
  warm: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  monitor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  cold: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const TIER_LABELS: Record<string, string> = {
  kith: "KITH",
  hot: "HOT",
  warm: "WARM",
  monitor: "MONITOR",
  cold: "COLD",
};

const AFFILIATION_COLORS: Record<string, string> = {
  "Chi Phi": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Kenan-Flagler": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "UNC Alumni": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "UNC Faculty": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Duke: "bg-blue-700/20 text-blue-300 border-blue-700/30",
  "NC Local": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Consulting Background": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-8 text-right text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-muted-foreground">
        {Math.min(Math.round(value), max)}
      </span>
    </div>
  );
}

export function WarmSignalCard({
  contact,
  onDraftOutreach,
  onAddToPipeline,
  pipelineAdded,
  onDelete,
}: {
  contact: WarmSignalContact;
  onDraftOutreach?: (id: string) => void;
  onAddToPipeline?: (id: string) => Promise<void> | void;
  pipelineAdded?: boolean;
  onDelete?: (id: string) => void;
}) {
  const tier = contact.score.tier;
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.cold;
  const isRedacted = !!contact.isRedacted;
  const needsInfo = !!(contact as unknown as { needs_info?: boolean }).needs_info;

  // Defensive casts for relationship fields that may not yet be in RankedContact type.
  const contactRel = contact as unknown as Record<string, unknown>;
  const isFriend = typeof contactRel.is_friend === "boolean" ? contactRel.is_friend : false;
  const speakFrequency = typeof contactRel.speak_frequency === "string" ? contactRel.speak_frequency : "";
  const lastSpokenAt = typeof contactRel.last_spoken_at === "string" ? contactRel.last_spoken_at : "";
  const isDormant = typeof contactRel.dormant === "boolean" ? contactRel.dormant : false;
  const spokeDays =
    lastSpokenAt
      ? Math.floor((Date.now() - new Date(lastSpokenAt).getTime()) / 86_400_000)
      : null;

  const [pipelineError, setPipelineError] = useState<string | null>(null);

  async function handleAddToPipeline() {
    if (!onAddToPipeline) return;
    setPipelineError(null);
    try {
      await onAddToPipeline(contact.id);
    } catch {
      setPipelineError("Failed to add to pipeline");
    }
  }

  // Two-click delete: null = idle, "armed" = first click done (awaiting confirm).
  const [deleteState, setDeleteState] = useState<"idle" | "armed">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset armed state on any outside click or after 3s.
  useEffect(() => {
    if (deleteState !== "armed") return;
    resetTimerRef.current = setTimeout(() => setDeleteState("idle"), 3000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [deleteState]);

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleteState === "idle") {
      setDeleteState("armed");
    } else {
      // Second click — confirmed.
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setDeleteState("idle");
      onDelete?.(contact.id);
    }
  }

  // Compose Why Now from real affiliations instead of the raw CSV string.
  const whyNowText = contact.affiliations?.length
    ? composeWhyNow({
        affiliations: contact.affiliations.map((a) => a.name),
        title: contact.title,
        firm: contact.company.name,
        tier: contact.score.tier,
      })
    : contact.why_now;

  const NameBlock = (
    <>
      <h3
        className={`flex items-center gap-1 truncate text-sm font-bold ${
          isRedacted ? "text-muted-foreground/80" : "text-foreground"
        }`}
      >
        {isRedacted && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
        <span className="truncate">{contact.name}</span>
      </h3>
      {isRedacted && (
        <span className="mt-0.5 inline-block border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">
          Blurred · Import to unlock
        </span>
      )}
      <p className="truncate text-xs text-muted-foreground">
        {contact.title}
        {contact.title && contact.company.name ? " @ " : ""}
        {contact.company.name}
      </p>
    </>
  );

  return (
    <div className="group border border-white/[0.06] bg-bg-card p-4 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-bg-hover hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Name + Company */}
        <div className="min-w-0 flex-1">
          {isRedacted ? (
            <div className="block">{NameBlock}</div>
          ) : (
            <Link
              href={`/contact/${contact.id}`}
              className="block hover:text-primary"
              onClick={() => {
                sessionStorage.setItem(
                  "warm-signals-scroll",
                  String(window.scrollY),
                );
              }}
            >
              {NameBlock}
            </Link>
          )}

          {/* WHY NOW — composed from real affiliations */}
          {whyNowText && (
            <p className="mt-1 text-[10px] text-accent-blue">
              {whyNowText}
            </p>
          )}

          {/* Warm Path */}
          {contact.warm_path && (
            <p className="mt-0.5 text-[10px] text-accent-blue">
              {contact.warm_path}
            </p>
          )}

          {/* Meta: education, location, industry, last spoken */}
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            {contact.education && (
              <span>{contact.education}</span>
            )}
            {contact.company.location && (
              <span>{contact.company.location}</span>
            )}
            {contact.company.industry_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="uppercase tracking-wider">
                {tag}
              </span>
            ))}
            {spokeDays !== null && spokeDays >= 0 && (
              <span className="text-muted-foreground/60">
                spoke {spokeDays}d ago
              </span>
            )}
          </div>
        </div>

        {/* Right: Score + Tier badge + Friend indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-right">
            {needsInfo ? (
              <span className="text-lg font-bold tabular-nums text-muted-foreground/50">—</span>
            ) : (
              <>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {Math.round(contact.score.total_score)}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isFriend && (
              <Star className="h-3 w-3 fill-accent-teal text-accent-teal" aria-label="Friend" />
            )}
            {needsInfo ? (
              <span className="border border-dashed border-slate-500/40 bg-transparent text-slate-400 text-[10px] font-bold tracking-wider px-1.5 py-0.5">
                NEEDS INFO
              </span>
            ) : (
              <Badge
                variant="outline"
                className={`text-[10px] font-bold tracking-wider ${tierStyle}`}
              >
                {TIER_LABELS[tier] || "COLD"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mt-3 space-y-1">
        <ScoreBar
          label="FIT"
          value={contact.score.fit_score}
          max={100}
          color="bg-accent-blue"
        />
        {/* Relationship line */}
        {(isFriend || speakFrequency || spokeDays !== null || isDormant) && (
          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground">
            {isFriend && (
              <Star className="h-3 w-3 fill-accent-teal text-accent-teal" aria-label="Friend" />
            )}
            {speakFrequency && <span>{speakFrequency}</span>}
            {spokeDays !== null && spokeDays >= 0 && (
              <span>spoke {spokeDays}d ago</span>
            )}
            {isDormant && (
              <span className="border border-amber-400/40 bg-amber-400/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300">
                DORMANT
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom row: Affiliations + Actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {contact.affiliations?.map((aff) => (
            <Badge
              key={aff.name}
              variant="outline"
              className={`text-[10px] ${AFFILIATION_COLORS[aff.name] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}
            >
              {aff.name}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isRedacted ? (
            <span
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60"
              title="Import contacts to reveal this profile"
            >
              <Lock className="h-3 w-3" />
              IMPORT TO REVEAL
            </span>
          ) : (
            <>
              {contact.company.name && (
                <a
                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.company.name)}&network=%5B%22F%22%5D`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted-foreground hover:text-accent-blue"
                  title="Check mutual connections"
                >
                  MUTUAL
                </a>
              )}
              {contact.linkedin_url &&
                !contact.linkedin_url.includes("█") &&
                contact.linkedin_url.includes("linkedin.com") && (
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-500 transition-colors hover:text-accent-teal"
                    title="LinkedIn profile"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>
                  </a>
                )}
              {onAddToPipeline && (
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-6 px-2 text-[10px] ${
                    pipelineAdded
                      ? "text-green-400 border-green-500/30 cursor-default"
                      : pipelineError
                        ? "text-red-400 border-red-500/30"
                        : "text-accent-amber hover:bg-accent-amber/20"
                  }`}
                  disabled={pipelineAdded}
                  title={pipelineError ?? undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!pipelineAdded) handleAddToPipeline();
                  }}
                >
                  {pipelineAdded ? "IN PIPELINE" : pipelineError ? "FAILED" : "+ PIPELINE"}
                </Button>
              )}
              {onDraftOutreach && process.env.NEXT_PUBLIC_ENABLE_OUTREACH_DRAFTS !== 'false' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    onDraftOutreach(contact.id);
                  }}
                >
                  DRAFT
                  <CreditCost action="draft" className="ml-1" />
                </Button>
              )}
              {onDelete && (
                deleteState === "armed" ? (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="h-6 border border-red-500/30 px-2 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    CONFIRM?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex h-6 items-center px-1 text-muted-foreground/40 transition-colors hover:text-red-400"
                    title="Delete contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
