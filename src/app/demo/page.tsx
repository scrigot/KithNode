import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "../_landing/navbar";
import { PanelDiscover } from "./_components/panel-discover";
import { PanelSignal } from "./_components/panel-signal";
import { PanelScoring } from "./_components/panel-scoring";
import { PanelOutreach } from "./_components/panel-outreach";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Click around the real KithNode sandbox with seeded alumni, warm paths, and pipeline data.",
};

// Deterministic mesh for the hero background, mirroring the solutions section.
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

export default function DemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <Navbar />

      {/* Hero band */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {/* SVG mesh background */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(14,165,233,0.12) 0%, transparent 60%)",
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
                strokeOpacity="0.14"
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
                opacity="0.6"
              />
            ))}
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0EA5E9]" />
            Live Sandbox. Seeded Data.
          </span>
          <h1 className="mt-6 font-heading text-5xl font-bold tracking-tight text-white md:text-7xl">
            Click around the real KithNode
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
            Try the sandbox dashboard with seeded alumni. Then sign up to build
            your real warm-path network.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/demo/sandbox"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-[#0EA5E9]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#0EA5E9]/40"
            >
              Try the live sandbox
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/waitlist?from=demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
            >
              <Sparkles className="h-4 w-4" />
              Request access
            </Link>
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
            No login. No real people. Just the product.
          </p>
        </div>
      </section>

      {/* Panel preview band */}
      <section className="relative border-t border-white/[0.06] bg-black py-16">
        <div className="relative mx-auto max-w-[1200px] px-6">
          <div className="mb-10">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How it works, end to end.
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Four stages. Discover, signal, score, outreach.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[
              { Component: PanelDiscover, label: "01 Discover" },
              { Component: PanelSignal, label: "02 Signal" },
              { Component: PanelScoring, label: "03 Scoring" },
              { Component: PanelOutreach, label: "04 Outreach" },
            ].map(({ Component, label }) => (
              <div
                key={label}
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0EA5E9]">
                  {label}
                </p>
                <Component />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA strip */}
      <section className="relative border-t border-white/[0.06] bg-black py-16">
        <div className="relative mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0EA5E9]/10 via-white/[0.02] to-[#06B6D4]/5 p-10 text-center md:flex-row md:text-left">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to build your warm network?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                Start your sandbox or request access. Same product, your real
                alumni graph.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo/sandbox"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#0EA5E9]/30 transition-all hover:-translate-y-0.5"
              >
                Start your sandbox
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/waitlist?from=demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                Request access
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-wider text-white/40">
            Demo data. Personas and targets are fictional. No real individuals
            are represented.
          </p>
        </div>
      </section>
    </main>
  );
}
