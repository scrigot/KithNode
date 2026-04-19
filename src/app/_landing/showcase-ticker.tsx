"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EVENTS = [
  "Riley Chen responded · 2m ago",
  "Nisha Rao meeting confirmed · 12m ago",
  "Ben Kaminski replied to intro · 1h ago",
  "New warm path found: Drew → Evercore · 2h ago",
  "Miles Park added to pipeline · 3h ago",
];

export function ShowcaseTicker() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % EVENTS.length), 3000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-sm">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
        animate={reduce ? undefined : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
        transition={
          reduce ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Live
      </span>
      <div className="relative h-5 min-w-[280px] overflow-hidden sm:min-w-[340px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 flex items-center text-xs font-medium text-slate-700"
          >
            {EVENTS[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
