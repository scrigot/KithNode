"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  Radar,
  Sparkles,
  Send,
  Search,
  Layers,
  Check,
  ArrowRight,
  X,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeatureId = "signals" | "scoring" | "outreach" | "discover" | "pipeline";

interface Feature {
  id: FeatureId;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    id: "signals",
    title: "Signal Detection",
    subtitle: "Track alumni changes in real time",
    Icon: Radar,
  },
  {
    id: "scoring",
    title: "AI Scoring",
    subtitle: "Warmth scores that predict response",
    Icon: Sparkles,
  },
  {
    id: "outreach",
    title: "Smart Outreach",
    subtitle: "Drafts that don't feel robotic",
    Icon: Send,
  },
  {
    id: "discover",
    title: "Discover",
    subtitle: "Find warm paths you didn't know existed",
    Icon: Search,
  },
  {
    id: "pipeline",
    title: "Pipeline",
    subtitle: "Track every relationship to coffee chat",
    Icon: Layers,
  },
];

const AUTO_ADVANCE_MS = 8000;

// ---------------------------------------------------------------------------
// SVG mesh background -- same deterministic node set as solutions-section
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
// Animated mini illustrations -- one per FeatureId, ~80x80 SVG + framer-motion
// All deterministic, looped. Placed in the top-right corner of the right panel.
// ---------------------------------------------------------------------------

