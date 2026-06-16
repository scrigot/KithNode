"use client";

import * as React from "react";
import { Mail, Pencil, Wand2, Sparkles, MousePointer2 } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { MeshBg } from "./mesh-bg";
import { WarmSignalsReplica } from "./warm-signals-replica";

// ---------------------------------------------------------------------------
// Auto-looping product demo inside a floating, slightly-tilted macOS window.
// Phases (setTimeout chain; rAF is throttled in the preview, setTimeout + CSS
// transform transitions are not): idle -> cursor moves to Riley -> click ->
// modal opens -> body generates line-by-line -> hold -> loop.
//
// Branding split: the window FRAME is rounded landing chrome; everything inside
// (dashboard + modal) is brand/dashboard.md sharp/navy.
// ---------------------------------------------------------------------------

// idle, moving, clicked, opening, typing, hold
const PHASE_MS = [1000, 1200, 500, 500, 2200, 2600];

function Signal({ children }: { children: React.ReactNode }) {
  return <span className="bg-primary/20 px-1 text-primary">{children}</span>;
}

export function SectionEmailMac() {
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const run = (p: number) => {
      setPhase(p);
      t = setTimeout(() => run((p + 1) % PHASE_MS.length), PHASE_MS[p]);
    };
    run(0);
    return () => clearTimeout(t);
  }, []);

  const moved = phase >= 1; // cursor glided onto Riley
  const highlight = phase >= 2; // Riley row ringed
  const modalOpen = phase >= 3; // draft modal visible
  const drafted = phase >= 5; // body finished generating

  return (
    <section className="relative overflow-hidden bg-black px-4 py-24 sm:py-32">
      <MeshBg />
      <style>{`
        @keyframes em-pop { 0%{opacity:0;transform:scale(.94)} 100%{opacity:1;transform:scale(1)} }
        @keyframes em-caret { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes em-line { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes em-click { 0%{opacity:.7;transform:scale(.3)} 100%{opacity:0;transform:scale(2.4)} }
        .em-pop{animation:em-pop .5s cubic-bezier(.16,1,.3,1) both}
        .em-caret{animation:em-caret 1.1s step-end infinite}
        .em-line{animation:em-line .4s ease-out both}
        .em-click{animation:em-click .5s ease-out both}
      `}</style>

      {/* Soft teal glow behind the floating window */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[min(90%,60rem)] -translate-x-1/2 -translate-y-1/3"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(14,165,233,0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="text-center">
            <h2 className="font-heading text-4xl font-medium leading-[1.25] tracking-[-0.027em] text-white sm:text-5xl">
              Then reach out, warm
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[19px] leading-relaxed tracking-[-0.02em] text-white/60">
              KithNode drafts the intro on your warmest path. You send it.
            </p>
          </div>

          {/* Floating, tilted macOS window */}
          <div className="mx-auto mt-14 max-w-5xl [perspective:2000px]">
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

              {/* Window body */}
              <div className="relative">
                <WarmSignalsReplica highlightFirst={highlight} />

                {/* Dim the dashboard once the modal is open */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-black/50 transition-opacity duration-300 ${modalOpen ? "opacity-100" : "opacity-0"}`}
                />

                {/* Cursor + click pulse, anchored over the Riley row */}
                <div
                  className="pointer-events-none absolute"
                  style={{ left: "30%", top: "32%" }}
                >
                  {phase === 2 && (
                    <span
                      key="click"
                      className="em-click absolute -left-1 -top-1 block h-8 w-8 rounded-full border-2 border-primary"
                    />
                  )}
                  <span
                    className="absolute left-0 top-0 block text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    style={{
                      transform: moved
                        ? "translate(0,0)"
                        : "translate(180px,150px)",
                      transition: moved
                        ? "transform 1.1s cubic-bezier(.5,0,.2,1)"
                        : "none",
                    }}
                  >
                    <MousePointer2 className="h-6 w-6 fill-white" />
                  </span>
                </div>

                {/* Email draft modal -- DASHBOARD branding, SHARP corners */}
                {modalOpen && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="em-pop w-[min(92%,40rem)] border border-primary/30 bg-card shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-[11px] uppercase tracking-wider text-primary">
                          Draft Outreach
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        {drafted ? "AI Drafted" : "AI Drafting..."}
                      </span>
                    </div>

                    {/* Recipient + subject */}
                    <div className="space-y-2.5 border-b border-white/[0.06] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          To
                        </span>
                        <span className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-bg-card px-2 py-0.5 text-[12px] text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                          Riley Chen
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          riley.chen@goldmansachs.com
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          Subject
                        </span>
                        <span className="text-[13px] text-foreground">
                          Coffee chat about your path from UNC to Goldman
                        </span>
                      </div>
                    </div>

                    {/* Body -- generates line by line */}
                    <div className="space-y-3 px-4 py-4 text-[13px] leading-relaxed text-foreground">
                      <p className="em-line" style={{ animationDelay: "0.1s" }}>
                        Hi Riley,
                      </p>
                      <p className="em-line" style={{ animationDelay: "0.5s" }}>
                        I am a <Signal>UNC</Signal> sophomore and a brother at{" "}
                        <Signal>Chi Phi</Signal>. Our mutual friend{" "}
                        <Signal>Jake Bennett</Signal> mentioned you made the jump
                        from Chapel Hill to Goldman and spoke highly of you.
                      </p>
                      <p className="em-line" style={{ animationDelay: "1.1s" }}>
                        Would you be open to a 15 minute coffee chat about how you
                        broke in? I would love to hear what actually moved the
                        needle for you.
                      </p>
                      <p
                        className="em-line text-muted-foreground"
                        style={{ animationDelay: "1.6s" }}
                      >
                        Best,
                      </p>
                      <p className="em-line" style={{ animationDelay: "1.7s" }}>
                        Sam
                        <span className="em-caret ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-primary align-middle" />
                      </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2.5">
                      <span className="h-2 w-2 bg-primary/20" />
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mutual signals, highlighted for relevance
                      </span>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 border-t border-white/[0.06] bg-bg-primary px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white"
                      >
                        <Mail className="h-3 w-3" />
                        Open in Outlook
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        <Wand2 className="h-3 w-3" />
                        Regen with AI
                      </button>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
