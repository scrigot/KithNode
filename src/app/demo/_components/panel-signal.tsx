"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { MapPin, Building2, GraduationCap, Users, Share2 } from "lucide-react";
import { signals, target } from "../_data";

const SIGNAL_ICONS = [Users, GraduationCap, MapPin, Building2, Share2];

export function PanelSignal() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20% 0px -20% 0px" });

  return (
    <section
      id="signal-panel"
      ref={ref}
      className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0EA5E9]">
              Step 02
            </span>
            <span className="h-px w-8 bg-slate-200" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Signal Detection
            </span>
          </div>
          <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900">
            Signal Detection
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Why Jane is John&apos;s warmest path.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9] sm:self-auto">
          5 signals matched
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,320px)_1fr]">
        {/* Left: Jane profile card */}
        <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-6 md:border-b-0 md:border-r">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] font-heading text-xl font-bold text-white shadow-lg shadow-[#0EA5E9]/30">
                {target.initials}
              </div>
              <motion.span
                className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500"
                animate={reduce ? undefined : { scale: [1, 1.15, 1] }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </motion.span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg font-bold text-slate-900">
                {target.name}
              </p>
              <p className="text-sm text-slate-600">
                {target.role} &middot; {target.group}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {target.firmLabel}
              </p>
            </div>
          </div>

          {/* Attributes */}
          <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-200 pt-5">
            {[
              ["School", target.school],
              ["Location", target.city],
              ["Affiliation", target.org],
              ["Tenure", target.tenure],
              ["Network", target.degree],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2 last:border-b-0 last:pb-0"
              >
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="text-xs font-medium text-slate-700">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right: staggered signals */}
        <div className="flex flex-col gap-3 p-6">
          {signals.map((s, i) => {
            const Icon = SIGNAL_ICONS[i] ?? Share2;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 12, filter: "blur(4px)" }}
                animate={
                  inView
                    ? { opacity: 1, x: 0, filter: "blur(0px)" }
                    : { opacity: 0, x: 12, filter: "blur(4px)" }
                }
                transition={{
                  delay: reduce ? 0 : 0.3 * i,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#0EA5E9]/40 hover:shadow-md hover:shadow-[#0EA5E9]/5"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  0{s.id}
                </span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{s.detail}</p>
                </div>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : { scale: 0 }}
                  transition={{
                    delay: reduce ? 0 : 0.3 * i + 0.2,
                    duration: 0.3,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                  aria-hidden
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Signal Strength meter */}
      <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 via-[#0EA5E9]/5 to-slate-50 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Signal Strength
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-heading text-xl font-bold text-slate-900">
                94%
              </span>
              <span className="ml-2 text-xs text-slate-500">
                Top 3% of John&apos;s pipeline
              </span>
            </p>
          </div>
          <div className="hidden w-64 sm:block">
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: "94%" } : { width: 0 }}
                transition={{
                  delay: reduce ? 0 : 1.6,
                  duration: 1.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#0EA5E9] via-[#06B6D4] to-[#22D3EE]"
              />
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: reduce ? 0 : 2.6, duration: 0.3 }}
                className="absolute inset-0 rounded-full bg-white/30 mix-blend-overlay"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
