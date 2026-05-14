"use client";

import Link from "next/link";
import { useRef, useEffect, useCallback } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import { TrendingUp, Building2, Briefcase } from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FIRMS: { name: string; count: number }[] = [
  { name: "Goldman Sachs", count: 312 }, // TODO: replace with real DB count
  { name: "Morgan Stanley", count: 287 }, // TODO: replace with real DB count
  { name: "JPM", count: 295 }, // TODO: replace with real DB count
  { name: "Evercore", count: 142 }, // TODO: replace with real DB count
  { name: "Centerview", count: 89 }, // TODO: replace with real DB count
  { name: "Lazard", count: 156 }, // TODO: replace with real DB count
  { name: "PJT Partners", count: 67 }, // TODO: replace with real DB count
  { name: "Moelis", count: 71 }, // TODO: replace with real DB count
  { name: "KKR", count: 134 }, // TODO: replace with real DB count
  { name: "Blackstone", count: 198 }, // TODO: replace with real DB count
  { name: "Apollo", count: 167 }, // TODO: replace with real DB count
  { name: "Carlyle", count: 121 }, // TODO: replace with real DB count
  { name: "Warburg Pincus", count: 87 }, // TODO: replace with real DB count
  { name: "McKinsey", count: 412 }, // TODO: replace with real DB count
  { name: "Bain & Company", count: 287 }, // TODO: replace with real DB count
  { name: "BCG", count: 245 }, // TODO: replace with real DB count
  { name: "Deloitte", count: 567 }, // TODO: replace with real DB count
  { name: "EY", count: 489 }, // TODO: replace with real DB count
  { name: "PwC", count: 421 }, // TODO: replace with real DB count
  { name: "KPMG", count: 356 }, // TODO: replace with real DB count
  { name: "Citadel", count: 78 }, // TODO: replace with real DB count
  { name: "Point72", count: 65 }, // TODO: replace with real DB count
  { name: "Two Sigma", count: 54 }, // TODO: replace with real DB count
  { name: "Bridgewater", count: 47 }, // TODO: replace with real DB count
  { name: "D.E. Shaw", count: 39 }, // TODO: replace with real DB count
];

// Deterministic mini network graph specs -- one per card
type NodeSpec = { cx: number; cy: number; pulse?: true };
type EdgeSpec = { x1: number; y1: number; x2: number; y2: number };
type GraphSpec = { nodes: NodeSpec[]; edges: EdgeSpec[] };

const GRAPH_IB: GraphSpec = {
  nodes: [
    { cx: 40, cy: 16 },
    { cx: 72, cy: 30 },
    { cx: 20, cy: 42 },
    { cx: 58, cy: 52, pulse: true },
    { cx: 16, cy: 68 },
    { cx: 68, cy: 72 },
  ],
  edges: [
    { x1: 40, y1: 16, x2: 72, y2: 30 },
    { x1: 40, y1: 16, x2: 20, y2: 42 },
    { x1: 72, y1: 30, x2: 58, y2: 52 },
    { x1: 20, y1: 42, x2: 58, y2: 52 },
    { x1: 20, y1: 42, x2: 16, y2: 68 },
    { x1: 58, y1: 52, x2: 68, y2: 72 },
    { x1: 16, y1: 68, x2: 68, y2: 72 },
  ],
};

const GRAPH_PE: GraphSpec = {
  nodes: [
    { cx: 30, cy: 14 },
    { cx: 66, cy: 20 },
    { cx: 14, cy: 38 },
    { cx: 52, cy: 36 },
    { cx: 74, cy: 52, pulse: true },
    { cx: 28, cy: 62 },
  ],
  edges: [
    { x1: 30, y1: 14, x2: 66, y2: 20 },
    { x1: 30, y1: 14, x2: 14, y2: 38 },
    { x1: 66, y1: 20, x2: 52, y2: 36 },
    { x1: 14, y1: 38, x2: 52, y2: 36 },
    { x1: 52, y1: 36, x2: 74, y2: 52 },
    { x1: 14, y1: 38, x2: 28, y2: 62 },
    { x1: 74, y1: 52, x2: 28, y2: 62 },
  ],
};

