"use client";

import * as React from "react";
import { Activity, TrendingUp } from "lucide-react";

// ---------------------------------------------------------------------------
// AI-scoring product shot inside a floating, slightly-tilted macOS window --
// the same window chrome as the hero's email demo (section-email-mac.tsx), so
// the landing reads as one app. Inside = brand/dashboard.md styling: sharp 0px,
// navy bg-bg-primary/bg-card, mono micro-labels, teal bars. The signal bars
// fill + the overall score reveals once the window scrolls into view (CSS
// transition driven by an IntersectionObserver -- rAF is throttled in preview,
// CSS transitions are not). The breakdown is illustrative, the LOOK is 1:1.
// ---------------------------------------------------------------------------

const BARS = [
  { label: "Response Likelihood", display: "87%", value: 87, detail: "Active on LinkedIn, posted 3 days ago" },
  { label: "Role Fit", display: "91%", value: 91, detail: "LevFin matches John's target group" },
  { label: "Network Distance", display: "2 hops", value: 78, detail: "Reachable via Chi Phi alumni network" },
  { label: "Timing", display: "95%", value: 95, detail: "Summer Analyst applications open in 4 weeks" },
  { label: "Career Overlap", display: "88%", value: 88, detail: "Kenan-Flagler to BofA IBD, a well-worn path" },
];

const OVERALL = 92;

export function ScoringMacDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [lit, setLit] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLit(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* Soft teal glow behind the floating window */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[min(90%,60rem)] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(14,165,233,0.16), transparent 70%)",
        }}
      />

      {/* Floating, tilted macOS window */}
      <div className="relative mx-auto max-w-5xl [perspective:2000px]">
        <div
          className="overflow-hidden rounded-[16px] border border-white/10 bg-[#0A1628] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          style={{ transform: "rotateX(2deg) rotateY(-3deg)" }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-[#0F1A2E] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="truncate font-mono text-[11px] text-white/50">
                kithnode.ai/dashboard/contacts
              </span>
            </div>
          </div>

          {/* Window body -- dashboard score panel (sharp / navy) */}
          <div className="bg-bg-primary p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    AI Scoring
                  </span>
                  <span className="h-px w-8 bg-white/10" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Riley Chen &middot; Goldman Sachs
                  </span>
                </div>
                <h3 className="mt-1.5 font-mono text-sm font-bold uppercase tracking-wider text-white">
                  The math behind the match
                </h3>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                <Activity className="h-3 w-3" />
                Model v3.2
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(0,260px)]">
              {/* Signal bars */}
              <div className="flex flex-col gap-4 lg:border-r lg:border-white/[0.06] lg:pr-6">
                {BARS.map((bar, i) => (
                  <div key={bar.label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {bar.label}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums text-white">
                        {bar.display}
                      </span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden bg-white/[0.06]">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] transition-[width] duration-1000 ease-out"
                        style={{
                          width: lit ? `${bar.value}%` : 0,
                          transitionDelay: `${i * 100 + 200}ms`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/80">
                      {bar.detail}
                    </p>
                  </div>
                ))}
              </div>

              {/* Overall score tile */}
              <div className="flex flex-col justify-between gap-4 border border-white/[0.06] bg-card p-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Overall Match
                  </p>
                  <div
                    className={`mt-3 flex items-baseline gap-2 transition-all duration-700 ${
                      lit ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: "600ms" }}
                  >
                    <span className="font-heading text-6xl font-bold tabular-nums text-white">
                      {OVERALL}
                    </span>
                    <span className="font-mono text-sm text-white/40">/ 100</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">
                    Weighted across five signal categories, by how strongly each
                    one predicts a warm reply.
                  </p>
                </div>

                <div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  <div className="mt-4 flex items-start gap-2 border border-primary/20 bg-primary/5 p-3">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                        Expected response rate
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        Much warmer than a cold email
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