function IllustrationSignals() {
  // Concentric ripple rings expanding from a center point
  const rings = [0, 1, 2];
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pointer-events-none">
      {rings.map((r) => (
        <motion.circle
          key={r}
          cx={40}
          cy={40}
          r={10}
          fill="none"
          stroke="#0EA5E9"
          strokeWidth={1}
          initial={{ r: 10, opacity: 0.8 }}
          animate={{ r: 34, opacity: 0 }}
          transition={{
            duration: 2,
            delay: r * 0.65,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
      {/* Center dot */}
      <motion.circle
        cx={40}
        cy={40}
        r={4}
        fill="#0EA5E9"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function IllustrationScoring() {
  // Animated progress bars stacking vertically
  const bars = [
    { width: 92, delay: 0 },
    { width: 78, delay: 0.15 },
    { width: 85, delay: 0.3 },
    { width: 74, delay: 0.45 },
  ];
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pointer-events-none">
      {bars.map((b, i) => (
        <g key={i} transform={`translate(6, ${14 + i * 14})`}>
          {/* Track */}
          <rect x={0} y={0} width={68} height={5} rx={2} fill="rgba(255,255,255,0.06)" />
          {/* Fill */}
          <motion.rect
            x={0}
            y={0}
            height={5}
            rx={2}
            fill="#0EA5E9"
            initial={{ width: 0 }}
            animate={{ width: (b.width / 100) * 68 }}
            transition={{
              duration: 0.8,
              delay: b.delay,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeOut",
            }}
          />
        </g>
      ))}
      {/* Score number */}
      <motion.text
        x={40}
        y={76}
        textAnchor="middle"
        fill="#0EA5E9"
        fontSize={8}
        fontFamily="monospace"
        opacity={0.6}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        82
      </motion.text>
    </svg>
  );
}

function IllustrationOutreach() {
  // Envelope with a send dash animation
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pointer-events-none">
      {/* Envelope body */}
      <rect x={14} y={26} width={52} height={34} rx={3} fill="rgba(14,165,233,0.1)" stroke="#0EA5E9" strokeWidth={1} strokeOpacity={0.4} />
      {/* Envelope flap lines */}
      <polyline points="14,26 40,46 66,26" fill="none" stroke="#0EA5E9" strokeWidth={1} strokeOpacity={0.4} />
      {/* Animated send arrow */}
      <motion.g
        initial={{ x: 0, opacity: 1 }}
        animate={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.8, ease: "easeIn" }}
      >
        <line x1={34} y1={43} x2={46} y2={43} stroke="#0EA5E9" strokeWidth={1.5} strokeLinecap="round" />
        <polyline points="43,39 47,43 43,47" fill="none" stroke="#0EA5E9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}

function IllustrationDiscover() {
  // Nodes connecting to a central hub
  const spokes = [
    { x: 40, y: 14 },
    { x: 66, y: 28 },
    { x: 66, y: 56 },
    { x: 40, y: 70 },
    { x: 14, y: 56 },
    { x: 14, y: 28 },
  ];
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pointer-events-none">
      {spokes.map((s, i) => (
        <g key={i}>
          <motion.line
            x1={40}
            y1={42}
            x2={s.x}
            y2={s.y}
            stroke="#0EA5E9"
            strokeWidth={0.8}
            strokeOpacity={0.35}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2.5, ease: "easeOut" }}
          />
          <motion.circle
            cx={s.x}
            cy={s.y}
            r={3}
            fill="#0EA5E9"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.7 }}
            transition={{ duration: 0.3, delay: i * 0.1 + 0.4, repeat: Infinity, repeatDelay: 2.5 }}
          />
        </g>
      ))}
      {/* Hub */}
      <motion.circle
        cx={40}
        cy={42}
        r={5}
        fill="#0EA5E9"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function IllustrationPipeline() {
  // Vertical pipeline with dots flowing down
  const stages = [14, 30, 46, 62];
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pointer-events-none">
      {/* Vertical track */}
      <line x1={40} y1={12} x2={40} y2={74} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
      {/* Stage dots */}
      {stages.map((y, i) => (
        <motion.circle
          key={i}
          cx={40}
          cy={y}
          r={4}
          fill="none"
          stroke="#0EA5E9"
          strokeWidth={1}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Flowing particle */}
      <motion.circle
        cx={40}
        cy={0}
        r={2.5}
        fill="#0EA5E9"
        animate={{ cy: [12, 74] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 0.4 }}
      />
    </svg>
  );
}

const ILLUSTRATIONS: Record<FeatureId, React.ComponentType> = {
  signals: IllustrationSignals,
  scoring: IllustrationScoring,
  outreach: IllustrationOutreach,
  discover: IllustrationDiscover,
  pipeline: IllustrationPipeline,
};

// ---------------------------------------------------------------------------
// ProductCards
// ---------------------------------------------------------------------------

export function ProductCards() {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState<FeatureId>("signals");
  const [paused, setPaused] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const sectionRef = React.useRef<HTMLElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const animFrameRef = React.useRef<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  React.useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      const idx = FEATURES.findIndex((f) => f.id === active);
      const next = FEATURES[(idx + 1) % FEATURES.length];
      setActive(next.id);
      setTick((t) => t + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, paused, reduce]);

  const handleTabClick = (id: FeatureId) => {
    setActive(id);
    setTick((t) => t + 1);
  };

  const handlePanelMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = panelRef.current;
      if (!el) return;
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (e.clientY - cy) / (rect.height / 2);
        const rx = ny * -6;
        const ry = nx * 6;
        el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.01)`;
        el.style.transition = "transform 0.05s linear";
      });
    },
    []
  );

  const handlePanelMouseLeave = React.useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    el.style.transition = "transform 0.4s ease-out";
  }, []);

  const ActiveIllustration = ILLUSTRATIONS[active];

  return (
    <section
      id="products"
      ref={sectionRef}
      className="relative bg-black py-24 px-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes -- same as solutions-section for consistency */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes pc-mesh-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .pc-mesh-node {
          animation: pc-mesh-pulse var(--d, 3s) ease-in-out infinite;
        }

        @keyframes pc-border-spin {
          to { --pc-border-angle: 360deg; }
        }

        @property --pc-border-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .pc-card-border-ring {
          background: conic-gradient(
            from var(--pc-border-angle, 0deg),
            #0EA5E9, #22D3EE, #06B6D4, #0EA5E9
          );
          animation: pc-border-spin 4s linear infinite;
        }

        .pc-card-border-ring::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: calc(0.75rem - 1px);
          background: #050d18;
        }

        .pc-card-border-wrapper {
          position: relative;
        }

        @keyframes pc-tab-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        .pc-tab-dot {
          animation: pc-tab-pulse 2.4s ease-in-out infinite;
        }

        @keyframes pc-thumb-pulse-r {
          0%, 100% { r: 3; }
          50%       { r: 5; }
        }
        .pc-thumb-pulse {
          animation: pc-thumb-pulse-r 2s ease-in-out infinite;
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* SVG mesh background */}
      {/* ------------------------------------------------------------------ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Radial teal halo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(14,165,233,0.06) 0%, transparent 60%)",
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
              strokeOpacity="0.10"
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
              className="pc-mesh-node"
              style={{ "--d": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky heading with scroll-fade */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-20 z-10 mb-16">
        <motion.div style={{ opacity: headingOpacity }}>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to network smarter
          </h2>
          <p className="mx-auto max-w-xl text-center text-white/70">
            From finding the right people to landing the meeting, KithNode handles the entire networking workflow.
          </p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main panel -- scroll-reveal wrapper */}
      {/* ------------------------------------------------------------------ */}
      <ScrollReveal>
        <div className="relative mx-auto max-w-6xl" style={{ perspective: 1000 }}>
          {/* Conic gradient border wrapper */}
          <div className="pc-card-border-wrapper group relative rounded-xl p-px">
            <div
              className="pc-card-border-ring pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />

            {/* Inner glass shell */}
            <div
              className="grid grid-cols-1 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm md:grid-cols-[300px_1fr]"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => {
                setPaused(false);
                handlePanelMouseLeave();
              }}
            >
              {/* -------------------------------------------------------- */}
              {/* Left rail: dark glass tabs */}
              {/* -------------------------------------------------------- */}
              <div className="flex flex-col border-b border-white/[0.06] md:border-b-0 md:border-r md:border-r-white/[0.06]">
                {FEATURES.map((f, i) => {
                  const isActive = active === f.id;
                  return (
                    <motion.button
                      key={f.id}
                      type="button"
                      onClick={() => handleTabClick(f.id)}
                      initial={reduce ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.3 }}
                      className={`group/tab relative flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                        isActive
                          ? "bg-white/[0.06]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.span
                          layoutId="pc-tab-indicator"
                          className="absolute left-0 top-0 h-full w-[3px] bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.6)]"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Icon container */}
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? "bg-[#0EA5E9]/15 text-[#0EA5E9] shadow-[0_0_16px_rgba(14,165,233,0.3)]"
                            : "bg-white/[0.06] text-white/40 group-hover/tab:text-white/70"
                        }`}
                      >
                        <f.Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            isActive ? "text-white" : "text-white/60"
                          }`}
                        >
                          {f.title}
                        </p>
                        <p className="mt-0.5 text-xs text-white/40">{f.subtitle}</p>
                      </div>

                      {/* Auto-advance progress bar */}
                      {isActive && !reduce && !paused && (
                        <motion.span
                          key={tick}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                          className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-[#0EA5E9]/40"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* -------------------------------------------------------- */}
              {/* Right panel: dark preview with 3D tilt + animated illustration */}
              {/* -------------------------------------------------------- */}
              <div
                ref={panelRef}
                onMouseMove={handlePanelMouseMove}
                onMouseLeave={handlePanelMouseLeave}
                className="relative min-h-[420px] overflow-hidden bg-[#050d18] p-5 sm:p-7"
              >
                {/* Animated mini illustration -- top-right corner */}
                <div className="pointer-events-none absolute right-5 top-5 opacity-50">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`illus-${active}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <ActiveIllustration />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Faux browser chrome */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-white/30">
                    kithnode / {active}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {active === "signals" && <SignalsPreview />}
                    {active === "scoring" && <ScoringPreview />}
                    {active === "outreach" && <OutreachPreview />}
                    {active === "discover" && <DiscoverPreview />}
                    {active === "pipeline" && <PipelinePreview />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Signals
// ─────────────────────────────────────────────────────────────────────────────

function SignalsPreview() {
  const signals = [
    {
      name: "Riley Chen",
      event: "Promoted to Associate at Goldman Sachs",
      time: "2h ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Drew Castro",
      event: "Joined Lazard as Analyst",
      time: "1d ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Nisha Rao",
      event: "Posted: 'Hiring for summer analysts'",
      time: "2d ago",
      dot: "bg-amber-400",
    },
    {
      name: "Miles Park",
      event: "Updated title to VP at Evercore",
      time: "3d ago",
      dot: "bg-[#0EA5E9]",
    },
    {
      name: "Ben Kaminski",
      event: "Joined KKR Private Equity",
      time: "4d ago",
      dot: "bg-[#0EA5E9]",
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="pc-tab-dot h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
            Signal Feed · Live
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          Last 7 days
        </span>
      </div>

      <div className="space-y-0">
        {signals.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/70">
              {s.name.split(" ").map((n) => n[0]).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {s.name}
              </p>
              <p className="truncate text-[11px] text-white/60">{s.event}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/40">
              {s.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Scoring
// ─────────────────────────────────────────────────────────────────────────────

function ScoringPreview() {
  const components = [
    { label: "Shared Affiliations", value: 92 },
    { label: "Activity Signals", value: 78 },
    { label: "Reachability", value: 74 },
    { label: "Industry Fit", value: 85 },
  ];

  return (
    <div>
      {/* Featured contact */}
      <div className="mb-5 border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 inline-flex items-center border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
              Hot
            </div>
            <h4 className="text-base font-bold text-white">Ben Kaminski</h4>
            <p className="text-xs text-white/60">Vice President · KKR</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-3xl font-bold tabular-nums text-red-400">
              82
            </span>
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              Warmth Score
            </p>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-white/50">
          Score Composition
        </p>
        <div className="space-y-3">
          {components.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.3 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  {c.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-white/80">
                  {c.value}
                </span>
              </div>
              <div className="h-1 w-full bg-white/[0.08]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.value}%` }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: "easeOut" }}
                  className="h-1 bg-[#0EA5E9]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Outreach
