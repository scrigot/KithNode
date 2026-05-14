"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Heart,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  MapPin,
  GraduationCap,
} from "lucide-react";
import {
  SANDBOX_DISCOVER_QUEUE,
  type SandboxDiscoverCard,
} from "../_data";

const TIER_BADGE: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

type SwipeDir = "left" | "right" | null;

function buildWarmChain(card: SandboxDiscoverCard): string {
  const wp = card.warmPaths[0];
  if (!wp) return "";
  return `Via Sam Rigot UNC '29 -> ${wp.intermediaryName} -> ${card.name}, ${card.title} at ${card.firmName}`;
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-primary/15 font-mono text-lg font-bold tabular-nums text-primary">
      {initials}
    </div>
  );
}

export default function SandboxDiscoverPage() {
  const [index, setIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<SwipeDir>(null);
  const [animatingIn, setAnimatingIn] = useState(false);

  const queue = SANDBOX_DISCOVER_QUEUE;
  const total = queue.length;
  const card = queue[index];
  const done = index >= total;

  function handleRate(rating: "skip" | "high_value") {
    if (swipeDir || done) return;
    setSwipeDir(rating === "skip" ? "left" : "right");
    window.setTimeout(() => {
      setIndex((i) => i + 1);
      setSwipeDir(null);
      setAnimatingIn(true);
      window.setTimeout(() => setAnimatingIn(false), 300);
    }, 300);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleRate("skip");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleRate("high_value");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [swipeDir, done]);

  return (
    <div className="flex min-h-full flex-col items-center bg-bg-primary p-4">
      {/* Header */}
      <div className="flex w-full max-w-3xl items-end justify-between pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            DISCOVER
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Rate seeded alumni. Train your warm-path engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">
            {Math.min(index + 1, total)} / {total}
          </span>
          <div className="hidden h-1 w-28 overflow-hidden bg-white/[0.06] md:block">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (Math.min(index, total) / total) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex w-full max-w-3xl flex-1 items-start justify-center">
        {done ? (
          <div className="flex w-full flex-col items-center border border-white/[0.06] bg-card p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center bg-primary/15 text-primary">
              <Sparkles size={26} />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">
              You rated {total} contacts.
            </h3>
            <p className="mt-2 max-w-md text-[13px] text-muted-foreground">
              Sign up to discover real warm paths to YOUR target firms. Same
              swipe flow, real alumni, real intermediaries pulled from your
              network graph.
            </p>
            <Link
              href="/waitlist?from=demo&section=discover"
              className="mt-5 flex items-center gap-2 bg-primary px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
            >
              <Sparkles size={12} />
              Get my real network
            </Link>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setAnimatingIn(true);
                window.setTimeout(() => setAnimatingIn(false), 300);
              }}
              className="mt-3 border border-white/[0.12] px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Replay sandbox
            </button>
          </div>
        ) : card ? (
          <div
            key={card.id}
            className={`flex w-full flex-col border border-white/[0.06] bg-card ${
              swipeDir === "left"
                ? "animate-slide-out-left"
                : swipeDir === "right"
                  ? "animate-slide-out-right"
                  : animatingIn
                    ? "animate-slide-in"
                    : ""
            }`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <span
                className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  TIER_BADGE[card.tier]
                }`}
              >
                {card.tier}
              </span>
              <span className="font-mono text-3xl font-bold tabular-nums text-primary">
                {card.warmthScore}
              </span>
            </div>

            {/* Identity */}
            <div className="flex items-start gap-4 px-5 py-4">
              <Avatar initials={card.initials} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-foreground">
                  {card.name}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {card.title} @{" "}
                  <span className="text-foreground">{card.firmName}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <GraduationCap size={10} /> {card.education}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} /> {card.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Warm path chain */}
            <div className="border-t border-white/[0.06] px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Warm Path
              </p>
              <p
                className="mt-1 text-[11px] leading-relaxed text-primary"
                style={{
                  fontFamily:
                    'ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace',
                }}
              >
                {buildWarmChain(card)}
              </p>
            </div>

            {/* Mutual connections + Signals */}
            <div className="grid grid-cols-1 gap-0 border-t border-white/[0.06] md:grid-cols-2">
              <div className="border-b border-white/[0.06] px-5 py-3 md:border-b-0 md:border-r">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  <Users size={10} />
                  Mutual Connections
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {card.mutualConnections.map((m) => {
                    const parts = m.split(" ");
                    const initials = parts
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")
                      .toUpperCase();
                    return (
                      <li
                        key={m}
                        className="flex items-center gap-1.5 border border-white/[0.06] bg-background px-2 py-1"
                      >
                        <span className="flex h-5 w-5 items-center justify-center bg-primary/15 font-mono text-[9px] font-bold tabular-nums text-primary">
                          {initials}
                        </span>
                        <span className="text-[11px] text-foreground">{m}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="px-5 py-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Signals
                </p>
                <ul className="mt-2 space-y-1.5">
                  {card.signals.map((s) => (
                    <li key={s.label} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center bg-accent-green/20 text-accent-green">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-foreground">
                          {s.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] px-5 py-4">
              <button
                type="button"
                onClick={() => handleRate("skip")}
                disabled={!!swipeDir}
                className="flex items-center justify-center gap-2 border border-white/[0.12] px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground disabled:opacity-50"
              >
                <X size={14} />
                Skip
              </button>
              <button
                type="button"
                onClick={() => handleRate("high_value")}
                disabled={!!swipeDir}
                className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
              >
                <Heart size={14} />
                High Value
              </button>
            </div>

            {/* Hint row */}
            <div className="flex items-center justify-center gap-4 border-t border-white/[0.06] bg-background/50 px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <ArrowLeft size={11} /> skip
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className="flex items-center gap-1">
                high value <ArrowRight size={11} />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer link back to overview */}
      <div className="w-full max-w-3xl pt-4 text-center">
        <Link
          href="/demo/sandbox"
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
