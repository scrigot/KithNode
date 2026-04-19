"use client";

import { motion } from "framer-motion";
import { BlueBg, ScoreTicker, TierChip } from "../primitives";

const BADGES = ["UNC", "Chi Phi", "NC"];
const FACTORS = [
  { label: "Fit", value: 40, color: "#3661FF" },
  { label: "Affinity", value: 25, color: "#D7F548" },
  { label: "Signal", value: 10, color: "#22C55E" },
  { label: "Reach", value: 3, color: "#60A5FA" },
];

export function ScoreBreakdown() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -3, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5, scale: [0.88, 1.04, 1] }}
        transition={{
          opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          rotate: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.55, times: [0, 0.7, 1], ease: [0.22, 1, 0.36, 1] },
        }}
        className="absolute left-[10%] top-[18%] w-[820px] rounded-[20px] bg-white p-10 shadow-[0_40px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-heading text-4xl font-bold text-slate-900">Morgan Reyes</div>
            <div className="mt-2 text-lg text-slate-500">VP, M&amp;A &middot; Goldman Sachs</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-heading text-7xl font-black text-[#1D3FE0]">
              <ScoreTicker to={78} />
            </div>
            <div className="mt-1"><TierChip tier="warm" /></div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {BADGES.map((b, i) => (
            <motion.span
              key={b}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-full bg-[#1D3FE0]/10 px-4 py-1.5 text-sm font-semibold text-[#1D3FE0]"
            >
              {b}
            </motion.span>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {FACTORS.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.08 }}
              className="flex items-center gap-4"
            >
              <span className="w-24 text-sm font-semibold uppercase tracking-wide text-slate-500">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.value * 2}%` }}
                  transition={{ delay: 0.7 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: f.color }}
                />
              </div>
              <span className="w-10 text-right font-mono text-sm font-bold text-slate-700">+{f.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.5 }}
        className="absolute bottom-[12%] right-[8%] text-right font-heading text-[100px] font-bold leading-[0.95] text-white"
      >
        every<br />connection,<br />scored.
      </motion.div>
    </div>
  );
}