const GRAPH_CONSULTING: GraphSpec = {
  nodes: [
    { cx: 44, cy: 12 },
    { cx: 18, cy: 28 },
    { cx: 70, cy: 26 },
    { cx: 36, cy: 48 },
    { cx: 66, cy: 58, pulse: true },
    { cx: 22, cy: 66 },
  ],
  edges: [
    { x1: 44, y1: 12, x2: 18, y2: 28 },
    { x1: 44, y1: 12, x2: 70, y2: 26 },
    { x1: 18, y1: 28, x2: 36, y2: 48 },
    { x1: 70, y1: 26, x2: 66, y2: 58 },
    { x1: 36, y1: 48, x2: 66, y2: 58 },
    { x1: 36, y1: 48, x2: 22, y2: 66 },
    { x1: 18, y1: 28, x2: 22, y2: 66 },
  ],
};

const SOLUTIONS = [
  {
    title: "Investment Banking",
    subtitle: "Break into bulge bracket and elite boutiques",
    Icon: TrendingUp,
    alumniCount: 2400, // TODO: replace with real DB count
    points: [
      "Map alumni at Goldman, Evercore, Centerview, and 50+ firms",
      "Score connections by shared school, Greek org, and hometown",
      "Draft authentic cold outreach that gets responses",
    ],
    graph: GRAPH_IB,
  },
  {
    title: "Private Equity & Hedge Funds",
    subtitle: "Build relationships at mega funds and top HFs",
    Icon: Building2,
    alumniCount: 1800, // TODO: replace with real DB count
    points: [
      "Discover warm paths to KKR, Blackstone, Apollo, and more",
      "Track who changed roles or got promoted recently",
      "Pipeline management from first email to coffee chat",
    ],
    graph: GRAPH_PE,
  },
  {
    title: "Consulting",
    subtitle: "Connect with MBB and Big 4 alumni",
    Icon: Briefcase,
    alumniCount: 3200, // TODO: replace with real DB count
    points: [
      "Find McKinsey, Bain, BCG alumni in your network",
      "AI scoring highlights your strongest connections",
      "Authentic outreach drafts -- no spray-and-pray",
    ],
    graph: GRAPH_CONSULTING,
  },
];

// ---------------------------------------------------------------------------
// SVG mesh background -- ~30 deterministic dots with connecting lines
// No Vanta -- lightweight CSS-animated SVG only
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

// Connect each node to its 2 nearest neighbors (deterministic, precomputed)
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
// NetworkThumbnail -- inline SVG per card
// ---------------------------------------------------------------------------

function NetworkThumbnail({ graph }: { graph: GraphSpec }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 88 88"
      aria-hidden
      className="pointer-events-none absolute right-4 top-4 opacity-60"
    >
      {graph.edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="#0EA5E9"
          strokeOpacity="0.35"
          strokeWidth="0.6"
        />
      ))}
      {graph.nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r={n.pulse ? 3 : 2.5}
          fill="#0EA5E9"
          className={n.pulse ? "thumb-pulse" : undefined}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CountUp -- framer-motion useInView + rAF animation
// ---------------------------------------------------------------------------

function CountUp({ end }: { end: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (!isInView || started.current || !ref.current) return;
    started.current = true;

    const duration = 1500;
    const startTime = performance.now();
    const el = ref.current;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * end);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [isInView, end]);

  return <span ref={ref}>0</span>;
}

// ---------------------------------------------------------------------------
// SolutionCard -- 3D tilt + gradient border + CountUp + NetworkThumbnail
// ---------------------------------------------------------------------------

type SolutionCardProps = {
  sol: (typeof SOLUTIONS)[number];
  index: number;
};

