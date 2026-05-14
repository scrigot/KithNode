"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import { Link2, Brain, MessageCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// SVG mesh background -- same data as solutions-section and how-it-works
// (duplicated per-file for perf, no shared module)
// ---------------------------------------------------------------------------

const MESH_NODES = [
  { x: 5, y: 8 }, { x: 20, y: 5 }, { x: 35, y: 12 }, { x: 50, y: 6 },
  { x: 65, y: 10 }, { x: 80, y: 7 }, { x: 95, y: 4 }, { x: 12, y: 22 },
  { x: 28, y: 28 }, { x: 45, y: 20 }, { x: 60, y: 25 }, { x: 75, y: 18 },
  { x: 90, y: 22 }, { x: 3, y: 40 }, { x: 18, y: 45 }, { x: 33, y: 38 },
  { x: 50, y: 42 }, { x: 67, y: 36 }, { x: 82, y: 44 }, { x: 97, y: 38 },
  { x: 8, y: 60 }, { x: 25, y: 58 }, { x: 42, y: 62 }, { x: 58, y: 55 },
  { x: 73, y: 60 }, { x: 88, y: 57 }, { x: 14, y: 78 }, { x: 30, y: 75 },
  { x: 48, y: 80 }, { x: 64, y: 76 }, { x: 80, y: 82 }, { x: 95, y: 74 },
];

const MESH_EDGES: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let i = 0; i < MESH_NODES.length; i++) {
  const a = MESH_NODES[i];
  const distances = MESH_NODES
    .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
    .filter(({ j }) => j !== i)
    .sort((p, q) => p.d - q.d)
    .slice(0, 2);
  for (const { j } of distances) {
    if (j > i) {
      const b = MESH_NODES[j];
      MESH_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
}

// ---------------------------------------------------------------------------
// Illustration 01 -- network nodes appearing and connecting
// ---------------------------------------------------------------------------

const NET_NODES_VP = [
  { cx: 20, cy: 20 },
  { cx: 56, cy: 12 },
  { cx: 96, cy: 28 },
  { cx: 36, cy: 64 },
  { cx: 80, cy: 68 },
];

const NET_EDGES_VP = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 0, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 4 },
];