// ─────────────────────────────────────────────────────────────────────────────

function OutreachPreview() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Compose
        </span>
        <span className="inline-flex items-center gap-1.5 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#0EA5E9]">
          <Sparkles className="h-3 w-3" />
          AI Drafted
        </span>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 border-b border-white/[0.06] pb-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">To</span>
            <span className="font-mono text-[11px] text-white/80">riley.chen@goldmansachs.com</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Subject</span>
            <span className="text-[12px] text-white">Coffee chat about your path from UNC to Goldman</span>
          </div>
        </div>

        <div className="space-y-2 text-[12px] leading-relaxed text-white/80">
          <p>Hi Riley,</p>
          <p>
            I&apos;m a UNC freshman starting fall IB recruiting. Jake Bennett (UNC Greek Life) mentioned you took a similar path, UNC to GS, and suggested I reach out.
          </p>
          <p>
            Would you be open to a 15-min coffee chat? Happy to work around your schedule.
          </p>
          <p>Thanks, Sam</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-3 flex items-center gap-2">
        <button className="flex-1 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9] hover:bg-[#0EA5E9]/20">
          Copy
        </button>
        <button className="flex-1 border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/[0.08]">
          Mark Sent
        </button>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          Edit before send
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Discover
// ─────────────────────────────────────────────────────────────────────────────

