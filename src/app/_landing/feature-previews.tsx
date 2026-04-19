"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRightLeft,
  Trophy,
  MessageSquare,
  CheckCircle2,
  Mail,
  Search,
  Layers,
} from "lucide-react";

const CARD_CLASS =
  "relative overflow-hidden border border-white/[0.06] bg-[#0A1628] shadow-2xl shadow-slate-900/40";

function MicroLabel({
  children,
  pulse,
}: {
  children: React.ReactNode;
  pulse?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-5 py-2.5">
      {pulse && (
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
          animate={
            reduce ? undefined : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
        />
      )}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {children}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. SIGNAL DETECTION
// ---------------------------------------------------------------------------
type Signal = {
  text: string;
  name: string;
  rest: string;
  time: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
};

const SIGNALS: Signal[] = [
  {
    text: "promoted to VP at Goldman",
    name: "SARAH CHEN",
    rest: "promoted to VP at Goldman",
    time: "12m ago",
    dot: "bg-[#0EA5E9]",
    Icon: ArrowUpRight,
    iconColor: "text-[#0EA5E9]",
  },
  {
    text: "joined Evercore from Lazard",
    name: "MIKE PARK",
    rest: "joined Evercore from Lazard",
    time: "1h ago",
    dot: "bg-amber-400",
    Icon: ArrowRightLeft,
    iconColor: "text-amber-400",
  },
  {
    text: "UNC '24 just hit 100 alums at JPMorgan",
    name: "UNC '24",
    rest: "just hit 100 alums at JPMorgan",
    time: "3h ago",
    dot: "bg-blue-400",
    Icon: Trophy,
    iconColor: "text-blue-400",
  },
  {
    text: "shared post mentioning 'hiring'",
    name: "PRIYA NAIR",
    rest: "shared post mentioning \u201Chiring\u201D",
    time: "5h ago",
    dot: "bg-emerald-400",
    Icon: MessageSquare,
    iconColor: "text-emerald-400",
  },
];

export function SignalDetectionPreview() {
  const reduce = useReducedMotion();
  return (
    <div className={CARD_CLASS}>
      <MicroLabel pulse>Live Signal Feed</MicroLabel>
      <div className="divide-y divide-white/[0.04]">
        {SIGNALS.map((s, i) => (
          <motion.div
            key={s.name + s.time}
            initial={reduce ? undefined : { opacity: 0, x: -8 }}
            animate={reduce ? undefined : { opacity: 1, x: 0 }}
            transition={
              reduce
                ? undefined
                : { duration: 0.35, ease: "easeOut", delay: i * 0.06 }
            }
            className="flex items-center gap-3 px-5 py-3"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
            <s.Icon className={`h-3.5 w-3.5 shrink-0 ${s.iconColor}`} />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                {s.name}
              </span>
              <span className="ml-1.5 text-[12px] text-white/70">
                {s.rest}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/30">
              {s.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. AI SCORING
// ---------------------------------------------------------------------------
type ScoreRow = {
  label: string;
  value: number;
  meta: React.ReactNode;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">
      {children}
    </span>
  );
}

const SCORE_ROWS: ScoreRow[] = [
  {
    label: "SHARED AFFILIATIONS",
    value: 92,
    meta: (
      <div className="flex flex-wrap gap-1">
        <Chip>UNC</Chip>
        <Chip>Chi Phi</Chip>
        <Chip>Kenan-Flagler</Chip>
      </div>
    ),
  },
  {
    label: "WARM PATH STRENGTH",
    value: 78,
    meta: (
      <span className="font-mono text-[11px] text-[#0EA5E9]">
        Via Jake Bennett
      </span>
    ),
  },
  {
    label: "REACHABILITY",
    value: 85,
    meta: (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Email Verified
      </span>
    ),
  },
  {
    label: "ACTIVITY",
    value: 81,
    meta: (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        Active on LinkedIn &middot; 2d ago
      </span>
    ),
  },
];

export function AIScoringPreview() {
  const reduce = useReducedMotion();
  return (
    <div className={CARD_CLASS}>
      <MicroLabel>Warmth Score Breakdown</MicroLabel>
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white">
            SARAH CHEN
          </div>
          <div className="text-[11px] text-white/60">
            Associate &middot; Goldman Sachs
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              Score
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums text-[#0EA5E9]">
              84
            </div>
          </div>
          <span className="border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
            HOT
          </span>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {SCORE_ROWS.map((r, i) => (
          <div key={r.label}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                {r.label}
              </span>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-[#0EA5E9]">
                {r.value}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden bg-white/[0.06]">
              <motion.div
                className="h-1 bg-[#0EA5E9]"
                initial={reduce ? undefined : { width: 0 }}
                animate={reduce ? undefined : { width: `${r.value}%` }}
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0.15 + i * 0.08,
                      }
                }
                style={reduce ? { width: `${r.value}%` } : undefined}
              />
            </div>
            <div className="mt-1.5">{r.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. SMART OUTREACH
// ---------------------------------------------------------------------------
export function SmartOutreachPreview() {
  const reduce = useReducedMotion();
  return (
    <div className={CARD_CLASS}>
      <MicroLabel>Outreach Composer</MicroLabel>
      <div className="divide-y divide-white/[0.04]">
        <div className="flex items-center gap-2 px-5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            To
          </span>
          <span className="font-mono text-[12px] text-white/80">
            sarah.chen@gs.com
          </span>
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Subj
          </span>
          <span className="text-[12px] text-white">
            UNC alum &mdash; quick question about Goldman recruiting
          </span>
        </div>
        <div className="px-5 py-4 text-[12px] leading-relaxed text-white/80">
          <p>Hi Riley,</p>
          <p className="mt-2">
            Jake Bennett mentioned you when I asked him about Goldman&apos;s
            summer analyst path. I&apos;m a UNC freshman at Kenan-Flagler
            targeting IB and would love 15 minutes to hear how you thought
            about recruiting.
          </p>
          <p className="mt-2">
            Congrats on the VP promotion, by the way.
          </p>
          <p className="mt-2 inline-flex items-center">
            Best, Sam
            <motion.span
              className="ml-0.5 inline-block h-3.5 w-[2px] bg-[#0EA5E9] align-middle"
              animate={reduce ? undefined : { opacity: [1, 0, 1] }}
              transition={
                reduce
                  ? undefined
                  : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              }
            />
          </p>
        </div>
        <div className="px-5 py-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
            Shared context used
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Chip>UNC &apos;24</Chip>
            <Chip>Chi Phi</Chip>
            <Chip>Kenan-Flagler</Chip>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Mail className="h-3 w-3" /> AI draft &middot; ready to review
          </div>
          <button
            disabled
            className="cursor-not-allowed border border-[#0EA5E9]/40 bg-[#0EA5E9]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. DISCOVER PIPELINE
// ---------------------------------------------------------------------------
const DISCOVER_LOG = [
  {
    action: "SCANNED",
    target: "Goldman Sachs",
    meta: "12 candidates found",
  },
  {
    action: "ENRICHED",
    target: "Riley Chen",
    meta: "hunter_verified",
  },
  {
    action: "RANKED",
    target: "by fit + affinity",
    meta: "4 high-value",
  },
  {
    action: "SAVED",
    target: "to pipeline",
    meta: "ready to rate",
  },
];

export function DiscoverPipelinePreview() {
  const reduce = useReducedMotion();
  return (
    <div className={CARD_CLASS}>
      <MicroLabel pulse>Discover &middot; Quick Mode</MicroLabel>
      <div className="border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-white/70">
            Running pipeline
          </span>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-[#0EA5E9]">
            67%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden bg-white/[0.06]">
          <motion.div
            className="h-1 bg-[#0EA5E9]"
            initial={reduce ? undefined : { width: 0 }}
            animate={reduce ? undefined : { width: "67%" }}
            transition={
              reduce ? undefined : { duration: 1.4, ease: "easeOut" }
            }
            style={reduce ? { width: "67%" } : undefined}
          />
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {DISCOVER_LOG.map((row, i) => (
          <motion.div
            key={row.action + row.target}
            initial={reduce ? undefined : { opacity: 0, x: -6 }}
            animate={reduce ? undefined : { opacity: 1, x: 0 }}
            transition={
              reduce
                ? undefined
                : { duration: 0.3, ease: "easeOut", delay: 0.1 + i * 0.08 }
            }
            className="flex items-center gap-3 px-5 py-2.5"
          >
            <span className="w-20 shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#0EA5E9]">
              {row.action}
            </span>
            <span className="flex-1 truncate text-[12px] text-white">
              {row.target}
            </span>
            <span className="font-mono text-[10px] text-white/50">
              {row.meta}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/[0.06] bg-[#0EA5E9]/[0.08] px-5 py-3">
        <Search className="h-3.5 w-3.5 text-[#0EA5E9]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0EA5E9]">
          4 new warm paths discovered
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. PIPELINE MANAGEMENT
// ---------------------------------------------------------------------------
const MINI_COLUMNS = [
  { stage: "Discovered", count: 12, dot: "bg-slate-400" },
  { stage: "Contacted", count: 8, dot: "bg-blue-400" },
  { stage: "Responded", count: 3, dot: "bg-emerald-400" },
  { stage: "Meeting Set", count: 2, dot: "bg-[#0EA5E9]" },
];

export function PipelineManagementPreview() {
  const reduce = useReducedMotion();
  return (
    <div className={CARD_CLASS}>
      <MicroLabel>Pipeline Snapshot</MicroLabel>
      <div className="grid grid-cols-4 border-b border-white/[0.06]">
        {MINI_COLUMNS.map((c, i) => (
          <div
            key={c.stage}
            className={`px-3 py-3 ${i < MINI_COLUMNS.length - 1 ? "border-r border-white/[0.06]" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              <span className="truncate text-[9px] font-bold uppercase tracking-wider text-white/50">
                {c.stage}
              </span>
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">
              {c.count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
          animate={
            reduce ? undefined : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9]">
          AutoGuard Active
        </span>
        <span className="ml-auto text-[10px] text-white/50">
          Paused automation for 3 responded contacts
        </span>
      </div>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
            Next Action
          </div>
          <div className="truncate text-[12px] text-white">
            Follow up with Miles Park &middot;{" "}
            <span className="text-amber-400">5 days no reply</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9]">
          Draft reply <Layers className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
