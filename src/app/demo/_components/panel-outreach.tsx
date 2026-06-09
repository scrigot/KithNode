"use client";

import * as React from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Send, CheckCircle2, FileText } from "lucide-react";
import { outreachBody, outreachSubject, target } from "../_data";

// Maps words in the message to the signals they reference.
// We highlight those spans inline to show citations.
const HIGHLIGHTS: { phrase: string; signal: number; label: string }[] = [
  { phrase: "Chi Phi", signal: 1, label: "Shared fraternity" },
  { phrase: "Kenan-Flagler", signal: 2, label: "Shared alma mater" },
  { phrase: "Charlotte LevFin", signal: 4, label: "Target group match" },
];

function renderHighlighted(text: string) {
  // Build a list of matches ordered by index so we can splice safely.
  const matches: { start: number; end: number; idx: number }[] = [];
  HIGHLIGHTS.forEach((h, idx) => {
    const at = text.indexOf(h.phrase);
    if (at >= 0) {
      matches.push({ start: at, end: at + h.phrase.length, idx });
    }
  });
  matches.sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, k) => {
    if (m.start > cursor) {
      out.push(text.slice(cursor, m.start));
    }
    const h = HIGHLIGHTS[m.idx];
    out.push(
      <span
        key={`${m.start}-${k}`}
        className="relative inline-flex items-baseline gap-0.5 whitespace-nowrap rounded bg-[#0EA5E9]/10 px-1 font-semibold text-[#0369A1]"
        title={h.label}
      >
        {text.slice(m.start, m.end)}
        <sup className="font-mono text-[9px] font-bold text-[#0EA5E9]">
          {h.signal}
        </sup>
      </span>
    );
    cursor = m.end;
  });
  if (cursor < text.length) {
    out.push(text.slice(cursor));
  }
  return out;
}

export function PanelOutreach() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-15% 0px -15% 0px" });

  const [typedLen, setTypedLen] = React.useState(0);
  const [sent, setSent] = React.useState(false);

  // Typewriter effect. Starts on first in-view. Restarts if scrolled away.
  React.useEffect(() => {
    if (!inView) {
      setTypedLen(0);
      setSent(false);
      return;
    }
    if (reduce) {
      setTypedLen(outreachBody.length);
      return;
    }
    setTypedLen(0);
    const id = setInterval(() => {
      setTypedLen((n) => {
        if (n >= outreachBody.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 35);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const done = typedLen >= outreachBody.length;
  const typed = outreachBody.slice(0, typedLen);

  return (
    <section
      id="outreach-panel"
      ref={ref}
      className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0EA5E9]">
              Step 04
            </span>
            <span className="h-px w-8 bg-slate-200" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Smart Outreach
            </span>
          </div>
          <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900">
            Smart Outreach
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            A message grounded in every signal.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0EA5E9] sm:self-auto">
          <FileText className="h-3 w-3" />
          Grounded draft
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_minmax(0,240px)]">
        {/* Message composer */}
        <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#F7F9FC] shadow-sm">
            {/* Composer top: recipient */}
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] font-heading text-sm font-bold text-white">
                {target.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {target.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {target.role} &middot; {target.group} &middot;{" "}
                  {target.firmLabel}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Message
              </span>
            </div>

            {/* Subject */}
            <div className="border-b border-slate-200 bg-white px-5 py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Subject
                </span>
                <input
                  type="text"
                  readOnly
                  value={outreachSubject}
                  className="w-full border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  aria-label="Subject (demo, read-only)"
                />
              </div>
            </div>

            {/* Body */}
            <div className="relative min-h-[220px] bg-white px-5 py-4">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">
                {renderHighlighted(typed)}
                {!done && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-[#0EA5E9]"
                    aria-hidden
                  />
                )}
              </p>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-[#F7F9FC] px-5 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Ready in 2.1s &middot; 64 words
              </p>
              <AnimatePresence mode="wait" initial={false}>
                {!sent ? (
                  <motion.button
                    key="send"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{
                      opacity: done ? 1 : 0,
                      scale: done ? 1 : 0.96,
                    }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={() => done && setSent(true)}
                    disabled={!done}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#0EA5E9]/30 transition-all hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </motion.button>
                ) : (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Sent. Jane typically responds in 2 days.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Citations side panel */}
        <div className="flex flex-col gap-4 bg-gradient-to-b from-white to-slate-50 p-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0EA5E9]">
              Provenance
            </p>
            <h4 className="mt-1 font-heading text-base font-bold text-slate-900">
              Every line maps to a signal.
            </h4>
            <p className="mt-1 text-xs text-slate-600">
              No templates. No slop. Each citation links back to the signals
              detected in Step 02.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.signal}
                className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9]/10 font-mono text-[10px] font-bold text-[#0EA5E9]">
                  {h.signal}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900">
                    &ldquo;{h.phrase}&rdquo;
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {h.label}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