function SolutionCard({ sol, index }: SolutionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Track tilt via direct DOM manipulation to avoid re-render on every mousemove
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
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
      style={{ perspective: 1000 }}
    >
      {/* Gradient border wrapper */}
      <div className="card-border-wrapper group relative rounded-xl p-px">
        {/* Rotating conic gradient border (visible on hover via group) */}
        <div
          className="card-border-ring pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        {/* Inner card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm"
        >
          {/* Network thumbnail */}
          <NetworkThumbnail graph={sol.graph} />

          {/* Icon */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] shadow-[0_0_24px_rgba(14,165,233,0.4)]">
            <sol.Icon className="h-5 w-5" aria-hidden />
          </div>

          {/* Heading */}
          <h3 className="font-heading text-xl font-semibold text-white">
            {sol.title}
          </h3>
          <p className="mt-1 text-sm text-white/70">{sol.subtitle}</p>

          {/* Live alumni counter */}
          <div className="mt-4">
            <div className="font-mono text-3xl font-bold tabular-nums text-[#0EA5E9]">
              <CountUp end={sol.alumniCount} />+
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">
              alumni mapped
            </div>
          </div>

          {/* Bullets */}
          <ul className="mt-4 flex-1 space-y-2">
            {sol.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2 text-sm text-white/60"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#0EA5E9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/waitlist"
            className="mt-6 block w-full rounded-lg bg-[#0EA5E9] py-2.5 text-center text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_32px_rgba(14,165,233,0.5)]"
          >
            Request Access
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FirmTicker -- status-dot marquee
// ---------------------------------------------------------------------------

function FirmTicker() {
  return (
    <div className="mt-16 overflow-hidden border-t border-white/[0.06] pt-6">
      <p className="mb-4 text-center text-[10px] font-medium uppercase tracking-widest text-white/40">
        Target Firms
      </p>
      <div className="relative flex overflow-hidden">
        <div className="animate-ticker flex shrink-0 items-center gap-8">
          {FIRMS.map((firm) => (
            <span
              key={firm.name}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-white/60"
            >
              <span className="ticker-dot inline-block h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
              {firm.name} · {firm.count.toLocaleString()} alumni
            </span>
          ))}
        </div>
        <div className="animate-ticker flex shrink-0 items-center gap-8" aria-hidden>
          {FIRMS.map((firm) => (
            <span
              key={firm.name}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-white/60"
            >
              <span className="ticker-dot inline-block h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
              {firm.name} · {firm.count.toLocaleString()} alumni
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SolutionsSection
// ---------------------------------------------------------------------------

export function SolutionsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  return (
    <section
      id="solutions"
      ref={sectionRef}
      className="relative bg-black py-24 px-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes injected via plain <style> (no jsx prop -- App Router) */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-ticker {
          animation: ticker 50s linear infinite;
        }

        @keyframes dot-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
        .ticker-dot {
          animation: dot-pulse 2.4s ease-in-out infinite;
        }

        @keyframes thumb-pulse-r {
          0%, 100% { r: 3; }
          50%       { r: 5; }
        }
        .thumb-pulse {
          animation: thumb-pulse-r 2s ease-in-out infinite;
        }

        @keyframes mesh-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node {
          animation: mesh-pulse var(--d, 3s) ease-in-out infinite;
        }

        @keyframes border-spin {
          to { --border-angle: 360deg; }
        }

        @property --border-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .card-border-ring {
          background: conic-gradient(
            from var(--border-angle, 0deg),
            #0EA5E9, #22D3EE, #06B6D4, #0EA5E9
          );
          animation: border-spin 4s linear infinite;
        }

        /* Mask: show only 1px ring at perimeter */
        .card-border-wrapper {
          position: relative;
        }
        .card-border-ring::before {
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
              className="mesh-node"
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
            Built for ambitious students
          </h2>
          <p className="mx-auto max-w-xl text-center text-white/70">
            Whether you&apos;re targeting IB, PE, or consulting -- KithNode maps
            the fastest path to the people who matter.
          </p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Cards */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="relative mx-auto max-w-6xl"
        style={{ perspective: 1000 }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SOLUTIONS.map((sol, i) => (
            <SolutionCard key={sol.title} sol={sol} index={i} />
          ))}
        </div>

        {/* Ticker */}
        <FirmTicker />
      </div>
    </section>
  );
}
