"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RankedContact } from "@/lib/api";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border-red-500/20",
  warm: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  monitor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  cold: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const TIER_LABELS: Record<string, string> = {
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
        {Math.round(value)}
      </span>
    </div>
  );
}

export function WarmSignalCard({
  contact,
  onDraftOutreach,
  onAddToPipeline,
}: {
  contact: RankedContact;
  onDraftOutreach?: (id: number) => void;
  onAddToPipeline?: (id: number) => void;
}) {
  const tier = contact.score.tier;
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.cold;

  return (
    <div className="group border border-white/[0.06] bg-bg-card p-4 transition-all hover:border-white/[0.12] hover:bg-bg-hover">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Name + Company */}
        <div className="min-w-0 flex-1">
          <Link
            href={`/contact/${contact.id}`}
            className="block hover:text-primary"
          >
            <h3 className="truncate text-sm font-bold text-foreground">
              {contact.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {contact.title}
              {contact.title && contact.company.name ? " @ " : ""}
              {contact.company.name}
            </p>
          </Link>

          {/* WHY NOW */}
          {contact.why_now && (
            <p className="mt-1 text-[10px] text-accent-blue">
              {contact.why_now}
            </p>
          )}

          {/* Warm Path */}
          {contact.warm_path && (
            <p className="mt-0.5 text-[10px] text-accent-blue">
              {contact.warm_path}
            </p>
          )}

          {/* Meta: education, location, industry */}
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
          </div>
        </div>

        {/* Right: Score + Tier badge */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-right">
            <span className="text-lg font-bold tabular-nums text-foreground">
              {Math.round(contact.score.total_score)}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold tracking-wider ${tierStyle}`}
          >
            {TIER_LABELS[tier] || "COLD"}
          </Badge>
        </div>
      </div>

      {/* Score breakdown bars */}
      <div className="mt-3 space-y-1">
        <ScoreBar
          label="FIT"
          value={contact.score.fit_score}
          max={50}
          color="bg-accent-blue"
        />
        <ScoreBar
          label="SIG"
          value={contact.score.signal_score}
          max={30}
          color="bg-accent-orange"
        />
        <ScoreBar
          label="ENG"
          value={contact.score.engagement_score}
          max={20}
          color="bg-accent-green"
        />
      </div>

      {/* Bottom row: Affiliations + Actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(contact as unknown as { affiliations?: { name: string }[] })
            .affiliations?.map((aff: { name: string }) => (
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
          <a
            href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.company.name)}&network=%5B%22F%22%5D`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-accent-blue"
            title="Check mutual connections"
          >
            MUTUAL
          </a>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-accent-blue"
            >
              LI
            </a>
          )}
          {onAddToPipeline && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] text-accent-amber hover:bg-accent-amber/20"
              onClick={(e) => {
                e.preventDefault();
                onAddToPipeline(contact.id);
              }}
            >
              + PIPELINE
            </Button>
          )}
          {onDraftOutreach && (
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
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
