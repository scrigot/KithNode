"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface TourStep {
  target: string; // data-tour value
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    target: "overview",
    title: "Overview",
    description: "Your command center: pipeline health, weekly outreach goals, and warm-signal activity at a glance.",
  },
  {
    target: "warm-signals",
    title: "Warm Signals",
    description: "Contacts ranked by affiliation score. Sort by HOT/WARM/MONITOR to prioritize your outreach queue.",
  },
  {
    target: "discover",
    title: "Discover",
    description: "AI-sourced leads from your target firms. Swipe to add to your pipeline or skip.",
  },
  {
    target: "pipeline",
    title: "Pipeline",
    description: "Track every conversation stage from first outreach to offer. Move contacts through the funnel.",
  },
  {
    target: "network",
    title: "Network",
    description: "Visualize your connection graph. Spot warm paths to target contacts through mutual alumni.",
  },
  {
    target: "import",
    title: "Import",
    description: "Upload your LinkedIn connections CSV to seed warm-path scoring and the contact graph.",
  },
  {
    target: "settings",
    title: "Settings",
    description: "Set your target firms, industries, and recruiting timeline so scores reflect your actual goals.",
  },
  {
    target: "credits-meter",
    title: "Credits",
    description: "Each enrich, discover, or draft action costs credits. Click here to see your usage history.",
  },
  {
    target: "sidebar-collapse",
    title: "Sidebar",
    description: "Collapse the sidebar with Ctrl+B (or Cmd+B) to reclaim screen space when reviewing contacts.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function TooltipCard({
  step,
  stepIndex,
  total,
  rect,
  onBack,
  onNext,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  total: number;
  rect: Rect | null;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const TOOLTIP_W = 280;
  const cardRef = useRef<HTMLDivElement>(null);
  // Measure the real card height (description length varies per step) so the
  // viewport clamp below never lets the Back/Next footer spill off-screen.
  const [measuredH, setMeasuredH] = useState(170);
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - measuredH) > 1) setMeasuredH(h);
  });
  const TOOLTIP_H = measuredH;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let top = 0;
  let left = 0;

  if (rect) {
    // Prefer positioning to the right of the target; fall back to below.
    const rightEdge = rect.left + rect.width + 12 + TOOLTIP_W;
    if (rightEdge <= vw) {
      left = rect.left + rect.width + 12;
      top = rect.top;
    } else {
      left = rect.left;
      top = rect.top + rect.height + 12;
    }
    // Clamp so tooltip stays on screen.
    if (left + TOOLTIP_W > vw - 8) left = vw - TOOLTIP_W - 8;
    if (left < 8) left = 8;
    if (top + TOOLTIP_H > vh - 8) top = vh - TOOLTIP_H - 8;
    if (top < 8) top = 8;
  } else {
    // Center fallback when element not found.
    left = (vw - TOOLTIP_W) / 2;
    top = (vh - TOOLTIP_H) / 2;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Tour step ${stepIndex + 1} of ${total}: ${step.title}`}
      style={{ position: "fixed", top, left, width: TOOLTIP_W, zIndex: 10001 }}
      className="border border-accent-teal/30 bg-bg-secondary shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Step {stepIndex + 1}/{total}
        </span>
        <button
          onClick={onSkip}
          className="text-[10px] uppercase tracking-wider text-text-muted hover:text-white transition-colors duration-150"
        >
          Skip
        </button>
      </div>
      {/* Body */}
      <div className="px-4 py-3">
        <p className="mb-1 text-[13px] font-bold text-white">{step.title}</p>
        <p className="text-[12px] leading-relaxed text-text-secondary">{step.description}</p>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
        <button
          onClick={onBack}
          disabled={isFirst}
          className="text-[11px] uppercase tracking-wider text-text-muted hover:text-white transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="border border-accent-teal/40 bg-accent-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20 transition-colors duration-150"
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

export function DashboardTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const initChecked = useRef(false);

  const updateRect = useCallback((idx: number) => {
    const step = STEPS[idx];
    if (!step) return;
    setRect(getTargetRect(step.target));
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    // Defer rect calc so DOM has settled.
    requestAnimationFrame(() => updateRect(0));
  }, [updateRect]);

  const finish = useCallback(async () => {
    setActive(false);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorial_done_at: new Date().toISOString() }),
      });
    } catch {
      // best-effort
    }
  }, []);

  // Auto-start once when tutorialDoneAt is null.
  useEffect(() => {
    if (initChecked.current) return;
    initChecked.current = true;
    fetch("/api/user/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.tutorialDoneAt === null) {
          start();
        }
      })
      .catch(() => {});
  }, [start]);

  // Listen for relaunch event.
  useEffect(() => {
    const handler = () => start();
    window.addEventListener("kn:start-tour", handler);
    return () => window.removeEventListener("kn:start-tour", handler);
  }, [start]);

  // Update rect when step changes.
  useEffect(() => {
    if (!active) return;
    updateRect(stepIndex);
  }, [active, stepIndex, updateRect]);

  // Recalculate on window resize.
  useEffect(() => {
    if (!active) return;
    const onResize = () => updateRect(stepIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, stepIndex, updateRect]);

  const handleNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  if (!active) return null;

  const step = STEPS[stepIndex];

  return (
    <>
      {/* Full-screen overlay with cut-out */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "all" }}
        onClick={finish}
        aria-hidden="true"
      >
        {rect ? (
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <mask id="kn-tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.72)"
              mask="url(#kn-tour-mask)"
            />
            {/* Highlight border */}
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              fill="none"
              stroke="rgba(14,165,233,0.6)"
              strokeWidth={1}
            />
          </svg>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />
        )}
      </div>
      {/* Tooltip (above overlay, non-dismissing clicks) */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10001, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <div style={{ pointerEvents: "all" }}>
          <TooltipCard
            step={step}
            stepIndex={stepIndex}
            total={STEPS.length}
            rect={rect}
            onBack={handleBack}
            onNext={handleNext}
            onSkip={finish}
          />
        </div>
      </div>
    </>
  );
}
