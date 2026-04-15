"use client";

import { motion } from "framer-motion";
import { BlueBg } from "../primitives";

type Node = { x: number; y: number; label?: string; firm?: string; cluster: number; delay: number };

const CLUSTERS = [
  { cx: 520, cy: 360, color: "#FFFFFF" },
  { cx: 1380, cy: 320, color: "#D7F548" },
  { cx: 600, cy: 780, color: "#FFFFFF" },
  { cx: 1320, cy: 760, color: "#D7F548" },
];

const NODES: Node[] = [];
const NAMED = [
  { cluster: 0, label: "Jack M.", firm: "Goldman" },
  { cluster: 0, label: "Priya P.", firm: "Evercore" },
  { cluster: 1, label: "Marcus C.", firm: "MS" },
  { cluster: 1, label: "Ellie R.", firm: "Lazard" },
  { cluster: 2, label: "Tom O.", firm: "Houlihan" },
  { cluster: 2, label: "Aarya S.", firm: "Citi" },
  { cluster: 3, label: "Diego L.", firm: "PJT" },
  { cluster: 3, label: "Mei W.", firm: "Centerview" },
];

const rand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

let seed = 1;
for (let c = 0; c < CLUSTERS.length; c++) {
  for (let i = 0; i < 12; i++) {
    const angle = rand(seed++) * Math.PI * 2;
    const radius = 40 + rand(seed++) * 180;
    NODES.push({
      x: CLUSTERS[c].cx + Math.cos(angle) * radius,
      y: CLUSTERS[c].cy + Math.sin(angle) * radius,
      cluster: c,
      delay: 0.2 + (c * 0.1) + i * 0.04,
    });
  }
}

NAMED.forEach((n, i) => {
  const angle = (i / NAMED.length) * Math.PI * 2;
  NODES.push({
    x: CLUSTERS[n.cluster].cx + Math.cos(angle) * 140,
    y: CLUSTERS[n.cluster].cy + Math.sin(angle) * 140,
    cluster: n.cluster,
    label: n.label,
    firm: n.firm,
    delay: 1.4 + i * 0.14,
  });
});

const ME = { x: 960, y: 540 };

export function ConnectionMap() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <BlueBg />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1920 1080">
        {CLUSTERS.map((c, i) => (
          <motion.line
            key={`trunk-${i}`}
            x1={ME.x}
            y1={ME.y}
            x2={c.cx}
            y2={c.cy}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
          />
        ))}

        {NODES.map((n, i) => (
          <motion.line
            key={`edge-${i}`}
            x1={CLUSTERS[n.cluster].cx}
            y1={CLUSTERS[n.cluster].cy}
            x2={n.x}
            y2={n.y}
            stroke={CLUSTERS[n.cluster].color}
            strokeWidth={0.8}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.25 }}
            transition={{ delay: n.delay, duration: 0.4 }}
          />
        ))}

        {NODES.map((n, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.label ? 8 : 4}
            fill={CLUSTERS[n.cluster].color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.3, 1],
              opacity: n.label ? 1 : 0.75,
            }}
            transition={{ delay: n.delay, duration: 0.4, ease: "easeOut" }}
          />
        ))}

        <motion.circle
          cx={ME.x}
          cy={ME.y}
          r={22}
          fill="#FFFFFF"
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {NODES.filter((n) => n.label).map((n, i) => (
        <motion.div
          key={`label-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: n.delay + 0.2, duration: 0.3 }}
          className="absolute whitespace-nowrap rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-[#1D3FE0]"
          style={{
            left: n.x,
            top: n.y + 14,
            transform: "translateX(-50%)",
          }}
        >
          {n.label} <span className="text-slate-500">&middot; {n.firm}</span>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="absolute left-[6%] top-[6%] font-heading text-[72px] font-bold leading-[0.95] tracking-tight text-white"
      >
        500+ warm paths<br />mapped, scored, ranked.
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.4 }}
        className="absolute bottom-[6%] right-[6%] text-right font-mono text-xl font-bold tracking-widest text-[#D7F548]"
      >
        UPDATED IN REAL TIME
      </motion.div>
    </div>
  );
}
