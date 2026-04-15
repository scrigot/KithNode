"use client";

import { motion } from "framer-motion";
import { BlueBg } from "../primitives";

export function LogoLockup() {
  return (
    <div className="absolute inset-0">
      <BlueBg />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
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
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-4xl font-semibold italic text-white/85"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Your warmest path into finance.
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
          className="mt-10 text-xl font-bold uppercase tracking-[0.3em] text-[#D7F548]"
        >
          kithnode.com
        </motion.div>
      </div>
    </div>
  );
}
