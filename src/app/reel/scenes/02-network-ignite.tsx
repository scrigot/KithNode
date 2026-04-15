"use client";

import { motion } from "framer-motion";
import { BLUE } from "../primitives";

const COLS = 13;
const ROWS = 8;
const STEP_X = 1920 / (COLS + 1);
const STEP_Y = 1080 / (ROWS + 1);

const GRID: { x: number; y: number; base: number; wave: number }[] = [];
for (let cx = 1; cx <= COLS; cx++) {
  for (let cy = 1; cy <= ROWS; cy++) {
    GRID.push({
      x: cx * STEP_X,
      y: cy * STEP_Y,
      base: 6 + ((cx * 7 + cy * 3) % 12),
      wave: (cx + cy) * 0.08,
    });
  }
}

const YOU = { x: 1920 / 2, y: 1080 / 2 };
const ALUMNI = [
  { x: YOU.x - 380, y: YOU.y - 220, label: "UNC", delay: 0.6 },
  { x: YOU.x + 360, y: YOU.y - 200, label: "Chi Phi", delay: 0.95 },
  { x: YOU.x - 340, y: YOU.y + 240, label: "Charlotte", delay: 1.3 },
  { x: YOU.x + 400, y: YOU.y + 220, label: "Goldman", delay: 1.65 },
];

export function NetworkIgnite() {
  return (
    <div className="absolute inset-0 bg-white">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1920 1080">
        {GRID.map((p, i) => (
          <motion.rect
            key={i}
            x={p.x - p.base / 2}
            y={p.y - p.base / 2}
            width={p.base}
            height={p.base}
            fill={BLUE}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.15, 1, 0.15],
              scale: [0.6, 1.4, 0.6],
            }}
            transition={{
              duration: 2.2,
              delay: p.wave,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {ALUMNI.map((a, i) => (
          <motion.line
            key={i}
            x1={YOU.x}
            y1={YOU.y}
            x2={a.x}
            y2={a.y}
            stroke={BLUE}
            strokeWidth={2}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ delay: a.delay, duration: 0.5, ease: "easeOut" }}
          />
        ))}

        {ALUMNI.map((a, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={a.x}
            cy={a.y}
            r={20}
            fill={BLUE}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.25, 1] }}
            transition={{
              scale: {
                delay: a.delay + 0.3,
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          />
        ))}

        <motion.circle
          cx={YOU.x}
          cy={YOU.y}
          r={34}
          fill={BLUE}
          initial={{ scale: 0 }}
          animate={{
            scale: [1, 1.15, 1],
            filter: [
              "drop-shadow(0 0 20px rgba(29,63,224,0.3))",
              "drop-shadow(0 0 40px rgba(29,63,224,0.7))",
              "drop-shadow(0 0 20px rgba(29,63,224,0.3))",
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {ALUMNI.map((a, i) => (
        <motion.div
          key={`label-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: a.delay + 0.35, duration: 0.3 }}
          className="absolute rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#1D3FE0] shadow-[0_4px_16px_rgba(29,63,224,0.25)]"
          style={{
            left: a.x,
            top: a.y - 50,
            transform: "translate(-50%, -100%)",
          }}
        >
          {a.label}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.4 }}
        className="absolute top-[8%] left-[8%] font-heading text-[96px] font-bold leading-[0.95] tracking-tight"
        style={{ color: BLUE }}
      >
        your network is<br />bigger than you think.
      </motion.div>
    </div>
  );
}
