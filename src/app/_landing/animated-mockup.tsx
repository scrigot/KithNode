"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCREENS = [
  {
    title: "Warm Signals",
    content: (
      <div className="space-y-0">
        {/* Table header */}
        <div className="grid grid-cols-[1.2fr_1fr_60px_64px] gap-2 border-b border-slate-200 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>Name</span>
          <span>Company</span>
          <span className="text-right">Score</span>
          <span className="text-right">Tier</span>
        </div>
        {[
          { name: "Ben Kaminski", company: "KKR", score: 78, tier: "HOT", color: "bg-red-500" },
          { name: "Riley Chen", company: "Goldman Sachs", score: 71, tier: "HOT", color: "bg-red-500" },
          { name: "Miles Park", company: "Evercore", score: 65, tier: "WARM", color: "bg-blue-500" },
          { name: "Jamie Liu", company: "McKinsey", score: 58, tier: "WARM", color: "bg-blue-500" },
          { name: "Nisha Rao", company: "Centerview", score: 34, tier: "MONITOR", color: "bg-amber-500" },
        ].map((c) => (
          <div key={c.name} className="grid grid-cols-[1.2fr_1fr_60px_64px] gap-2 border-b border-slate-100 px-4 py-2.5 text-[11px] last:border-b-0">
            <span className="truncate font-medium text-slate-900">{c.name}</span>
            <span className="truncate text-slate-500">{c.company}</span>
            <span className="text-right font-mono tabular-nums text-slate-900">{c.score}</span>
            <span className="flex justify-end">
              <span className={`${c.color} inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white`}>
                {c.tier}
              </span>
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Scoring Breakdown",
    content: (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#0EA5E9]">
          <span className="text-3xl font-bold text-slate-900">78</span>
          <span className="absolute -bottom-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Warmth Score</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 px-4">
          {["Same School", "Target Firm", "2nd Connection", "Recent Promotion"].map((s) => (
            <span key={s} className="rounded-full bg-[#0EA5E9]/10 px-3 py-1 text-[11px] font-medium text-[#0EA5E9]">{s}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Outreach Draft",
    content: (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-medium text-slate-400">To:</span>
          <span className="text-slate-700">ben.kaminski@kkr.com</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-medium text-slate-400">Subject:</span>
          <span className="text-slate-700">UNC Alum &rarr; KKR &mdash; Quick Question</span>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="space-y-2 text-[11px] leading-relaxed text-slate-600">
          <p>Hi Ben,</p>
          <p>I noticed you graduated from Kenan-Flagler in 2019 and made the move to KKR &mdash; congrats on the trajectory. I&apos;m a sophomore at UNC exploring PE paths and would love to hear about your experience.</p>
          <p>Would you have 15 minutes for a quick call next week?</p>
        </div>
        <div className="flex gap-2 pt-2">
          <span className="rounded bg-[#0EA5E9] px-3 py-1 text-[10px] font-medium text-white">Send</span>
          <span className="rounded border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-500">Edit</span>
        </div>
      </div>
    ),
  },
  {
    title: "Pipeline",
    content: (
      <div className="grid grid-cols-4 gap-2 p-3">
        {[
          { stage: "New", count: 12, items: ["S. Martinez", "R. Patel"] },
          { stage: "Contacted", count: 8, items: ["J. Goldstein", "A. Lee"] },
          { stage: "Responded", count: 3, items: ["M. Park"] },
          { stage: "Meeting", count: 1, items: ["S. Chen"] },
        ].map((col) => (
          <div key={col.stage} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{col.stage}</span>
              <span className="text-[10px] text-slate-400">{col.count}</span>
            </div>
            {col.items.map((name) => (
              <div key={name} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 shadow-sm">
                {name}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
];

export function AnimatedMockup() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SCREENS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      {/* Browser chrome */}
      <div className="rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 rounded-md bg-white px-3 py-1 text-[11px] text-slate-400">
            kithnode.com/dashboard
          </div>
        </div>
      </div>
      {/* Screen area */}
      <div className="relative overflow-hidden rounded-b-xl border border-slate-200 bg-white" style={{ minHeight: 320 }}>
        {/* Tab bar */}
        <div className="flex border-b border-slate-200">
          {SCREENS.map((screen, i) => (
            <button
              key={screen.title}
              onClick={() => setActiveIndex(i)}
              className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                i === activeIndex
                  ? "border-b-2 border-[#0EA5E9] text-[#0EA5E9]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {screen.title}
            </button>
          ))}
        </div>
        {/* Animated content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {SCREENS[activeIndex].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
