"use client";

import Link from "next/link";
import { useRef, useEffect, useCallback, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  animate,
} from "framer-motion";
import { Link2, Brain, MessageSquare, ArrowRight, Play } from "lucide-react";

// ---------------------------------------------------------------------------
// SVG mesh background -- same data as solutions-section (duplicated for perf,
// no shared module needed here)
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
// Step 01 illustration -- network nodes appearing and connecting
// ---------------------------------------------------------------------------

// 5 nodes with their positions and edges between them
const NET_NODES = [
  { cx: 20, cy: 20 },
  { cx: 56, cy: 12 },
  { cx: 96, cy: 28 },
  { cx: 36, cy: 64 },
  { cx: 80, cy: 68 },
];

const NET_EDGES = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 0, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 4 },
];

function NetworkFormingIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  // Each phase: node 0 appears, node 1 appears + edge 0-1, etc.
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isInView) {
      setPhase(0);
      return;
    }
    let current = 0;
    const total = NET_NODES.length + NET_EDGES.length;
    const interval = setInterval(() => {
      current += 1;
      setPhase(current);
      if (current >= total) {
        // Reset and replay after a pause
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
      {/* Edges */}
      {NET_EDGES.map((e, i) => {
        const visible = phase >= NET_NODES.length + i;
        const from = NET_NODES[e.from];
        const to = NET_NODES[e.to];
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
      {/* Nodes */}
      {NET_NODES.map((n, i) => {
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
      {/* Central hub highlight on last node */}
      {phase >= NET_NODES.length && (
        <motion.circle
          cx={NET_NODES[4].cx}
          cy={NET_NODES[4].cy}
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
// Step 02 illustration -- score bars pulsing, TARGET reticle on tallest
// ---------------------------------------------------------------------------

const BAR_DATA = [
  { height: 52, teal: true },
  { height: 28, teal: false },
  { height: 68, teal: true },
  { height: 18, teal: false },
  { height: 44, teal: true },
];

function ScoreBarsIllustration() {
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
      {BAR_DATA.map((bar, i) => {
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
      {/* TARGET reticle on tallest bar (index 2) */}
      {isInView && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Horizontal crosshair lines */}
          <line x1="38" y1="12" x2="46" y2="12" stroke="#0EA5E9" strokeWidth="1" />
          <line x1="56" y1="12" x2="64" y2="12" stroke="#0EA5E9" strokeWidth="1" />
          {/* Vertical crosshair lines */}
          <line x1="51" y1="5" x2="51" y2="9" stroke="#0EA5E9" strokeWidth="1" />
          <line x1="51" y1="15" x2="51" y2="19" stroke="#0EA5E9" strokeWidth="1" />
          {/* Circle */}
          <circle cx="51" cy="12" r="6" fill="none" stroke="#0EA5E9" strokeWidth="0.8" />
        </motion.g>
      )}
    </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 03 illustration -- message thread with blinking cursor
// ---------------------------------------------------------------------------

function MessageDraftIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <div ref={ref} className="w-full" style={{ width: 120, height: 80 }} aria-hidden>
      <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] p-2">
        {/* Draft lines */}
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
        {/* Send button */}
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

const STEPS = [
  {
    number: "01",
    title: "Import your network",
    body: "Link your LinkedIn account. KithNode maps every alumni connection across your university, Greek org, and hometown in seconds.",
    Icon: Link2,
    Illustration: NetworkFormingIllustration,
    side: "left" as const,
  },
  {
    number: "02",
    title: "AI scores every path",
    body: "The scoring engine ranks each warm path by connection strength, shared signals, and hiring activity. No guessing.",
    Icon: Brain,
    Illustration: ScoreBarsIllustration,
    side: "right" as const,
  },
  {
    number: "03",
    title: "Reach out authentically",
    body: "Get personalized outreach drafts that reference real shared context. Every message reads like it came from you.",
    Icon: MessageSquare,
    Illustration: MessageDraftIllustration,
    side: "left" as const,
  },
] as const;

// ---------------------------------------------------------------------------
// StepCircle -- scroll-activated glow
// ---------------------------------------------------------------------------

type StepCircleProps = {
  number: string;
  isActive: boolean;
};

function StepCircle({ number, isActive }: StepCircleProps) {
  return (
    <motion.div
      className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-black"
      animate={{
        borderColor: isActive ? "rgba(14,165,233,0.7)" : "rgba(14,165,233,0.2)",
        boxShadow: isActive
          ? "0 0 24px rgba(14,165,233,0.6), 0 0 8px rgba(14,165,233,0.4)"
          : "none",
        scale: isActive ? 1.1 : 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <span className="font-mono text-sm font-bold tabular-nums text-[#0EA5E9]">
        {number}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StepCard -- glass card with 3D tilt + scroll-reveal
// ---------------------------------------------------------------------------

type StepCardProps = {
  step: (typeof STEPS)[number];
  index: number;
  onActiveChange: (active: boolean) => void;
};

function StepCard({ step, index, onActiveChange }: StepCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isInView = useInView(cardRef, { amount: 0.4 });

  useEffect(() => {
    onActiveChange(isInView);
  }, [isInView, onActiveChange]);

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
        x: step.side === "left" ? -40 : 40,
        rotateY: step.side === "left" ? -8 : 8,
      }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
      style={{ perspective: 1000 }}
    >
      {/* Gradient border wrapper */}
      <div className="card-hiw-border-wrapper group relative rounded-xl p-px">
        <div
          className="card-hiw-border-ring pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm"
        >
          {/* Icon */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] shadow-[0_0_24px_rgba(14,165,233,0.3)]">
            <step.Icon className="h-5 w-5" aria-hidden />
          </div>

          {/* Title + body */}
          <h3 className="font-heading text-lg font-semibold text-white">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>

          {/* Mini illustration */}
          <div className="mt-4 flex items-center justify-start">
            <step.Illustration />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// HowItWorksSection
// ---------------------------------------------------------------------------

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  const handleActiveChange = useCallback((index: number, active: boolean) => {
    setActiveStep((prev) => {
      if (active) return index;
      if (prev === index) return null;
      return prev;
    });
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative bg-black px-4 py-24"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes mesh-pulse-hiw {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node-hiw {
          animation: mesh-pulse-hiw var(--d, 3s) ease-in-out infinite;
        }

        @keyframes pipeline-flow {
          0%   { background-position: 0% -100%; }
          100% { background-position: 0% 100%; }
        }
        .pipeline-flow {
          animation: pipeline-flow 3s linear infinite;
        }

        @keyframes border-spin-hiw {
          to { --border-angle-hiw: 360deg; }
        }

        @property --border-angle-hiw {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .card-hiw-border-ring {
          background: conic-gradient(
            from var(--border-angle-hiw, 0deg),
            #0EA5E9, #22D3EE, #06B6D4, #0EA5E9
          );
          animation: border-spin-hiw 4s linear infinite;
        }

        .card-hiw-border-wrapper {
          position: relative;
        }
        .card-hiw-border-ring::before {
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
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(14,165,233,0.06) 0%, transparent 65%)",
          }}
        />
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
              className="mesh-node-hiw"
              style={{ "--d": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky heading */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-20 z-10 mb-16">
        <motion.div style={{ opacity: headingOpacity }}>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto max-w-xl text-center text-white/70">
            From cold outreach to warm intro. KithNode rewires how you network in
            three steps.
          </p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative mx-auto max-w-4xl">
        {/* Vertical rail + flowing pulse line */}
        {/* Desktop only (hidden on mobile) */}
        <div className="absolute left-1/2 top-0 hidden -translate-x-1/2 md:block"
          style={{ width: 1, height: "100%" }}
          aria-hidden
        >
          {/* Static rail */}
          <div className="absolute inset-0 bg-white/[0.06]" />
          {/* Animated pulse */}
          <div
            className="pipeline-flow absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(14,165,233,0) 0%, #0EA5E9 50%, rgba(14,165,233,0) 100%)",
              backgroundSize: "100% 200%",
            }}
          />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-20">
          {STEPS.map((step, i) => {
            const isLeft = step.side === "left";
            return (
              <div key={step.number} className="relative flex items-center gap-0 md:gap-0">
                {/* LEFT column (card or spacer) */}
                <div
                  className={[
                    // On mobile always full width; on desktop alternate
                    "w-full md:w-[calc(50%-28px)]",
                    // On desktop, right-side steps get an invisible spacer here
                    !isLeft ? "md:invisible md:pointer-events-none" : "",
                  ].join(" ")}
                >
                  {isLeft && (
                    <StepCard
                      step={step}
                      index={i}
                      onActiveChange={(active) => handleActiveChange(i, active)}
                    />
                  )}
                </div>

                {/* Center circle -- desktop only */}
                <div className="hidden md:flex md:w-14 md:shrink-0 md:items-center md:justify-center">
                  <StepCircle number={step.number} isActive={activeStep === i} />
                </div>

                {/* RIGHT column (card or spacer) */}
                <div
                  className={[
                    "hidden md:block md:w-[calc(50%-28px)]",
                    isLeft ? "md:invisible md:pointer-events-none" : "",
                  ].join(" ")}
                >
                  {!isLeft && (
                    <StepCard
                      step={step}
                      index={i}
                      onActiveChange={(active) => handleActiveChange(i, active)}
                    />
                  )}
                </div>

                {/* Mobile: step number badge inline above card */}
                <div className="absolute -top-8 left-0 flex items-center gap-2 md:hidden">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#0EA5E9]/30 bg-black">
                    <span className="font-mono text-xs font-bold text-[#0EA5E9]">
                      {step.number}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer CTA strip */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative mx-auto mt-24 max-w-4xl"
      >
        <div className="card-hiw-border-wrapper group relative rounded-xl p-px">
          <div
            className="card-hiw-border-ring pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-6 rounded-xl border border-white/[0.08] bg-white/[0.04] px-8 py-10 backdrop-blur-sm sm:flex-row sm:justify-between">
            <div>
              <h3 className="font-heading text-xl font-semibold text-white">
                Ready to send your first warm intro?
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Join the waitlist. Your network is already here.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/waitlist"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_32px_rgba(14,165,233,0.5)]"
              >
                Request Access
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.14] px-5 py-2.5 text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/25 hover:text-white"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Watch 90-second demo
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