function NetworkFormingVP() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isInView) {
      setPhase(0);
      return;
    }
    let current = 0;
    const total = NET_NODES_VP.length + NET_EDGES_VP.length;
    const interval = setInterval(() => {
      current += 1;
      setPhase(current);
      if (current >= total) {
        setTimeout(() => setPhase(0), 1200);
        current = 0;
      }
    }, 320);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={ref} className="pointer-events-none" style={{ width: 120, height: 80 }}>
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        aria-hidden
        className="pointer-events-none"
      >
        {NET_EDGES_VP.map((e, i) => {
          const visible = phase >= NET_NODES_VP.length + i;
          const from = NET_NODES_VP[e.from];
          const to = NET_NODES_VP[e.to];
          return (
            <motion.line
              key={i}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke="#0EA5E9"
              strokeOpacity={visible ? 0.5 : 0}
              strokeWidth="0.8"
              initial={false}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
        {NET_NODES_VP.map((n, i) => {
          const visible = phase >= i + 1;
          return (
            <motion.circle
              key={i}
              cx={n.cx}
              cy={n.cy}
              r="4"
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="1"
              initial={false}
              animate={{
                opacity: visible ? 1 : 0,
                scale: visible ? 1 : 0.2,
              }}
              transition={{ duration: 0.2 }}
            />
          );
        })}
        {phase >= NET_NODES_VP.length && (
          <motion.circle
            cx={NET_NODES_VP[4].cx}
            cy={NET_NODES_VP[4].cy}
            r="6"
            fill="#0EA5E9"
            fillOpacity="0.15"
            stroke="#0EA5E9"
            strokeWidth="1"
            strokeOpacity="0.6"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }}
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Illustration 02 -- score bars pulsing with reticle on tallest
// ---------------------------------------------------------------------------

const BAR_DATA_VP = [
  { height: 52, teal: true },
  { height: 28, teal: false },
  { height: 68, teal: true },
  { height: 18, teal: false },
  { height: 44, teal: true },
];

function ScoreBarsVP() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <div ref={ref} className="pointer-events-none" style={{ width: 120, height: 80 }}>
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        aria-hidden
        className="pointer-events-none"
      >
        {BAR_DATA_VP.map((bar, i) => {
          const x = 10 + i * 22;
          const maxH = 60;
          const barH = (bar.height / 100) * maxH;
          const y = 72 - barH;
          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width="14"
              height={barH}
              rx="2"
              fill={bar.teal ? "#0EA5E9" : "#3F3F46"}
              fillOpacity={bar.teal ? 0.8 : 0.5}
              initial={{ scaleY: 0, originY: "100%" }}
              animate={
                isInView
                  ? {
                      scaleY: [1, 1.08, 1],
                      fillOpacity: bar.teal ? [0.8, 1, 0.8] : [0.5, 0.5, 0.5],
                    }
                  : { scaleY: 0 }
              }
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                repeat: Infinity,
                repeatDelay: 1.8,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: `${x + 7}px 72px` }}
            />
          );
        })}
        {isInView && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <line x1="38" y1="12" x2="46" y2="12" stroke="#0EA5E9" strokeWidth="1" />
            <line x1="56" y1="12" x2="64" y2="12" stroke="#0EA5E9" strokeWidth="1" />
            <line x1="51" y1="5" x2="51" y2="9" stroke="#0EA5E9" strokeWidth="1" />
            <line x1="51" y1="15" x2="51" y2="19" stroke="#0EA5E9" strokeWidth="1" />
            <circle cx="51" cy="12" r="6" fill="none" stroke="#0EA5E9" strokeWidth="0.8" />
          </motion.g>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Illustration 03 -- message draft with blinking cursor
// ---------------------------------------------------------------------------

function MessageDraftVP() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <div ref={ref} style={{ width: 120, height: 80 }} aria-hidden>
      <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] p-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-[#0EA5E9]/80 leading-tight">
              Hi Marcus, I noticed
            </span>
            {isInView && (
              <motion.span
                className="inline-block w-[1px] h-[9px] bg-[#0EA5E9] translate-y-[0px]"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          <div className="h-[1px] w-3/4 rounded bg-[#0EA5E9]/20" />
          <div className="h-[1px] w-1/2 rounded bg-[#0EA5E9]/20" />
        </div>
        <motion.div
          className="mt-2 flex w-fit items-center gap-1 rounded-full bg-[#0EA5E9]/20 px-2 py-0.5"
          animate={isInView ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }}
        >
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-[#0EA5E9]">
            Send
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step data
// ---------------------------------------------------------------------------

type StepSide = "left" | "right";

const STEPS: Array<{
  step: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  Illustration: React.ComponentType;
  side: StepSide;
}> = [
  {
    step: "01",
    title: "Import your network",
    description:
      "Connect your LinkedIn and let KithNode map every alumni connection at your target firms. No manual research, no spreadsheets.",
    Icon: Link2,
    Illustration: NetworkFormingVP,
    side: "left",
  },
  {
    step: "02",
    title: "AI scores every path",
    description:
      "Warmth scoring based on shared school, firm, Greek org, hometown, and activity signals. Know exactly who to reach out to first.",
    Icon: Brain,
    Illustration: ScoreBarsVP,
    side: "right",
  },
  {
    step: "03",
    title: "Reach out authentically",
    description:
      "AI-drafted messages that feel real, with pipeline tracking to stay consistent. Build genuine relationships, not spray-and-pray campaigns.",
    Icon: MessageCircle,
    Illustration: MessageDraftVP,
    side: "left",
  },
];

// ---------------------------------------------------------------------------
// GlassCard -- shared glass card interior (3D tilt + border ring)
// ---------------------------------------------------------------------------

type GlassCardProps = {
  step: (typeof STEPS)[number];
  side: StepSide;
};

function GlassCard({ step, side }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      const rx = ny * -8;
      const ry = nx * 8;
      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
      el.style.transition = "transform 0.05s linear";
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    el.style.transition = "transform 0.4s ease-out";
  }, []);

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: side === "left" ? -60 : 60,
        rotateY: side === "left" ? -8 : 8,
      }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      style={{ perspective: 1000 }}
    >
      {/* Rotating conic gradient border wrapper */}
      <div className="vp-card-border-wrapper group relative rounded-xl p-px">
        <div
          className="vp-card-border-ring pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        {/* Inner glass card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm"
        >
          {/* Icon with teal glow */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] shadow-[0_0_24px_rgba(14,165,233,0.4)]">
            <step.Icon className="h-5 w-5" aria-hidden />
          </div>

          <h3 className="font-heading text-xl font-semibold text-white">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {step.description}
          </p>

          {/* Mini animated illustration */}
          <div className="mt-4 flex items-center justify-start">
            <step.Illustration />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// TimelineRow -- one step in the zigzag timeline
// ---------------------------------------------------------------------------

type TimelineRowProps = {
  step: (typeof STEPS)[number];
};

function TimelineRow({ step }: TimelineRowProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(dotRef, { amount: 0.3 });
  const isLeft = step.side === "left";

  return (
    <div className="relative flex items-center">
      {/* Timeline dot -- centered on vertical rail */}
      <div
        ref={dotRef}
        className="absolute left-4 md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <motion.div
          animate={
            isInView
              ? {
                  scale: [1, 1.3, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(14,165,233,0)",
                    "0 0 20px 4px rgba(14,165,233,0.45)",
                    "0 0 0 0 rgba(14,165,233,0)",
                  ],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: isInView ? Infinity : 0 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] font-mono text-sm font-bold text-white shadow-[0_0_24px_rgba(14,165,233,0.5)]"
        >
          {step.step}
        </motion.div>
      </div>

      {/* Mobile: full-width card, offset left of dot */}
      <div className="w-[calc(100%-56px)] ml-auto md:hidden">
        <GlassCard step={step} side={step.side} />
      </div>

      {/* Desktop: left slot */}
      <div
        className={[
          "hidden md:block md:w-[calc(50%-40px)]",
          isLeft ? "md:mr-auto" : "md:invisible md:pointer-events-none",
        ].join(" ")}
      >
        {isLeft && <GlassCard step={step} side="left" />}
      </div>

      {/* Desktop: spacer between left slot and center dot */}
      <div className="hidden md:block md:w-20 md:shrink-0" />

      {/* Desktop: right slot */}
      <div
        className={[
          "hidden md:block md:w-[calc(50%-40px)]",
          !isLeft ? "md:ml-auto" : "md:invisible md:pointer-events-none",
        ].join(" ")}
      >
        {!isLeft && <GlassCard step={step} side="right" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ValueProps
// ---------------------------------------------------------------------------

export function ValueProps() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: sectionScroll } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(sectionScroll, [0, 0.7], [1, 0.4]);

  const { scrollYProgress: lineScroll } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const lineHeight = useTransform(lineScroll, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative bg-black py-24 px-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes -- -vp suffix to avoid collision with other sections */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes mesh-pulse-vp {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node-vp {
          animation: mesh-pulse-vp var(--d, 3s) ease-in-out infinite;
        }

        @keyframes border-spin-vp {
          to { --border-angle-vp: 360deg; }
        }

        @property --border-angle-vp {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .vp-card-border-ring {
          background: conic-gradient(
            from var(--border-angle-vp, 0deg),
            #0EA5E9, #22D3EE, #06B6D4, #0EA5E9
          );
          animation: border-spin-vp 4s linear infinite;
        }

        .vp-card-border-wrapper {
          position: relative;
        }
        .vp-card-border-ring::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: calc(0.75rem - 1px);
          background: black;
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* SVG mesh background */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        {/* Radial teal halo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(14,165,233,0.08) 0%, transparent 60%)",
          }}
        />
        {/* Dot + line mesh */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {MESH_EDGES.map((e, i) => (
            <line
              key={i}
              x1={`${e.x1}%`}
              y1={`${e.y1}%`}
              x2={`${e.x2}%`}
              y2={`${e.y2}%`}
              stroke="#0EA5E9"
              strokeOpacity="0.12"
              strokeWidth="0.15"
            />
          ))}
          {MESH_NODES.map((n, i) => (
            <circle
              key={i}
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r="0.4"
              fill="#0EA5E9"
              className="mesh-node-vp"
              style={{ "--d": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky section heading with scroll-fade */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-20 z-10 mb-20">
        <motion.div style={{ opacity: headingOpacity }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Three steps to your warmest path
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-xl text-center text-white/70"
          >
            From cold outreach to warm introductions. KithNode transforms how you
            network.
          </motion.p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline */}
      {/* ------------------------------------------------------------------ */}
      <div ref={containerRef} className="relative mx-auto max-w-4xl">
        {/* Vertical rail (background track) */}
        <div className="absolute left-4 md:left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.06]" />
        {/* Vertical rail (animated teal fill on scroll) */}
        <motion.div
          className="absolute left-4 md:left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#0EA5E9] to-[#06B6D4]"
          style={{ height: lineHeight }}
        />

        {/* Steps */}
        <div className="space-y-24">
          {STEPS.map((step) => (
            <TimelineRow key={step.step} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
