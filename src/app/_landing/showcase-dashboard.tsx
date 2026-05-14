"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = "HOT" | "WARM" | "MONITOR" | "COLD";

type ContactCard = {
  id: string;
  tier: Tier;
  name: string;
  title: string;
  firm: string;
  score: number;
  warmPath?: string;
  // Position in the composition (percent of container)
  left: string;
  top: string;
  rotate: string;
  floatDelay: string;
  floatDuration: string;
  revealDelay: number;
};

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<Tier, { text: string; bg: string; border: string; label: string }> = {
  HOT: {
    text: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    label: "HOT",
  },
  WARM: {
    text: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    label: "WARM",
  },
  MONITOR: {
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    label: "MONITOR",
  },
  COLD: {
    text: "text-zinc-400",
    bg: "bg-zinc-500/20",
    border: "border-zinc-500/30",
    label: "COLD",
  },
};

// ---------------------------------------------------------------------------
// Card data -- each card has a deterministic position in the composition
// ---------------------------------------------------------------------------

const CARDS: ContactCard[] = [
  {
    id: "c1",
    tier: "HOT",
    name: "Riley Chen",
    title: "Associate",
    firm: "Goldman Sachs",
    score: 84,
    warmPath: "Via Jake Bennett (Greek Life) to Associate at Goldman",
    left: "4%",
    top: "6%",
    rotate: "-2.5deg",
    floatDelay: "0s",
    floatDuration: "4.2s",
    revealDelay: 0.05,
  },
  {
    id: "c2",
    tier: "HOT",
    name: "Ava Shah",
    title: "Analyst",
    firm: "Evercore",
    score: 91,
    left: "35%",
    top: "2%",
    rotate: "1.8deg",
    floatDelay: "0.8s",
    floatDuration: "3.6s",
    revealDelay: 0.12,
  },
  {
    id: "c3",
    tier: "WARM",
    name: "Miles Park",
    title: "VP",
    firm: "Centerview",
    score: 72,
    warmPath: "Via Emma Diaz to Centerview Partners",
    left: "63%",
    top: "5%",
    rotate: "3deg",
    floatDelay: "1.4s",
    floatDuration: "4.8s",
    revealDelay: 0.2,
  },
  {
    id: "c4",
    tier: "WARM",
    name: "Nisha Rao",
    title: "MD",
    firm: "Lazard",
    score: 78,
    left: "2%",
    top: "52%",
    rotate: "-1.5deg",
    floatDelay: "0.3s",
    floatDuration: "5.1s",
    revealDelay: 0.28,
  },
  {
    id: "c5",
    tier: "MONITOR",
    name: "Theo Brennan",
    title: "Analyst",
    firm: "Houlihan Lokey",
    score: 41,
    left: "36%",
    top: "56%",
    rotate: "2.2deg",
    floatDelay: "1.1s",
    floatDuration: "3.9s",
    revealDelay: 0.36,
  },
  {
    id: "c6",
    tier: "COLD",
    name: "Drew Castro",
    title: "Associate",
    firm: "Moelis",
    score: 28,
    left: "64%",
    top: "52%",
    rotate: "-3deg",
    floatDelay: "0.6s",
    floatDuration: "4.5s",
    revealDelay: 0.44,
  },
];

// ---------------------------------------------------------------------------
// SVG connection line paths -- center-to-center between selected card pairs
// These are hand-tuned approximate center coordinates per card
// (left% + half card width ~120px on 600px container = ~10%; top% + half card height ~70px)
// ---------------------------------------------------------------------------

// Card approximate centers in percentages of the 600px wide x 420px tall composition
// We use the layout position + a reasonable card center offset
const CARD_CENTERS: Record<string, { cx: number; cy: number }> = {
  c1: { cx: 14, cy: 20 },
  c2: { cx: 48, cy: 18 },
  c3: { cx: 77, cy: 22 },
  c4: { cx: 14, cy: 68 },
  c5: { cx: 48, cy: 74 },
  c6: { cx: 77, cy: 70 },
};

// Connections to draw (subset -- avoid cluttering)
const CONNECTIONS: [string, string][] = [
  ["c1", "c2"],
  ["c2", "c3"],
  ["c1", "c4"],
  ["c2", "c5"],
  ["c3", "c6"],
  ["c4", "c5"],
  ["c5", "c6"],
];

// ---------------------------------------------------------------------------
// CountUp -- framer-motion useInView + rAF, same pattern as solutions-section
// ---------------------------------------------------------------------------

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current || !ref.current) return;
    started.current = true;

    const startTime = performance.now();
    const el = ref.current;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * end);
      el.textContent = value.toString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [isInView, end, duration]);

  return <span ref={ref}>0</span>;
}

// ---------------------------------------------------------------------------
// ContactCard -- individual floating card
// ---------------------------------------------------------------------------

type ContactCardProps = {
  card: ContactCard;
  reduceMotion: boolean | null;
};

