"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShowcaseTicker } from "./showcase-ticker";
import { ShowcaseKanban } from "./showcase-kanban";
import { ShowcaseDashboard } from "./showcase-dashboard";

// ---------------------------------------------------------------------------
// SVG mesh background -- same node/edge data as solutions-section + how-it-works
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
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: "pipeline", label: "Pipeline Preview" },
  { id: "dashboard", label: "Live Dashboard" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// ConnectorLine -- ambient teal gradient separator between stacked panels
// ---------------------------------------------------------------------------

function ConnectorLine() {
  return (
    <div className="relative my-10 flex items-center justify-center" aria-hidden>
      {/* Horizontal fade lines */}
      <div
        className="h-px w-24 sm:w-40"
        style={{
          background: "linear-gradient(to right, transparent, rgba(14,165,233,0.35))",
        }}
      />
      {/* Center teal dot */}
      <div className="mx-3 flex items-center gap-1.5">
        <div className="h-px w-8 bg-[#0EA5E9]/40" />
        <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
        <div className="h-px w-8 bg-[#0EA5E9]/40" />
      </div>
      <div
        className="h-px w-24 sm:w-40"
        style={{
          background: "linear-gradient(to left, transparent, rgba(14,165,233,0.35))",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelWrapper -- glass frame that each sub-showcase sits inside
// ---------------------------------------------------------------------------

type PanelWrapperProps = {
  children: React.ReactNode;
  index: number;
};

function PanelWrapper({ children, index }: PanelWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: "easeOut", delay: index * 0.1 }}
    >
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        {children}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Showcase
// ---------------------------------------------------------------------------

export function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  const handleTabClick = useCallback((id: TabId) => {
    setActiveTab(id);
  }, []);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative bg-black px-4 py-24"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes mesh-pulse-sc {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node-sc {
          animation: mesh-pulse-sc var(--d, 3s) ease-in-out infinite;
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
              "radial-gradient(ellipse at center, rgba(14,165,233,0.07) 0%, transparent 60%)",
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
              className="mesh-node-sc"
              style={{ "--d": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky heading */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-20 z-10 mb-12">
        <motion.div style={{ opacity: headingOpacity }}>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From warm path to coffee chat
          </h2>
          <p className="mx-auto max-w-2xl text-center text-white/70">
            Every KithNode user sees their alumni network become a scored,
            actionable pipeline. The exact workflow that works in finance
            recruiting.
          </p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab pills */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto mb-10 flex max-w-6xl items-center justify-center"
      >
        <div className="flex items-center gap-1 rounded-full border border-white/[0.10] bg-white/[0.04] p-1 backdrop-blur-sm">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={[
                  "relative rounded-full px-5 py-2 text-[12px] font-bold uppercase tracking-wider transition-all duration-300",
                  isActive
                    ? "bg-[#0EA5E9] text-white shadow-[0_0_20px_rgba(14,165,233,0.45)]"
                    : "text-white/50 hover:text-white/80",
                ].join(" ")}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Panel content */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative mx-auto max-w-6xl">
        {activeTab === "pipeline" && (
          <>
            {/* Ticker panel */}
            <PanelWrapper index={0}>
              <ShowcaseTicker />
            </PanelWrapper>

            {/* Ambient connector */}
            <ConnectorLine />

            {/* Kanban panel */}
            <PanelWrapper index={1}>
              <ShowcaseKanban />
            </PanelWrapper>
          </>
        )}

        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-[0_8px_48px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <ShowcaseDashboard />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
