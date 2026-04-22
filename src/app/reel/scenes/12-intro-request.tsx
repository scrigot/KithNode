"use client";

import { motion } from "framer-motion";
import { BlueBg, EASE_OUT } from "../primitives";

// "Or ask for an intro instead." — shows the modal for requesting a warm intro
// through Jake rather than cold-emailing the target. Shifts the product's
// voice from "cold outreach tool" to "trust-preserving network."

export function IntroRequest() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      {/* Modal card — scales in with a small rotate settle, matches ai-draft aesthetic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, rotate: -3 }}
        animate={{ opacity: 1, scale: [0.88, 1.04, 1], rotate: -1 }}
        transition={{
          opacity: { duration: 0.4, ease: EASE_OUT },
          scale: { duration: 0.55, times: [0, 0.7, 1], ease: EASE_OUT },
          rotate: { duration: 0.55, ease: EASE_OUT },
        }}
        className="absolute right-[8%] top-[12%] w-[820px] rounded-[22px] bg-white p-10 shadow-[0_40px_80px_rgba(0,0,0,0.3)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Request intro from
            </div>
            <div className="mt-1 font-heading text-3xl font-bold text-slate-900">
              Jake Bennett
            </div>
            <div className="mt-0.5 text-sm text-slate-500">Greek Life &middot; UNC &apos;24</div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#D7F548] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0E2BB8]">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[#0E2BB8]"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Warm path
          </div>
        </div>

        {/* To */}
        <div className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Asking for intro to
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="font-heading text-2xl font-bold text-slate-900">Elena Ruiz</div>
          <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white">
            HOT &middot; 82
          </span>
        </div>
        <div className="mt-1 text-sm text-slate-500">Associate &middot; Moelis &amp; Company</div>

        {/* Message body */}
        <div className="mt-6 rounded-[14px] border border-slate-200 bg-slate-50 p-5 text-base leading-relaxed text-slate-700">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.35 }}
          >
            Hey Jake, hope recruiting is wrapping up well. Would you be willing to intro me to Elena at Moelis? We&apos;d share a 15-min coffee. No pressure if the timing is off.
          </motion.span>
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.35 }}
          className="mt-6 flex gap-3"
        >
          <div className="flex-1 rounded-[12px] border border-slate-200 bg-white py-3 text-center text-sm font-bold uppercase tracking-wider text-slate-500">
            Cancel
          </div>
          <div className="relative flex-[2] overflow-hidden rounded-[12px] bg-[#1D3FE0] py-3 text-center text-sm font-bold uppercase tracking-wider text-white">
            Send intro request
            <motion.div
              className="absolute inset-0 bg-[#D7F548]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ delay: 1.45, duration: 0.45, ease: "easeInOut" }}
              style={{ mixBlendMode: "overlay", opacity: 0.7 }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Headline bottom-left */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute bottom-[10%] left-[6%] font-heading text-[92px] font-bold leading-[0.95] text-white"
      >
        or ask for<br />an intro.
      </motion.div>
    </div>
  );
}