function FloatingCard({ card, reduceMotion }: ContactCardProps) {
  const tier = TIER_STYLES[card.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: card.revealDelay }}
      style={{
        position: "absolute",
        left: card.left,
        top: card.top,
        transform: `rotate(${card.rotate})`,
        // Float animation via CSS custom property injection
        animation: reduceMotion
          ? undefined
          : `card-float ${card.floatDuration} ease-in-out infinite`,
        animationDelay: card.floatDelay,
      }}
      className="w-[180px] sm:w-[200px]"
    >
      <div
        className="
          relative
          rounded-xl
          border border-white/[0.10]
          bg-white/[0.06]
          backdrop-blur-sm
          px-4 py-3
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          transition-shadow duration-300
          hover:shadow-[0_12px_40px_rgba(14,165,233,0.15)]
        "
      >
        {/* Tier badge */}
        <span
          className={`
            inline-block border
            ${tier.border} ${tier.bg}
            px-1.5 py-0.5
            text-[9px] font-bold uppercase tracking-wider
            ${tier.text}
            mb-2
          `}
        >
          {tier.label}
        </span>

        {/* Score */}
        <div className="font-mono text-3xl font-bold tabular-nums text-[#0EA5E9] leading-none mb-1">
          {card.score}
        </div>

        {/* Name */}
        <div className="text-[13px] font-bold text-white leading-tight">
          {card.name}
        </div>

        {/* Title */}
        <div className="text-[11px] text-white/60 mt-0.5">
          {card.title}
        </div>

        {/* Firm */}
        <div className="text-[11px] font-medium text-white/80 mt-0.5">
          {card.firm}
        </div>

        {/* Warm path */}
        {card.warmPath && (
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <div className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-0.5">
              Warm Path
            </div>
            <div className="font-mono text-[9px] text-[#0EA5E9] leading-tight">
              {card.warmPath}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ShowcaseDashboard
// ---------------------------------------------------------------------------

export function ShowcaseDashboard() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mouse tilt on the whole composition -- max 3 degrees each axis
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || reduceMotion) return;
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      const rx = ny * -3;
      const ry = nx * 3;
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      el.style.transition = "transform 0.06s linear";
    });
  }, [reduceMotion]);

  const handleMouseLeave = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    el.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
    el.style.transition = "transform 0.5s ease-out";
  }, []);

  return (
    <>
      {/* Keyframes -- injected once, scoped to dashboard animation names */}
      <style>{`
        @keyframes card-float {
          0%, 100% { translate: 0 0px; }
          50%       { translate: 0 -4px; }
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes stat-glow-pulse {
          0%, 100% { text-shadow: 0 0 20px rgba(14,165,233,0.4), 0 0 40px rgba(14,165,233,0.2); }
          50%       { text-shadow: 0 0 32px rgba(14,165,233,0.7), 0 0 60px rgba(14,165,233,0.35); }
        }
        .stat-glow {
          animation: stat-glow-pulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* Outer wrapper: navy bg, animated radial glow */}
      <div
        className="relative overflow-hidden rounded-xl border border-white/[0.06]"
        style={{ background: "#0A1628", minHeight: "420px" }}
      >
        {/* Animated radial teal glow at center */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(14,165,233,0.09) 0%, transparent 70%)",
          }}
        />

        {/* Top bar -- simulates browser/app chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 relative z-10">
          <div className="h-2 w-2 rounded-full bg-red-500/70" />
          <div className="h-2 w-2 rounded-full bg-amber-500/70" />
          <div className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            kithnode / dashboard / contacts
          </span>
          {/* AutoGuard pill */}
          <div className="ml-auto flex items-center gap-1.5 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2.5 py-1">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
              animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
              transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#0EA5E9]">
              AutoGuard Active
            </span>
          </div>
        </div>

        {/* Composition area -- the floating cards + SVG lines */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative"
          style={{ height: "420px" }}
          aria-label="Contact network visualization"
        >
          {/* SVG connection lines -- z-index below cards */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            style={{ zIndex: 1 }}
          >
            {CONNECTIONS.map(([aId, bId], i) => {
              const a = CARD_CENTERS[aId];
              const b = CARD_CENTERS[bId];
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={`${a.cx}%`}
                  y1={`${a.cy}%`}
                  x2={`${b.cx}%`}
                  y2={`${b.cy}%`}
                  stroke="#0EA5E9"
                  strokeOpacity="0.25"
                  strokeWidth="0.3"
                  strokeDasharray="4 4"
                  style={{
                    animation: reduceMotion
                      ? undefined
                      : `dash-flow ${2.5 + i * 0.4}s linear infinite`,
                  }}
                />
              );
            })}
          </svg>

          {/* Floating contact cards -- z-index above lines */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            {CARDS.map((card) => (
              <FloatingCard
                key={card.id}
                card={card}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>

          {/* 276% RESPONSE RATE stat -- bottom-right */}
          <div
            className="absolute bottom-6 right-6 text-right"
            style={{ zIndex: 3 }}
          >
            <div
              className="font-mono text-6xl font-bold tabular-nums text-[#0EA5E9] leading-none stat-glow"
            >
              <CountUp end={276} duration={2000} />%
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
              Response Rate
            </div>
          </div>
        </div>

        {/* Metrics strip -- bottom bar */}
        <div className="grid grid-cols-2 border-t border-white/[0.06] sm:grid-cols-4">
          {[
            { label: "CONTACTS", value: "604" },
            { label: "HOT TARGETS", value: "38" },
            { label: "MEETINGS", value: "4" },
            { label: "WARM PATHS", value: "127" },
          ].map((m, idx) => (
            <div
              key={m.label}
              className={[
                "px-5 py-3",
                idx < 3 ? "sm:border-r border-white/[0.06]" : "",
                idx < 2 ? "border-b sm:border-b-0" : "",
                idx % 2 === 0 && idx < 2 ? "border-r sm:border-r-0" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {m.label}
              </div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0EA5E9]">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
