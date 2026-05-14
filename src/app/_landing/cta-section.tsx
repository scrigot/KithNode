"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";

// ---------------------------------------------------------------------------
// Dense mesh -- more nodes + edges than solutions-section (this is the climax)
// ---------------------------------------------------------------------------

const MESH_NODES = [
  { x: 2,  y: 5  }, { x: 12, y: 2  }, { x: 22, y: 8  }, { x: 32, y: 3  },
  { x: 42, y: 7  }, { x: 52, y: 2  }, { x: 62, y: 6  }, { x: 72, y: 3  },
  { x: 82, y: 8  }, { x: 92, y: 4  }, { x: 7,  y: 16 }, { x: 17, y: 20 },
  { x: 27, y: 14 }, { x: 37, y: 18 }, { x: 47, y: 13 }, { x: 57, y: 17 },
  { x: 67, y: 14 }, { x: 77, y: 19 }, { x: 87, y: 15 }, { x: 97, y: 18 },
  { x: 3,  y: 30 }, { x: 13, y: 33 }, { x: 23, y: 28 }, { x: 33, y: 35 },
  { x: 43, y: 27 }, { x: 53, y: 32 }, { x: 63, y: 29 }, { x: 73, y: 34 },
  { x: 83, y: 26 }, { x: 93, y: 31 }, { x: 8,  y: 45 }, { x: 18, y: 48 },
  { x: 28, y: 43 }, { x: 38, y: 50 }, { x: 48, y: 44 }, { x: 58, y: 49 },
  { x: 68, y: 42 }, { x: 78, y: 47 }, { x: 88, y: 43 }, { x: 98, y: 46 },
  { x: 4,  y: 60 }, { x: 14, y: 63 }, { x: 24, y: 57 }, { x: 34, y: 64 },
  { x: 44, y: 58 }, { x: 54, y: 62 }, { x: 64, y: 56 }, { x: 74, y: 61 },
  { x: 84, y: 58 }, { x: 94, y: 63 }, { x: 9,  y: 75 }, { x: 19, y: 79 },
  { x: 29, y: 72 }, { x: 39, y: 78 }, { x: 49, y: 73 }, { x: 59, y: 77 },
  { x: 69, y: 70 }, { x: 79, y: 76 }, { x: 89, y: 73 }, { x: 5,  y: 88 },
  { x: 20, y: 92 }, { x: 35, y: 86 }, { x: 50, y: 90 }, { x: 65, y: 85 },
  { x: 80, y: 91 }, { x: 95, y: 87 },
];

const MESH_EDGES: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let i = 0; i < MESH_NODES.length; i++) {
  const a = MESH_NODES[i];
  const distances = MESH_NODES
    .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
    .filter(({ j }) => j !== i)
    .sort((p, q) => p.d - q.d)
    .slice(0, 3); // 3 nearest vs 2 in solutions-section = denser graph
  for (const { j } of distances) {
    if (j > i) {
      const b = MESH_NODES[j];
      MESH_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
}

// ---------------------------------------------------------------------------
// Convergence lines -- paths that radiate from the edges inward toward center
// Used for framer-motion pathLength draw animation
// ---------------------------------------------------------------------------

const CONVERGENCE_PATHS = [
  "M 5 5 Q 30 25 50 50",
  "M 95 5 Q 70 25 50 50",
  "M 5 95 Q 30 72 50 50",
  "M 95 95 Q 70 72 50 50",
  "M 50 2 Q 50 26 50 50",
  "M 2 50 Q 26 50 50 50",
  "M 98 50 Q 74 50 50 50",
  "M 50 98 Q 50 74 50 50",
  "M 20 10 Q 35 30 50 50",
  "M 80 10 Q 65 30 50 50",
  "M 10 75 Q 30 63 50 50",
  "M 90 75 Q 70 63 50 50",
] as const;

// ---------------------------------------------------------------------------
// CountUp -- same pattern as solutions-section
// ---------------------------------------------------------------------------

function CountUp({ end }: { end: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current || !ref.current) return;
    started.current = true;

    const duration = 1800;
    const startTime = performance.now();
    const el = ref.current;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * end);
      if (el) el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [isInView, end]);

  return <span ref={ref}>0</span>;
}

// ---------------------------------------------------------------------------
// ConvergenceLine -- single animated path drawing toward center
// ---------------------------------------------------------------------------

function ConvergenceLine({ d, delay }: { d: string; delay: number }) {
  return (
    <motion.path
      d={d}
      stroke="#0EA5E9"
      strokeWidth="0.4"
      strokeOpacity="0.5"
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.5, 0.5, 0] }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        repeatDelay: 1,
        ease: "easeInOut",
        times: [0, 0.4, 0.7, 1],
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// CTASection
// ---------------------------------------------------------------------------

