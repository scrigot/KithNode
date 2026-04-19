"use client";

import { motion, useReducedMotion, type MotionValue } from "framer-motion";
import { useMemo } from "react";

// Seeded positions across a 1000x600 viewBox. Hand-placed to feel sparse
// and intentional, not chaotic. Percentages map onto the hero box.
const NODES: { x: number; y: number; r: number }[] = [
  { x: 80, y: 110, r: 2.5 },
  { x: 170, y: 280, r: 3 },
  { x: 240, y: 90, r: 2 },
  { x: 340, y: 220, r: 3.5 },
  { x: 420, y: 380, r: 2 },
  { x: 500, y: 140, r: 3 },
  { x: 560, y: 320, r: 2.5 },
  { x: 640, y: 60, r: 2 },
  { x: 700, y: 250, r: 3 },
  { x: 780, y: 400, r: 2.5 },
  { x: 850, y: 150, r: 3 },
  { x: 900, y: 310, r: 2 },
  { x: 940, y: 480, r: 2.5 },
  { x: 120, y: 460, r: 2 },
  { x: 380, y: 530, r: 3 },
];

// Sparse network — ~1.2 edges per node average
const EDGES: [number, number][] = [
  [0, 2],
  [0, 1],
  [1, 3],
  [2, 5],
  [3, 4],
  [3, 6],
  [5, 7],
  [5, 8],
  [6, 9],
  [7, 10],
  [8, 10],
  [8, 11],
  [10, 11],
  [11, 12],
  [9, 14],
  [13, 1],
  [14, 6],
];

function cubicPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Curvature offset perpendicular-ish to the segment, deterministic per pair
  const mx = (a.x + b.x) / 2 + dy * 0.15;
  const my = (a.y + b.y) / 2 - dx * 0.15;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

export function HeroNetwork({ parallaxY }: { parallaxY: MotionValue<number> }) {
  const reduce = useReducedMotion();

  const paths = useMemo(
    () => EDGES.map(([i, j]) => cubicPath(NODES[i], NODES[j])),
    [],
  );

  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      style={{ y: parallaxY }}
    >
      <defs>
        <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {paths.map((d, i) => (
        <motion.path
          key={`edge-${i}`}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={1}
          strokeLinecap="round"
          initial={reduce ? { pathLength: 1, opacity: 0.14 } : { pathLength: 0, opacity: 0 }}
          animate={
            reduce
              ? { pathLength: 1, opacity: 0.14 }
              : {
                  pathLength: [0, 1, 1, 0],
                  opacity: [0, 0.18, 0.18, 0],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: 10,
                  times: [0, 0.35, 0.75, 1],
                  repeat: Infinity,
                  delay: (i % 6) * 1.2,
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {NODES.map((n, i) => (
        <g key={`node-${i}`}>
          {/* soft halo */}
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={n.r * 3}
            fill="url(#node-glow)"
            initial={{ opacity: 0.18 }}
            animate={
              reduce
                ? { opacity: 0.18 }
                : { opacity: [0.1, 0.3, 0.1] }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: 4 + (i % 4),
                    repeat: Infinity,
                    delay: (i % 5) * 0.6,
                    ease: "easeInOut",
                  }
            }
          />
          {/* core node */}
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill="rgba(255,255,255,0.55)"
            initial={{ opacity: 0.5 }}
            animate={
              reduce
                ? { opacity: 0.5 }
                : { opacity: [0.35, 0.7, 0.35] }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration: 3 + (i % 3),
                    repeat: Infinity,
                    delay: (i % 4) * 0.5,
                    ease: "easeInOut",
                  }
            }
          />
        </g>
      ))}
    </motion.svg>
  );
}
