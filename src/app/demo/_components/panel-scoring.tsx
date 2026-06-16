"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { TrendingUp, Activity } from "lucide-react";
import { scoring, overallScore } from "../_data";

export function PanelScoring() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20% 0px -20% 0px" });

  return (
    <section
      id="scoring-panel"
      ref={ref}
      className="scroll-mt-20 rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0EA5E9]">
              Step 03
            </span>
            <span className="h-px w-8 bg-slate-200" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              AI Scoring
            </span>
          </div>
          <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900">
            AI Scoring
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            The math behind the match.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 sm:self-auto">
          <Activity className="h-3 w-3" />
          Model v3.2
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_minmax(0,280px)]">
        {/* Bars */}
        <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
          {scoring.map((bar, i) => (
            <motion.div
              key={bar.label}
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{
                delay: reduce ? 0 : 0.1 * i,
                duration: 0.4,
                ease: "easeOut",
              }}
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {bar.label}
                </span>
                <span className="font-heading text-sm font-bold tabular-nums text-slate-900">
                  {bar.display}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    inView ? { width: `${bar.value}%` } : { width: 0 }
                  }
                  transition={{
                    delay: reduce ? 0 : 0.1 * i + 0.25,
                    duration: 1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4]"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{bar.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Overall score tile */}
        <div className="flex flex-col justify-between gap-5 bg-gradient-to-br from-slate-900 via-[#0B1E3A] to-[#0A1628] p-6 text-white">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0EA5E9]">
              Overall Match
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{
                  delay: reduce ? 0 : 0.6,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="font-heading text-6xl font-bold tracking-tight tabular-nums text-white"
              >
                {overallScore}
              </motion.span>
              <span className="font-mono text-sm text-white/50">/ 100</span>
            </div>
            <p className="mt-2 text-xs text-white/70">
              Weighted across five signal categories, by how strongly each one
              predicts a warm reply.
            </p>
          </div>

          {/* Radial sparkline-ish divider */}
          <div className="relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0EA5E9]/50 to-transparent" />
            <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 p-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#0EA5E9]" />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9]">
                  Expected response rate
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Much warmer than a cold email
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
