"use client";

// Landing section: "Outpace your peers" -- a 3-card bento row, each card holding
// a SHARP navy dashboard mini-screenshot framed by a rounded landing frame.
// Landing chrome (rounded-[Npx], teal, mesh) follows brand/landing.md (Cluely DNA);
// the dashboard CONTENT inside each screenshot stays 0px sharp per brand/dashboard.md.

import { Bell, Mail } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { MeshBg } from "./mesh-bg";

// ---------------------------------------------------------------------------
// Keyframes: compositor-driven CSS only (the preview throttles rAF, so no
// hand-rolled loops). One inline <style> block holds the kanban card crawl.
// ---------------------------------------------------------------------------

function OutpaceKeyframes() {
  return (
    <style>{`
      @keyframes outpace-card-crawl {
        0%,   18% { transform: translateX(0%); }
        25%,  43% { transform: translateX(100%); }
        50%,  68% { transform: translateX(200%); }
        75%,  93% { transform: translateX(300%); }
        100%      { transform: translateX(0%); }
      }
      @keyframes outpace-tier-cycle {
        0%,   18% { background-color: rgba(113,113,122,0.18); color: #a1a1aa; border-color: rgba(113,113,122,0.4); }
        25%,  43% { background-color: rgba(59,130,246,0.18); color: #60a5fa; border-color: rgba(59,130,246,0.4); }
        50%,  68% { background-color: rgba(34,197,94,0.18); color: #4ade80; border-color: rgba(34,197,94,0.4); }
        75%, 100% { background-color: rgba(14,165,233,0.18); color: #38bdf8; border-color: rgba(14,165,233,0.4); }
      }
      .outpace-crawl {
        animation: outpace-card-crawl 6s steps(1, end) infinite;
      }
      .outpace-tier {
        animation: outpace-tier-cycle 6s steps(1, end) infinite;
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Card 1 -- "Know your gaps" -> THE EDGE replica.
// Sharp navy panel, mono header, 3 horizontal gap bars vs cohort.
// ---------------------------------------------------------------------------

const GAP_ROWS = [
  { label: "Skills", you: 62, caption: "vs cohort 78" },
  { label: "Clubs", you: 40, caption: "vs cohort 71" },
  { label: "Experience", you: 55, caption: "vs cohort 69" },
];

function EdgeReplica() {
  return (
    <div className="bg-bg-primary p-4">
      <div className="flex items-end justify-between">
        <div>
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            THE EDGE
          </h4>
          <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Where you trail your cohort
          </p>
        </div>
        <span className="border border-amber-400/40 bg-amber-400/5 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">
          3 gaps
        </span>
      </div>

      <div className="mt-3 h-px bg-border" />

      <div className="mt-3 space-y-3">
        {GAP_ROWS.map((row) => (
          <div key={row.label} className="border border-white/[0.06] bg-bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                {row.label}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-primary">
                {row.you}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-muted">
              <div
                className="h-full bg-accent-blue"
                style={{ width: `${row.you}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {row.caption}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 2 -- "Track every play" -> PIPELINE replica.
// 4 sharp navy kanban columns; one contact card crawls across via CSS keyframes.
// ---------------------------------------------------------------------------

const KANBAN_COLUMNS = [
  { label: "RESEARCHED", count: 14, chip: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400" },
  { label: "CONTACTED", count: 9, chip: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
  { label: "RESPONDED", count: 5, chip: "border-green-500/40 bg-green-500/10 text-green-400" },
  { label: "MEETING", count: 2, chip: "border-primary/40 bg-primary/10 text-primary" },
];

function PipelineReplica() {
  return (
    <div className="bg-bg-primary p-4">
      <div className="flex items-end justify-between">
        <div>
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            PIPELINE
          </h4>
          <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Cold name to coffee chat
          </p>
        </div>
      </div>

      <div className="mt-3 h-px bg-border" />

      <div className="relative mt-3 grid grid-cols-4 gap-2">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.label}
            className="min-h-[120px] border border-white/[0.06] bg-bg-card p-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                {col.label}
              </span>
              <span
                className={`border px-1 py-px font-mono text-[8px] font-bold tabular-nums ${col.chip}`}
              >
                {col.count}
              </span>
            </div>
          </div>
        ))}

        {/* Animated contact card -- crawls left to right across the 4 columns.
            Lane width is one column (25%); translateX steps by 100% per stage. */}
        <div className="pointer-events-none absolute left-2 right-2 top-9">
          <div className="w-[calc(25%-6px)]">
            <div className="outpace-crawl">
              <div className="border border-white/[0.1] bg-bg-primary p-2 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <p className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">
                  Priya Shah
                </p>
                <p className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                  Analyst @ Evercore
                </p>
                <span className="outpace-tier mt-1.5 inline-block border px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider">
                  MOVING
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 -- "Never drop the ball" -> FOLLOW-UP REMINDERS replica.
// Sharp navy nudge card, amber-bordered overdue row + a second reminder.
// ---------------------------------------------------------------------------

function RemindersReplica() {
  return (
    <div className="bg-bg-primary p-4">
      <div className="flex items-end justify-between">
        <div>
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            FOLLOW-UP REMINDERS
          </h4>
          <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Nudges before threads go cold
          </p>
        </div>
        <Bell className="h-3.5 w-3.5 text-amber-300" aria-hidden />
      </div>

      <div className="mt-3 h-px bg-border" />

      <div className="mt-3 space-y-2">
        {/* Overdue nudge -- amber border */}
        <div className="border border-amber-400/40 bg-amber-400/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                Riley hasn&apos;t replied in 5 days
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                Sent Jun 10 · Goldman Sachs
              </p>
            </div>
            <Bell className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" aria-hidden />
          </div>
          <button
            type="button"
            className="mt-2 w-full border border-primary/40 bg-primary/10 px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
          >
            Send follow-up
          </button>
        </div>

        {/* Second reminder -- standard navy row */}
        <div className="border border-white/[0.06] bg-bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                Check in with Drew
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Due tomorrow · Lazard
              </p>
            </div>
            <Bell className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bento card wrapper -- rounded landing frame + headline + rounded screenshot frame.
// ---------------------------------------------------------------------------

function BentoCard({
  lead,
  desc,
  children,
}: {
  lead: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Card holds only the dashboard screenshot */}
      <div className="flex flex-1 flex-col justify-center rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="overflow-hidden rounded-[16px] border border-white/[0.06]">
          {children}
        </div>
      </div>
      {/* Caption below the card -- Cluely bold-lead format */}
      <p className="mt-5 text-base leading-relaxed">
        <span className="font-semibold text-white">{lead}</span>{" "}
        <span className="text-white/60">{desc}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section.
// ---------------------------------------------------------------------------

export function SectionOutpace() {
  return (
    <section className="relative overflow-hidden bg-black px-4 py-24 sm:py-32">
      <MeshBg />
      <OutpaceKeyframes />

      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="text-center">
            <h2 className="font-heading text-4xl font-medium leading-[1.05] tracking-[-0.027em] text-white sm:text-5xl lg:text-6xl">
              Outpace your peers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[19px] leading-relaxed tracking-[-0.02em] text-white/60">
              See where you trail, track every relationship, and never let a warm thread go cold.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 items-stretch gap-x-6 gap-y-5 lg:grid-cols-3">
            <BentoCard
              lead="See where you trail."
              desc="KithNode ranks you against your cohort on skills, clubs, and experience, so you know exactly what to close."
            >
              <EdgeReplica />
            </BentoCard>
            <BentoCard
              lead="Track every play."
              desc="Every contact moves from cold name to coffee chat on one board. Nothing slips."
            >
              <PipelineReplica />
            </BentoCard>
            <BentoCard
              lead="Never drop the ball."
              desc="Nudges before a warm thread goes cold, so you follow up at exactly the right moment."
            >
              <RemindersReplica />
            </BentoCard>
          </div>

          {/* Works-with row -- honest touchpoints, Cluely "compatible with" analog */}
          <div className="mt-16 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Works with your stack
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-white/50">
              <span className="inline-flex items-center gap-2">
                <svg
                  viewBox="0 0 16 16"
                  className="h-5 w-5"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
                </svg>
                <span className="text-sm font-medium">LinkedIn</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Outlook</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Gmail</span>
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
