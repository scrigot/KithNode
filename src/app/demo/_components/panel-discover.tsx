"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { pipeline, firmFilters } from "../_data";

const FIRM_ACCENT: Record<string, string> = {
  BofA: "bg-red-500/10 text-red-600 border-red-500/20",
  JPM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MS: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Wells: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Truist: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export function PanelDiscover() {
  const reduce = useReducedMotion();
  const [filter, setFilter] = React.useState<string>("BofA");
  const [glowOn, setGlowOn] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setGlowOn(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const rows = React.useMemo(() => {
    if (filter === "all") return pipeline;
    return pipeline.filter((r) => r.firm === filter);
  }, [filter]);

  return (
    <section
      id="discover-panel"
      className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0EA5E9]">
              Step 01
            </span>
            <span className="h-px w-8 bg-slate-200" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Discover
            </span>
          </div>
          <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900">
            Discover
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            John&apos;s pipeline of Charlotte IB MDs and VPs.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0EA5E9]" />
          <span className="font-mono uppercase tracking-wider">
            {rows.length} matches
          </span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-6 py-4">
        {firmFilters.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-sm shadow-[#0EA5E9]/30"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
              aria-pressed={isActive}
            >
              <span>{f.label}</span>
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  isActive ? "text-white/80" : "text-slate-400"
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="grid grid-cols-[2fr_1.3fr_1fr_1.3fr_0.7fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50/60 px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Name</span>
          <span>Firm</span>
          <span>Role</span>
          <span>Group</span>
          <span className="text-right">YoE</span>
          <span className="text-right">Last active</span>
        </div>

        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            const isTarget = row.highlighted;
            const glowActive = isTarget && glowOn;
            return (
              <motion.div
                key={row.id}
                layout
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: glowActive ? 1.02 : 1,
                }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{
                  delay: reduce ? 0 : 0.03 * i,
                  duration: 0.25,
                  ease: "easeOut",
                  scale: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
                }}
                className={`relative grid grid-cols-[2fr_1.3fr_1fr_1.3fr_0.7fr_0.9fr] items-center gap-4 border-b border-slate-100 px-6 py-3 text-sm transition-colors ${
                  glowActive
                    ? "z-10 bg-gradient-to-r from-[#0EA5E9]/5 via-[#0EA5E9]/10 to-[#06B6D4]/5"
                    : "bg-white hover:bg-slate-50/60"
                }`}
              >
                {/* Glow ring on target */}
                {glowActive && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[#0EA5E9]/40"
                    initial={{ opacity: 0 }}
                    animate={
                      reduce
                        ? { opacity: 1 }
                        : { opacity: [0.3, 0.7, 0.3] }
                    }
                    transition={
                      reduce
                        ? { duration: 0.3 }
                        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                )}

                {/* Name + avatar */}
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wide ${
                      glowActive
                        ? "bg-[#0EA5E9] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {row.name}
                    </p>
                    {glowActive && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="mt-0.5 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9]"
                      >
                        <Sparkles className="h-3 w-3" />
                        Warm path detected
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Firm badge */}
                <div>
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${FIRM_ACCENT[row.firm]}`}
                  >
                    {row.firm}
                  </span>
                </div>

                {/* Role */}
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {row.role}
                </span>

                {/* Group */}
                <span className="truncate text-xs text-slate-600">
                  {row.group}
                </span>

                {/* YoE */}
                <span className="text-right font-mono text-xs tabular-nums text-slate-500">
                  {row.yoe}y
                </span>

                {/* Last active + CTA */}
                <div className="flex items-center justify-end gap-2">
                  {glowActive ? (
                    <motion.button
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      onClick={() =>
                        document
                          .getElementById("signal-panel")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-[#0EA5E9] px-3 py-1 text-[11px] font-bold text-white shadow-sm shadow-[#0EA5E9]/40 transition-transform hover:scale-105"
                    >
                      See why
                      <ArrowRight className="h-3 w-3" />
                    </motion.button>
                  ) : (
                    <span className="font-mono text-[10px] tabular-nums text-slate-400">
                      {row.lastActive}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
