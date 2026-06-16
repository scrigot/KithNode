"use client";

import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight, X, Star } from "lucide-react";

// ---------------------------------------------------------------------------
// Keyframes used by the previews below.
// Render <PreviewKeyframes /> once per section that mounts these previews.
// ---------------------------------------------------------------------------

export function PreviewKeyframes() {
  return (
    <style>{`
      @keyframes pc-tab-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50%       { opacity: 1;   transform: scale(1.4); }
      }
      .pc-tab-dot {
        animation: pc-tab-pulse 2.4s ease-in-out infinite;
      }
    `}</style>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Signals
// ─────────────────────────────────────────────────────────────────────────────

export function SignalsPreview() {
  const signals = [
    {
      name: "Riley Chen",
      event: "Promoted to Associate at Goldman Sachs",
      time: "2h ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Drew Castro",
      event: "Joined Lazard as Analyst",
      time: "1d ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Nisha Rao",
      event: "Posted: 'Hiring for summer analysts'",
      time: "2d ago",
      dot: "bg-amber-400",
    },
    {
      name: "Miles Park",
      event: "Updated title to VP at Evercore",
      time: "3d ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Ben Kaminski",
      event: "Joined KKR Private Equity",
      time: "4d ago",
      dot: "bg-[#0EA5E9]",
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="pc-tab-dot h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
            Signal Feed · Live
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          Last 7 days
        </span>
      </div>

      <div className="space-y-0">
        {signals.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/70">
              {s.name.split(" ").map((n) => n[0]).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {s.name}
              </p>
              <p className="truncate text-[11px] text-white/60">{s.event}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/40">
              {s.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function ScoringPreview() {
  const components = [
    { label: "Same school", value: 92 },
    { label: "Same Greek / club", value: 78 },
    { label: "Mutual connections", value: 74 },
    { label: "Target firm", value: 85 },
  ];

  return (
    <div>
      {/* Featured contact */}
      <div className="mb-5 border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 inline-flex items-center border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
              Hot
            </div>
            <h4 className="text-base font-bold text-white">Ben Kaminski</h4>
            <p className="text-xs text-white/60">Vice President · KKR</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-3xl font-bold tabular-nums text-red-400">
              82
            </span>
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              Warmth Score
            </p>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-white/50">
          Score Composition
        </p>
        <div className="space-y-3">
          {components.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.3 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  {c.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-white/80">
                  {c.value}
                </span>
              </div>
              <div className="h-1 w-full bg-white/[0.08]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.value}%` }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: "easeOut" }}
                  className="h-1 bg-[#0EA5E9]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Outreach
// ─────────────────────────────────────────────────────────────────────────────

export function OutreachPreview() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Compose
        </span>
        <span className="inline-flex items-center gap-1.5 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#0EA5E9]">
          <Sparkles className="h-3 w-3" />
          AI Drafted
        </span>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 border-b border-white/[0.06] pb-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">To</span>
            <span className="font-mono text-[11px] text-white/80">riley.chen@goldmansachs.com</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Subject</span>
            <span className="text-[12px] text-white">Coffee chat about your path from UNC to Goldman</span>
          </div>
        </div>

        <div className="space-y-2 text-[12px] leading-relaxed text-white/80">
          <p>Hi Riley,</p>
          <p>
            I&apos;m a UNC freshman starting fall IB recruiting. Jake Bennett (UNC Greek Life) mentioned you took a similar path, UNC to GS, and suggested I reach out.
          </p>
          <p>
            Would you be open to a 15-min coffee chat? Happy to work around your schedule.
          </p>
          <p>Thanks, Sam</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-3 flex items-center gap-2">
        <button className="flex-1 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9] hover:bg-[#0EA5E9]/20">
          Copy
        </button>
        <button className="flex-1 border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/[0.08]">
          Mark Sent
        </button>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          Edit before send
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Discover
// ─────────────────────────────────────────────────────────────────────────────

export function DiscoverPreview() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Discover · 12 new paths found
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          3 of 12
        </span>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="inline-flex items-center border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
            Warm
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-blue-400">
            76
          </span>
        </div>

        <div className="px-4 py-4">
          <h4 className="text-base font-bold text-white">Elena Ruiz</h4>
          <p className="mb-3 text-xs text-white/60">Associate · Moelis &amp; Company</p>

          <div className="mb-3 border border-[#0EA5E9]/20 bg-[#0EA5E9]/[0.04] p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-white/50">
              Warm Path
            </p>
            <p className="font-mono text-[11px] leading-relaxed text-[#0EA5E9]">
              Via Jake Bennett (Greek Life) to Associate at Moelis
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span>UNC &apos;21</span>
            <span>·</span>
            <span>New York</span>
            <span>·</span>
            <span>Shared: Kenan-Flagler</span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/[0.06] px-4 py-3">
          <button className="flex flex-1 items-center justify-center gap-1.5 border border-white/[0.12] py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-red-500/10 hover:text-red-400">
            <X className="h-3 w-3" />
            Skip
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 bg-[#0EA5E9] py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#0EA5E9]/80">
            <Star className="h-3 w-3" />
            High Value
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Pipeline
// ─────────────────────────────────────────────────────────────────────────────

export function PipelinePreview() {
  const columns = [
    {
      stage: "Discovered",
      dot: "bg-slate-400",
      contacts: [
        { name: "Drew Castro", firm: "Lazard", score: 62 },
        { name: "Cam Lee", firm: "Houlihan", score: 55 },
      ],
    },
    {
      stage: "Contacted",
      dot: "bg-[#0EA5E9]",
      contacts: [
        { name: "Riley Chen", firm: "Goldman", score: 71 },
        { name: "Miles Park", firm: "Evercore", score: 65 },
      ],
    },
    {
      stage: "Responded",
      dot: "bg-amber-400",
      contacts: [{ name: "Nisha Rao", firm: "Centerview", score: 78, check: true }],
    },
    {
      stage: "Meeting",
      dot: "bg-green-400",
      contacts: [{ name: "Ben Kaminski", firm: "KKR", score: 82, meeting: true }],
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Pipeline · This week
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          6 contacts active
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {columns.map((col, ci) => (
          <motion.div
            key={col.stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * ci, duration: 0.3 }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
                {col.stage}
              </span>
              <span className="ml-auto font-mono text-[9px] tabular-nums text-white/30">
                {col.contacts.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {col.contacts.map((c) => (
                <div
                  key={c.name}
                  className="border border-white/[0.06] bg-white/[0.02] p-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-[11px] font-semibold text-white">
                      {c.name}
                    </p>
                    {"check" in c && (
                      <Check className="h-3 w-3 shrink-0 text-green-400" />
                    )}
                  </div>
                  <p className="truncate text-[9px] text-white/50">{c.firm}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className="h-[2px] flex-1 bg-white/[0.08]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.score}%` }}
                        transition={{ delay: 0.08 * ci + 0.15, duration: 0.6 }}
                        className="h-[2px] bg-[#0EA5E9]"
                      />
                    </div>
                    <span className="font-mono text-[8px] tabular-nums text-white/50">
                      {c.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* AutoGuard footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="pc-tab-dot h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
            Autoguard Active
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
          View all
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
