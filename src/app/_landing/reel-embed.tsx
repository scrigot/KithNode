"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CROSSFADE_IDS, TIMELINE } from "../reel/timeline";
import { CameraDrift, ChromaticShift, GrainOverlay } from "../reel/primitives";

export function ReelEmbed() {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const outerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (outerRef.current) {
      setScale(outerRef.current.offsetWidth / 1920);
    }
  }, []);

  useEffect(() => {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [updateScale]);

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
      ref={outerRef}
      className="relative w-full overflow-hidden rounded-[20px] shadow-[0_30px_80px_rgba(29,63,224,0.25)]"
      style={{ aspectRatio: "16 / 9" }}
    >
      <div
        className="absolute left-0 top-0 bg-[#0A1628]"
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
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
      </div>
    </div>
  );
}
