"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BlueBg, BloomFlash, EASE_OUT, ScoreTicker, TierChip } from "../primitives";

type Tier = "hot" | "warm" | "monitor" | "cold";
const CARDS: { name: string; firm: string; score: number; tier: Tier; rot: number; x: string; y: string; delay: number }[] = [
  { name: "Morgan Reyes", firm: "Goldman Sachs", score: 91, tier: "hot", rot: -4, x: "6%", y: "12%", delay: 0.1 },
  { name: "Ava Shah", firm: "Evercore", score: 84, tier: "hot", rot: 3, x: "32%", y: "28%", delay: 0.25 },
  { name: "Marcus Ellery", firm: "Morgan Stanley", score: 72, tier: "warm", rot: -2, x: "58%", y: "10%", delay: 0.4 },
  { name: "Elise Navarro", firm: "Lazard", score: 58, tier: "monitor", rot: 5, x: "12%", y: "52%", delay: 0.55 },
  { name: "Theo Brennan", firm: "Houlihan", score: 41, tier: "monitor", rot: -3, x: "55%", y: "48%", delay: 0.7 },
];

export function RankedDashboard() {
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHighlight((i) => (i + 1) % CARDS.length), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0">
      <BlueBg />

      {CARDS.map((c, idx) => {
        const isActive = idx === highlight;
        const depth = 0.75 + (idx % 2) * 0.25;
        return (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 40, rotate: c.rot - 4, scale: 0.82 }}
            animate={{
              opacity: 1,
              y: isActive ? -18 : 0,
              rotate: c.rot,
              scale: [0.82, 1.08, isActive ? 1.08 : 1],
              filter: ["blur(8px)", "blur(0px)", "blur(0px)"],
            }}
            transition={{
              opacity: { delay: c.delay, duration: 0.45, ease: EASE_OUT },
              scale: {
                delay: c.delay,
                duration: 0.6,
                times: [0, 0.7, 1],
                ease: EASE_OUT,
              },
              filter: { delay: c.delay, duration: 0.4, times: [0, 0.6, 1] },
              y: { type: "spring", stiffness: 240, damping: 18 },
              rotate: { delay: c.delay, duration: 0.55, ease: EASE_OUT },
            }}
            style={{
              left: c.x,
              top: c.y,
              zIndex: isActive ? 10 : 1,
              transform: `translateZ(0) scale(${depth})`,
            }}
            className="absolute w-[360px] rounded-[18px] bg-white p-6 shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-heading text-xl font-bold text-slate-900">{c.name}</div>
                <div className="mt-0.5 text-sm text-slate-500">{c.firm}</div>
              </div>
              <div className="font-heading text-4xl font-black text-[#1D3FE0] tabular-nums">
                <ScoreTicker to={c.score} duration={1.2} />
              </div>
            </div>
            <div className="mt-4"><TierChip tier={c.tier} /></div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: [1, 1.04, 1] }}
        transition={{
          opacity: { delay: 1.1, duration: 0.4 },
          scale: { delay: 1.5, duration: 2.0, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-[8%] right-[5%] flex flex-col items-end text-right text-white"
      >
        <div className="font-heading text-[180px] font-black leading-none tracking-tighter tabular-nums">
          <ScoreTicker from={212} to={300} duration={2.4} />%
        </div>
        <div className="mt-1 font-heading text-[40px] font-bold leading-none tracking-tight uppercase text-[#D7F548]">
          response rate
        </div>
      </motion.div>

      <BloomFlash delay={1.4} />
    </div>
  );
}
