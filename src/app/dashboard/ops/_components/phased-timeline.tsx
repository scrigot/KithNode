"use client";

import Link from "next/link";
import { Map as MapIcon, Circle, CheckCircle2, Dot } from "lucide-react";
import { healthColor } from "@/lib/ops/metrics";
import type { Timeline, NextTask } from "@/lib/ops/cockpit";
import { healthChip, syncedAgo } from "./state";
import { OpsEmpty } from "./ops-tile";

/**
 * The cockpit's north-star band: a phase ladder (current phase lit) with the
 * next ~10 tasks beneath it. Read-first. brand/dashboard.md: sharp 0px,
 * teal-only + semantic status chips, mono tabular-nums, dense. Phases lay out
 * horizontally on desktop (scroll past 6); below 768px they stack vertically
 * (phase headers as dividers), NOT horizontal scroll.
 */
export function PhasedTimeline({
  timeline,
  nextTasks,
  syncedAt,
}: {
  timeline: Timeline | null;
  nextTasks: NextTask[];
  syncedAt: string | null;
}) {
  const phases = timeline?.phases ?? [];

  return (
    <div className="border border-white/[0.06] bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <MapIcon size={13} className="text-accent-teal" />
          <p className="text-sm font-bold uppercase tracking-wider text-accent-teal">
            Roadmap Timeline
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {syncedAgo(syncedAt)}
        </span>
      </div>
      <div className="h-px bg-border" />

      {phases.length === 0 ? (
        <div className="px-5 py-4">
          <OpsEmpty
            icon={<MapIcon size={20} />}
            heading="No phases yet"
            description="Agents fill this as you ship. Start with the active phase."
          />
        </div>
      ) : (
        <>
          {/* Phase ladder — horizontal on desktop, stacked below 768px */}
          <div className="flex flex-col gap-px overflow-x-auto bg-white/[0.06] md:flex-row">
            {phases.map((p) => (
              <div
                key={p.id}
                className={`min-w-[200px] flex-1 bg-bg-card px-5 py-3 ${
                  p.active ? "bg-accent-teal/[0.04]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {p.status === "done" ? (
                      <CheckCircle2 size={12} className="shrink-0 text-accent-green" />
                    ) : p.active ? (
                      <Circle
                        size={12}
                        className="shrink-0 fill-accent-teal/20 text-accent-teal"
                      />
                    ) : (
                      <Circle size={12} className="shrink-0 text-text-muted" />
                    )}
                    <p
                      className={`truncate text-[12px] font-bold ${
                        p.active ? "text-accent-teal" : "text-text-primary"
                      }`}
                    >
                      {p.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${healthChip(p.chip.health)}`}
                  >
                    {p.chip.label}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  {p.gate || "—"}
                  {p.active && (
                    <span className="ml-1.5 text-accent-teal">· current</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Next ~10 tasks under the active phase */}
          <div className="h-px bg-border" />
          <div className="px-5 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Next up · active phase
            </p>
            {nextTasks.length === 0 ? (
              <p className="py-2 text-[11px] text-text-muted">
                No open tasks under the active phase. Mark the next phase active to
                light this up.
              </p>
            ) : (
              <ol className="flex flex-col divide-y divide-white/[0.06]">
                {nextTasks.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 py-1.5 first:pt-0 last:pb-0"
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-[10px] tabular-nums text-text-muted">
                      {i + 1}
                    </span>
                    <Dot
                      size={14}
                      className={`shrink-0 ${
                        t.status === "at_risk"
                          ? healthColor("warn")
                          : t.status === "in_progress"
                            ? "text-accent-teal"
                            : "text-text-muted"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                      {t.title}
                    </span>
                    <Link
                      href={`/dashboard/ops/${t.lane}`}
                      className="shrink-0 border border-white/[0.12] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-text-muted hover:border-accent-teal/40 hover:text-accent-teal focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-teal"
                    >
                      {t.lane}
                    </Link>
                    <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-text-muted sm:inline">
                      {t.gate}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}
