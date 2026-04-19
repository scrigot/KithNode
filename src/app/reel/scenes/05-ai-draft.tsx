"use client";

import { motion } from "framer-motion";
import { BlueBg, TypewriterLine } from "../primitives";

export function AiDraft() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 3.5, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, rotate: 1.2, scale: [0.88, 1.05, 1] }}
        transition={{
          opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          rotate: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.55, times: [0, 0.7, 1], ease: [0.22, 1, 0.36, 1] },
        }}
        className="absolute left-[22%] top-[14%] w-[900px] rounded-[22px] bg-white p-10 shadow-[0_40px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Draft to</div>
            <div className="mt-1 font-heading text-2xl font-bold text-slate-900">Morgan Reyes</div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#1D3FE0]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#1D3FE0]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1D3FE0]" />
            Claude drafting
          </div>
        </div>

        <div className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">Subject</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">
          <TypewriterLine text="Fellow NC kid at UNC, 15 min?" delay={0.15} cps={130} />
        </div>

        <div className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">Body</div>
        <div className="mt-2 text-lg leading-relaxed text-slate-700">
          <TypewriterLine
            text="Hi Morgan, Chi Phi '24 here at UNC. Saw your recent Goldman M&A post and had to reach out. Open to 15 min in the next two weeks?"
            delay={0.6}
            cps={200}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="absolute bottom-[10%] left-[6%] font-heading text-[90px] font-bold leading-[0.95] text-white"
      >
        real messages.<br />your voice.
      </motion.div>
    </div>
  );
}
