"use client";

import { motion } from "framer-motion";
import { BlueBg, EASE_OUT } from "../primitives";

// Three nodes: You -> Intermediary (Chi Phi) -> Target (firm).
// The lines draw themselves, the nodes pop in sequence, and the chain text
// materializes below as a mono-font caption.

const Y = 540;
const YOU = { x: 300, y: Y, label: "YOU" };
const MID = { x: 960, y: Y, label: "JAKE BENNETT", sub: "Chi Phi '24 · UNC" };
const TGT = { x: 1620, y: Y, label: "ELENA RUIZ", sub: "Associate · Moelis" };

export function WarmPathChain() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1920 1080">
        {/* Line You -> Mid */}
        <motion.path
          d={`M ${YOU.x + 50} ${Y} Q ${(YOU.x + MID.x) / 2} ${Y - 80}, ${MID.x - 80} ${Y}`}
          fill="none"
          stroke="#D7F548"
          strokeWidth={3}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ delay: 0.4, duration: 0.5, ease: EASE_OUT }}
        />

        {/* Line Mid -> Tgt */}
        <motion.path
          d={`M ${MID.x + 80} ${Y} Q ${(MID.x + TGT.x) / 2} ${Y + 80}, ${TGT.x - 50} ${Y}`}
          fill="none"
          stroke="#D7F548"
          strokeWidth={3}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ delay: 0.95, duration: 0.5, ease: EASE_OUT }}
        />

        {/* Animated pulse dot traveling the line */}
        <motion.circle
          r={10}
          fill="#FFFFFF"
          initial={{ cx: YOU.x + 50, cy: Y, opacity: 0 }}
          animate={{
            cx: [YOU.x + 50, MID.x, TGT.x - 50],
            cy: [Y, Y - 40, Y],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ delay: 1.4, duration: 1.1, times: [0, 0.45, 1], ease: "easeInOut" }}
        />
      </svg>

      {/* YOU node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT }}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: YOU.x, top: Y }}
      >
        <div className="flex h-[90px] w-[90px] items-center justify-center rounded-full border-4 border-white bg-white/20 text-sm font-bold text-white backdrop-blur-sm">
          YOU
        </div>
      </motion.div>

      {/* MID node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1], opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.45, times: [0, 0.7, 1], ease: EASE_OUT }}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: MID.x, top: Y }}
      >
        <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#D7F548] text-sm font-black text-[#0E2BB8] shadow-[0_0_40px_rgba(215,245,72,0.6)]">
          CHI PHI
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.3 }}
          className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#1D3FE0] shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        >
          {MID.label}
        </motion.div>
      </motion.div>

      {/* TGT node */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1], opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.45, times: [0, 0.7, 1], ease: EASE_OUT }}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: TGT.x, top: Y }}
      >
        <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-red-500 text-xs font-black tracking-wider text-white shadow-[0_0_40px_rgba(239,68,68,0.6)]">
          MOELIS
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.3 }}
          className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        >
          {TGT.label}
        </motion.div>
      </motion.div>

      {/* Headline top */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="absolute top-[10%] left-1/2 -translate-x-1/2 text-center font-heading text-[92px] font-bold leading-[0.95] tracking-tight text-white"
      >
        warm paths you<br />didn&apos;t know existed.
      </motion.div>

      {/* Mono chain caption */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.85, duration: 0.4 }}
        className="absolute bottom-[12%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/30 px-6 py-3 text-center font-mono text-xl tracking-wider text-[#D7F548] backdrop-blur-sm"
      >
        you → jake bennett (chi phi) → associate @ moelis
      </motion.div>
    </div>
  );
}
