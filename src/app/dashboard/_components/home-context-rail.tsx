"use client";

import { Sparkles } from "lucide-react";
import {
  type FeedItem,
  TIER_CHIP,
  TIER_LABEL,
  TIER_TEXT,
} from "./home-feed";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function HomeContextRail({
  item,
  onDraft,
}: {
  item: FeedItem | null;
  onDraft: (item: FeedItem) => void;
}) {
  if (!item) {
    return (
      <aside className="sticky top-0 hidden w-[300px] min-w-[300px] shrink-0 flex-col border-l border-white/[0.06] bg-card xl:flex">
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-[11px] text-muted-foreground">
            Select a contact to see context and draft outreach.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-full w-[300px] min-w-[300px] shrink-0 flex-col overflow-hidden border-l border-white/[0.06] bg-card xl:flex">
      {/* Identity header */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
          {initials(item.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {item.name}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {item.title ? `${item.title} · ` : ""}
            {item.firm}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[15px] font-bold leading-none tabular-nums ${TIER_TEXT[item.tier]}`}
          >
            {item.score}
          </span>
          <span
            className={`border px-1 py-px font-mono text-[7px] font-bold uppercase tracking-[0.08em] ${TIER_CHIP[item.tier]}`}
          >
            {TIER_LABEL[item.tier]}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Warm path */}
        <div className="border-b border-white/[0.06] px-3 py-3">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
            Warm Path
          </p>
          <div className="font-mono text-[11px] leading-relaxed">
            {item.chain.map((seg, i) => (
              <span key={`${seg}-${i}`}>
                {i > 0 ? <span className="text-muted-foreground"> → </span> : null}
                <span className="text-primary">{seg}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Affiliations */}
        <div className="border-b border-white/[0.06] px-3 py-3">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
            Affiliations
          </p>
          {item.affiliations.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.affiliations.map((a, i) => (
                <span
                  key={`${a}-${i}`}
                  className="border border-white/[0.12] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              No shared affiliations mapped yet — lead with the firm + role.
            </p>
          )}
        </div>

        {/* Why now */}
        <div className="border-b border-white/[0.06] px-3 py-3">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
            Why Now
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {item.whyNow}
          </p>
        </div>
      </div>

      {/* Draft panel */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
            Draft Outreach
          </span>
          <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.06em] text-muted-foreground/60">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </span>
        </div>
        <button
          onClick={() => onDraft(item)}
          className="flex w-full items-center justify-center gap-1.5 bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
        >
          <Sparkles className="h-3 w-3" />
          Draft outreach
        </button>
        <p className="mt-2 text-[9px] italic leading-snug text-muted-foreground/60">
          You edit before sending — never auto-sent.
        </p>
      </div>
    </aside>
  );
}