function DiscoverPreview() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Discover · 12 new paths found
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          3 of 12
        </span>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="inline-flex items-center border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
            Warm
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-blue-400">
            76
          </span>
        </div>

        <div className="px-4 py-4">
          <h4 className="text-base font-bold text-white">Elena Ruiz</h4>
          <p className="mb-3 text-xs text-white/60">Associate · Moelis &amp; Company</p>

          <div className="mb-3 border border-[#0EA5E9]/20 bg-[#0EA5E9]/[0.04] p-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-white/50">
              Warm Path
            </p>
            <p className="font-mono text-[11px] leading-relaxed text-[#0EA5E9]">
              Via Jake Bennett (Greek Life) to Associate at Moelis
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span>UNC &apos;21</span>
            <span>·</span>
            <span>New York</span>
            <span>·</span>
            <span>Shared: Kenan-Flagler</span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/[0.06] px-4 py-3">
          <button className="flex flex-1 items-center justify-center gap-1.5 border border-white/[0.12] py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-red-500/10 hover:text-red-400">
            <X className="h-3 w-3" />
            Skip
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 bg-[#0EA5E9] py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#0EA5E9]/80">
            <Star className="h-3 w-3" />
            High Value
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: Pipeline
// ─────────────────────────────────────────────────────────────────────────────

function PipelinePreview() {
  const columns = [
    {
      stage: "Discovered",
      dot: "bg-slate-400",
      contacts: [
        { name: "Drew Castro", firm: "Lazard", score: 62 },
        { name: "Cam Lee", firm: "Houlihan", score: 55 },
      ],
    },
    {
      stage: "Contacted",
      dot: "bg-[#0EA5E9]",
      contacts: [
        { name: "Riley Chen", firm: "Goldman", score: 71 },
        { name: "Miles Park", firm: "Evercore", score: 65 },
      ],
    },
    {
      stage: "Responded",
      dot: "bg-amber-400",
      contacts: [{ name: "Nisha Rao", firm: "Centerview", score: 78, check: true }],
    },
    {
      stage: "Meeting",
      dot: "bg-green-400",
      contacts: [{ name: "Ben Kaminski", firm: "KKR", score: 82, meeting: true }],
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
          Pipeline · This week
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
          6 contacts active
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {columns.map((col, ci) => (
          <motion.div
            key={col.stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * ci, duration: 0.3 }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
                {col.stage}
              </span>
              <span className="ml-auto font-mono text-[9px] tabular-nums text-white/30">
                {col.contacts.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {col.contacts.map((c) => (
                <div
                  key={c.name}
                  className="border border-white/[0.06] bg-white/[0.02] p-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate text-[11px] font-semibold text-white">
                      {c.name}
                    </p>
                    {"check" in c && (
                      <Check className="h-3 w-3 shrink-0 text-green-400" />
                    )}
                  </div>
                  <p className="truncate text-[9px] text-white/50">{c.firm}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className="h-[2px] flex-1 bg-white/[0.08]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.score}%` }}
                        transition={{ delay: 0.08 * ci + 0.15, duration: 0.6 }}
                        className="h-[2px] bg-[#0EA5E9]"
                      />
                    </div>
                    <span className="font-mono text-[8px] tabular-nums text-white/50">
                      {c.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* AutoGuard footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="pc-tab-dot h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
            Autoguard Active
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
          View all
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