export function CTASection() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-black py-32 px-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes mesh-pulse-cta {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.8; }
        }
        .cta-mesh-node {
          animation: mesh-pulse-cta var(--d, 3s) ease-in-out infinite;
        }

        @keyframes radial-glow-pulse {
          0%, 100% { opacity: 0.10; }
          50%       { opacity: 0.22; }
        }
        .cta-radial-glow {
          animation: radial-glow-pulse 4s ease-in-out infinite;
        }

        @keyframes cta-btn-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(14,165,233,0.4), 0 0 80px rgba(14,165,233,0.15); }
          50%       { box-shadow: 0 0 60px rgba(14,165,233,0.6), 0 0 120px rgba(14,165,233,0.25); }
        }
        .cta-btn-primary {
          animation: cta-btn-glow-pulse 3s ease-in-out infinite;
        }
        .cta-btn-primary:hover {
          animation: none;
          box-shadow: 0 0 80px rgba(14,165,233,0.7), 0 0 140px rgba(14,165,233,0.3);
          transform: translateY(-2px);
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Dense SVG mesh background */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        {/* Pulsing radial teal glow */}
        <div
          className="cta-radial-glow absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at center, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0.06) 40%, transparent 70%)",
          }}
        />
        {/* Static secondary halo -- always visible, no animation */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 40% 35% at center, rgba(14,165,233,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Dense dot + line mesh */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Static mesh edges */}
          {MESH_EDGES.map((e, i) => (
            <line
              key={i}
              x1={`${e.x1}%`}
              y1={`${e.y1}%`}
              x2={`${e.x2}%`}
              y2={`${e.y2}%`}
              stroke="#0EA5E9"
              strokeOpacity="0.10"
              strokeWidth="0.12"
            />
          ))}
          {/* Pulsing nodes */}
          {MESH_NODES.map((n, i) => (
            <circle
              key={i}
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r="0.35"
              fill="#0EA5E9"
              className="cta-mesh-node"
              style={{ "--d": `${2.2 + (i % 7) * 0.35}s` } as React.CSSProperties}
            />
          ))}

          {/* Convergence paths -- framer-motion animated, drawing toward center */}
          {CONVERGENCE_PATHS.map((d, i) => (
            <ConvergenceLine
              key={i}
              d={d}
              delay={i * 0.5}
            />
          ))}

          {/* Center node -- the destination of all convergence lines */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="1.2"
            fill="#0EA5E9"
            animate={{ r: [1.2, 2.0, 1.2], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="2.5"
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="0.3"
            animate={{ r: [2.5, 4.5], opacity: [0.4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content -- scroll-reveal wrapper */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="relative mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Eyebrow label */}
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 backdrop-blur-sm"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
            Private Alpha Open
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          className="font-heading text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          Your{" "}
          <span className="text-[#0EA5E9]">warm path</span>{" "}
          to the{" "}
          <br className="hidden md:block" />
          room where it happens.
        </motion.h2>

        {/* Subhead */}
        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg text-white/70"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.22, ease: "easeOut" }}
        >
          KithNode maps every alumni connection between you and your target firms,
          scores them, and drafts the outreach that actually gets a response.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.30, ease: "easeOut" }}
        >
          {/* Primary */}
          <Link
            href="/waitlist"
            className="cta-btn-primary relative rounded-xl bg-[#0EA5E9] px-8 py-4 text-lg font-semibold text-white transition-all duration-300"
          >
            Request Access
          </Link>

          {/* Secondary -- ghost border matching hero */}
          <Link
            href="#solutions"
            className="rounded-xl border border-white/20 bg-white/[0.04] px-8 py-4 text-lg font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/[0.08] hover:text-white"
          >
            See How It Works
          </Link>
        </motion.div>

        {/* Trust micro-row */}
        <motion.p
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-white/40"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <span>Used by students at</span>
          <span className="flex items-center gap-3">
            <span>UNC</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Wharton</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Stern</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Booth</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Georgetown</span>
          </span>
        </motion.p>

        {/* Live join counter */}
        <motion.div
          className="mt-10 inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-4 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.48, ease: "easeOut" }}
        >
          {/* Pulsing status dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0EA5E9] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
          </span>
          <span className="font-mono text-2xl font-bold tabular-nums text-[#0EA5E9]">
            <CountUp end={127} />{/* TODO: replace with real DB count */}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/50">
            students joined this week
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
