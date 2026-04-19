"use client";

import { motion } from "framer-motion";
import { BlueBg } from "../primitives";

// Scene duration is 2.2s. Content fades in over the first 0.9s, holds, then
// gently dims to near-zero over the last 0.5s. This matches the empty-blue
// frame that cold-inbox starts on, so the loop back looks like nothing
// happened — pure blue in, pure blue out.
//
// Fade-out timing: outro starts at 1.7s of 2.2s (77%) and ends at 2.2s (100%).
export function LogoLockup() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      {/* Outro wrapper: dims all content in the last 500ms for a seamless loop */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0.02] }}
        transition={{ duration: 2.2, times: [0, 0.77, 1], ease: "easeIn" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-heading text-[260px] font-black leading-none tracking-tight text-white"
        >
          KithNode
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 text-4xl font-semibold italic text-white/85"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Your warmest path into finance.
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.35 }}
          className="mt-10 text-xl font-bold uppercase tracking-[0.3em] text-[#D7F548]"
        >
          kithnode.com
        </motion.div>
      </motion.div>
    </div>
  );
}
