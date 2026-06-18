"use client";

import Link from "next/link";
import { Network, ChevronRight } from "lucide-react";
import { healthColor } from "@/lib/ops/metrics";
import { maturityChip, type LaneSummary } from "@/lib/ops/cockpit";
import { healthChip } from "./state";

/**
 * The AI-org band: 8 clickable lane cards in a dense terminal grid. Each card
 * links to /dashboard/ops/[lane]. Status comes from the maturity chip + text
 * color ONLY — NO colored left-border (brand/dashboard.md slop fix #8). The
 * maturity chip uses SEMANTIC colors (manual=amber, copilot=teal, autonomous=
 * green), never the brand tier palette. Single column below 768px; 44px touch
 * targets; visible teal focus ring. A manual lane shows a muted "manual",
 * never a fabricated number.
 */
export function OrgBand({ lanes }: { lanes: LaneSummary[] }) {
  if (lanes.length === 0) {
    return (
      <div className="border border-white/[0.06] bg-bg-card px-5 py-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          Org band unavailable
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          Lane data could not be read. Try again shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/[0.06] bg-bg-card">
      <div className="flex items-center gap-2 px-5 py-2.5">
        <Network size={13} className="text-accent-teal" />
        <p className="text-sm font-bold uppercase tracking-wider text-accent-teal">
          Agent Org
        </p>
        <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {lanes.length} lanes
        </span>
      </div>
      <div className="h-px bg-border" />
      <div className="grid grid-cols-1 gap-px bg-white/[0.06] md:grid-cols-2 lg:grid-cols-4">
        {lanes.map((lane) => (
          <LaneCard key={lane.key} lane={lane} />
        ))}
      </div>
    </div>
  );
}

function LaneCard({ lane }: { lane: LaneSummary }) {
  const chip = maturityChip(lane.maturity);
  const copilotish = lane.maturity === "copilot";
  return (
    <Link
      href={`/dashboard/ops/${lane.key}`}
      className="group flex min-h-[88px] flex-col gap-2 bg-bg-card px-4 py-3 transition-colors hover:bg-white/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-teal"
    >
      {/* Top: label + maturity chip */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] font-bold uppercase tracking-wider text-text-primary">
          {lane.label}
        </p>
        <span
          className={`shrink-0 border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${
            // copilot maps to neutral Health; show it in teal (accent) so a
            // staffed lane reads as agent-staffed, not muted.
            copilotish
              ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal"
              : healthChip(chip.health)
          }`}
        >
          {chip.label}
        </span>
      </div>

      {/* Middle: the live stat OR a muted "manual" (never a fake number) */}
      {lane.stat ? (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold tabular-nums text-text-primary">
            {lane.stat.value}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider ${healthColor(lane.stat.health)}`}
          >
            {lane.stat.label}
          </span>
        </div>
      ) : (
        <p className="font-mono text-[11px] lowercase tracking-wider text-text-muted">
          manual · no live signal
        </p>
      )}

      {/* Bottom: agent roster + open-task count + drill-in affordance */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-wider text-text-muted">
          {lane.agents.length > 0
            ? lane.agents.join(" · ")
            : "no agent yet"}
          {lane.openCount > 0 && (
            <span className="ml-1.5 text-text-secondary">
              {lane.openCount} open
            </span>
          )}
        </span>
        <ChevronRight
          size={13}
          className="shrink-0 text-text-muted group-hover:text-accent-teal"
        />
      </div>
    </Link>
  );
}
