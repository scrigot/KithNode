"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CROSSFADE_IDS, TIMELINE, TOTAL_DURATION_MS } from "./timeline";
import { CameraDrift, ChromaticShift, GrainOverlay } from "./primitives";

export default function ReelPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const current = TIMELINE[index];
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % TIMELINE.length);
    }, current.durationMs);
    return () => clearTimeout(t);
  }, [index]);

  const scene = TIMELINE[index];
  const Scene = scene.component;
  const crossfade = CROSSFADE_IDS.has(scene.id);

  return (
    <div
      className="relative overflow-hidden bg-[#0A1628] text-text-primary"
      style={{ width: 1920, height: 1080 }}
    >
      <CameraDrift>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={crossfade ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={crossfade ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: crossfade ? 0.55 : 0, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Scene />
          </motion.div>
        </AnimatePresence>
      </CameraDrift>

      <ChromaticShift scene={scene.id} />
      <GrainOverlay />
      <ProgressBar index={index} />
    </div>
  );
}

function ProgressBar({ index }: { index: number }) {
  const elapsed = TIMELINE.slice(0, index).reduce((s, x) => s + x.durationMs, 0);
  const pct = (elapsed / TOTAL_DURATION_MS) * 100;
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 h-0.5 bg-white/5">
      <motion.div
        className="h-full bg-[#0EA5E9]"
        initial={{ width: `${pct}%` }}
        animate={{ width: `${pct + (TIMELINE[index].durationMs / TOTAL_DURATION_MS) * 100}%` }}
        transition={{ duration: TIMELINE[index].durationMs / 1000, ease: "linear" }}
      />
    </div>
  );
}
