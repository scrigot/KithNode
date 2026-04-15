"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

export const BLUE = "#1D3FE0";
export const BLUE_BRIGHT = "#3661FF";
export const BLUE_DEEP = "#0E2BB8";
export const LIME = "#D7F548";
export const CREAM = "#F4F1EA";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;

export const ANTICIPATE = {
  scale: [0.9, 0.97, 1.06, 1],
  opacity: [0, 0.6, 1, 1],
};
export const ANTICIPATE_TIMING = {
  duration: 0.55,
  times: [0, 0.15, 0.7, 1],
  ease: EASE_OUT,
};

export function GrainOverlay() {
  return <div className="pointer-events-none absolute inset-0 z-50 grain-overlay" />;
}

export function CameraDrift({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ scale: [1, 1.012, 1] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function BloomFlash({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.12, 0] }}
      transition={{ delay, duration: 0.22, times: [0, 0.2, 1], ease: "easeOut" }}
      style={{
        background:
          "radial-gradient(ellipse at 75% 85%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 55%)",
      }}
    />
  );
}

export function ChromaticShift({ scene }: { scene: string }) {
  return (
    <motion.div
      key={scene}
      className="pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 0.8, filter: "blur(6px) hue-rotate(15deg)" }}
      animate={{ opacity: 0, filter: "blur(0px) hue-rotate(0deg)" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        background:
          "linear-gradient(90deg, rgba(255,0,60,0.12) 0%, transparent 40%, transparent 60%, rgba(0,180,255,0.12) 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
}

export function BlueBg() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          `radial-gradient(ellipse at 20% 20%, ${BLUE_BRIGHT} 0%, ${BLUE} 45%, ${BLUE_DEEP} 100%)`,
          `radial-gradient(ellipse at 80% 30%, ${BLUE_BRIGHT} 0%, ${BLUE} 45%, ${BLUE_DEEP} 100%)`,
          `radial-gradient(ellipse at 30% 80%, ${BLUE_BRIGHT} 0%, ${BLUE} 45%, ${BLUE_DEEP} 100%)`,
          `radial-gradient(ellipse at 20% 20%, ${BLUE_BRIGHT} 0%, ${BLUE} 45%, ${BLUE_DEEP} 100%)`,
        ],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function CreamBg() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          `radial-gradient(ellipse at 30% 30%, #FFFFFF 0%, ${CREAM} 60%, #E6DFD0 100%)`,
          `radial-gradient(ellipse at 70% 50%, #FFFFFF 0%, ${CREAM} 60%, #E6DFD0 100%)`,
          `radial-gradient(ellipse at 30% 30%, #FFFFFF 0%, ${CREAM} 60%, #E6DFD0 100%)`,
        ],
      }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function ScoreTicker({
  to,
  from = 0,
  duration = 1.6,
}: {
  to: number;
  from?: number;
  duration?: number;
}) {
  const mv = useMotionValue(from);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    const controls = animate(mv, to, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, duration, mv, rounded]);

  return <span className="tabular-nums">{display}</span>;
}

export function TypewriterLine({
  text,
  delay = 0,
  cps = 55,
}: {
  text: string;
  delay?: number;
  cps?: number;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 1000 / cps);
    }, delay * 1000);
    return () => clearTimeout(start);
  }, [text, delay, cps]);

  return <span>{shown}</span>;
}

type KineticWord = {
  text: string;
  x: string;
  y: string;
  delay: number;
  size?: string;
  font?: "serif" | "sans";
  color?: string;
};

export function KineticWords({ words, startOpen = false }: { words: KineticWord[]; startOpen?: boolean }) {
  return (
    <div className="absolute inset-0">
      {words.map((w, i) => {
        const basePx = parseInt(w.size ?? "180", 10);
        const driftX = ((i * 37) % 20) - 10;
        const driftY = ((i * 53) % 16) - 8;
        return (
          <motion.div
            key={i}
            initial={startOpen ? { opacity: 0.55, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: [0, driftY, 0],
              x: [0, driftX, 0],
              scale: [1, 1.04, 1],
            }}
            transition={{
              opacity: { delay: w.delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              y: { delay: w.delay + 0.5, duration: 3.6 + (i % 3), repeat: Infinity, ease: "easeInOut" },
              x: { delay: w.delay + 0.5, duration: 3.2 + (i % 3), repeat: Infinity, ease: "easeInOut" },
              scale: { delay: w.delay + 0.5, duration: 2.8 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute font-bold tracking-tight"
            style={{
              left: w.x,
              top: w.y,
              fontSize: `${basePx}px`,
              fontFamily:
                w.font === "serif"
                  ? "Georgia, 'Times New Roman', serif"
                  : "var(--font-heading), system-ui, sans-serif",
              color: w.color ?? "#FFFFFF",
              lineHeight: 1,
            }}
          >
            {w.text}
          </motion.div>
        );
      })}
    </div>
  );
}

export function TierChip({ tier }: { tier: "hot" | "warm" | "monitor" | "cold" }) {
  const map = {
    hot: { bg: "#EF4444", label: "HOT" },
    warm: { bg: "#3B82F6", label: "WARM" },
    monitor: { bg: "#F59E0B", label: "MONITOR" },
    cold: { bg: "#64748B", label: "COLD" },
  };
  const t = map[tier];
  return (
    <span
      className="inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-white"
      style={{ backgroundColor: t.bg }}
    >
      {t.label}
    </span>
  );
}
