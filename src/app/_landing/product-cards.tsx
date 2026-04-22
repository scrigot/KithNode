"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  Radar,
  Sparkles,
  Send,
  Search,
  Layers,
  Check,
  ArrowRight,
  X,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type FeatureId = "signals" | "scoring" | "outreach" | "discover" | "pipeline";

interface Feature {
  id: FeatureId;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

const FEATURES: Feature[] = [
  {
    id: "signals",
    title: "Signal Detection",
    subtitle: "Track alumni changes in real time",
    Icon: Radar,
  },
  {
    id: "scoring",
    title: "AI Scoring",
    subtitle: "Warmth scores that predict response",
    Icon: Sparkles,
  },
  {
    id: "outreach",
    title: "Smart Outreach",
    subtitle: "Drafts that don't feel robotic",
    Icon: Send,
  },
  {
    id: "discover",
    title: "Discover",
    subtitle: "Find warm paths you didn't know existed",
    Icon: Search,
  },
  {
    id: "pipeline",
    title: "Pipeline",
    subtitle: "Track every relationship to coffee chat",
    Icon: Layers,
  },
];

const AUTO_ADVANCE_MS = 8000;

export function ProductCards() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState<FeatureId>("signals");
  const [paused, setPaused] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      const idx = FEATURES.findIndex((f) => f.id === active);
      const next = FEATURES[(idx + 1) % FEATURES.length];
      setActive(next.id);
      setTick((t) => t + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, paused, reduce]);

  const handleTabClick = (id: FeatureId) => {
    setActive(id);
    setTick((t) => t + 1);
  };

  return (
    <section
      id="products"
      className="bg-gradient-to-b from-white via-slate-50 to-white py-24 px-4"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to network smarter
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-600">
            From finding the right people to landing the meeting &mdash; KithNode handles the entire networking workflow.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div
            className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 md:grid-cols-[300px_1fr]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Left rail: tabs */}
            <div className="flex flex-col border-b border-slate-200 bg-slate-50/40 md:border-b-0 md:border-r">
              {FEATURES.map((f, i) => {
                const isActive = active === f.id;
                return (
                  <motion.button
                    key={f.id}
                    type="button"
                    onClick={() => handleTabClick(f.id)}
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className={`group relative flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                      isActive
                        ? "bg-white"
                        : "hover:bg-white/60"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute left-0 top-0 h-full w-[3px] bg-[#0EA5E9]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#0EA5E9]/10 text-[#0EA5E9]"
                          : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
                      }`}
                    >
                      <f.Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {f.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{f.subtitle}</p>
                    </div>

                    {/* Auto-advance progress bar */}
                    {isActive && !reduce && !paused && (
                      <motion.span
                        key={tick}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-[#0EA5E9]/40"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Right panel: dark product preview */}
            <div className="relative min-h-[420px] overflow-hidden bg-[#0A1628] p-5 sm:p-7">
              {/* Faux browser chrome */}
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-white/30">
                  kithnode / {active}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {active === "signals" && <SignalsPreview />}
                  {active === "scoring" && <ScoringPreview />}
                  {active === "outreach" && <OutreachPreview />}
                  {active === "discover" && <DiscoverPreview />}
                  {active === "pipeline" && <PipelinePreview />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ───────────────────────── Preview: Signals ─────────────────────────

function SignalsPreview() {
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
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0EA5E9]" />
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

// ───────────────────────── Preview: Scoring ─────────────────────────

function ScoringPreview() {
  const components = [
    { label: "Shared Affiliations", value: 92 },
    { label: "Activity Signals", value: 78 },
    { label: "Reachability", value: 74 },
    { label: "Industry Fit", value: 85 },
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

// ───────────────────────── Preview: Outreach ─────────────────────────

function OutreachPreview() {
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
            I&apos;m a UNC freshman starting fall IB recruiting. Jake Bennett (UNC Greek Life) mentioned you took a similar path, UNC → GS, and suggested I reach out.
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

// ───────────────────────── Preview: Discover ─────────────────────────

function DiscoverPreview() {
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
              Via Jake Bennett (Greek Life) → Associate at Moelis
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

// ───────────────────────── Preview: Pipeline ─────────────────────────

function PipelinePreview() {
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
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0EA5E9]" />
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
