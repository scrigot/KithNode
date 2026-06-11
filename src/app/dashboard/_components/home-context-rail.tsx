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
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {item.name}
            </p>
            {item.linkedInUrl &&
              !item.isRedacted &&
              !item.linkedInUrl.includes("█") &&
              item.linkedInUrl.includes("linkedin.com") && (
                <a
                  href={item.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-slate-500 transition-colors hover:text-accent-teal"
                  title="LinkedIn profile"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>
                </a>
              )}
          </div>
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
