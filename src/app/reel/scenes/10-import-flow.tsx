"use client";

import { motion } from "framer-motion";
import { BlueBg, EASE_OUT } from "../primitives";

// Contact rows that "import" in waves from the LinkedIn CSV file into KithNode.
const IMPORTED: { name: string; firm: string; score: number; delay: number; tier: string }[] = [
  { name: "Riley Chen", firm: "Goldman Sachs", score: 84, tier: "HOT", delay: 0.55 },
  { name: "Morgan Reyes", firm: "Lazard", score: 78, tier: "HOT", delay: 0.7 },
  { name: "Miles Park", firm: "Evercore", score: 72, tier: "WARM", delay: 0.85 },
  { name: "Nisha Rao", firm: "Centerview", score: 65, tier: "WARM", delay: 1.0 },
  { name: "Ava Shah", firm: "Evercore", score: 58, tier: "MONITOR", delay: 1.15 },
];

const TIER_BG: Record<string, string> = {
  HOT: "bg-red-500",
  WARM: "bg-blue-500",
  MONITOR: "bg-amber-500",
};

export function ImportFlow() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      {/* CSV file card (source) — slides in from left, shakes once, then pushes rows out */}
      <motion.div
        initial={{ opacity: 0, x: -60, rotate: -6 }}
        animate={{ opacity: 1, x: 0, rotate: -3 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="absolute left-[6%] top-[22%] w-[360px] rounded-[18px] bg-white p-6 shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#0A66C2]" fill="currentColor">
            <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.3A1.8 1.8 0 118.3 6.5 1.8 1.8 0 016.5 8.3zM19 19h-3v-4.7c0-2.7-3-2.5-3 0V19h-3v-9h3v1.3c1.4-2.6 6-2.8 6 2.5z" />
          </svg>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">LinkedIn</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">Connections.csv</div>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-mono text-slate-500">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
          >
            504 contacts · 218 KB
          </motion.span>
        </div>
      </motion.div>

      {/* Arrow / flight path */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 0.45, scaleX: 1 }}
        transition={{ delay: 0.45, duration: 0.35, ease: EASE_OUT }}
        className="absolute left-[26%] top-[44%] h-[2px] w-[280px] origin-left bg-[#D7F548]"
      />

      {/* Imported contact rows — fly in one by one */}
      <div className="absolute right-[6%] top-[12%] flex w-[520px] flex-col gap-2.5">
        {IMPORTED.map((c) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: c.delay, duration: 0.35, ease: EASE_OUT }}
            className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
          >
            <span className={`${TIER_BG[c.tier]} flex h-5 w-14 items-center justify-center rounded text-[10px] font-bold tracking-wider text-white`}>
              {c.tier}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">{c.name}</div>
              <div className="truncate text-[11px] text-slate-500">{c.firm}</div>
            </div>
            <div className="font-mono text-lg font-black tabular-nums text-[#1D3FE0]">{c.score}</div>
          </motion.div>
        ))}
      </div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute bottom-[8%] left-[6%] font-heading text-[90px] font-bold leading-[0.95] text-white"
      >
        one drag.<br />five hundred paths.
      </motion.div>
    </div>
  );
}
