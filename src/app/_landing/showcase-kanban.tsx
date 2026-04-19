"use client";

import { motion, useReducedMotion } from "framer-motion";

type Contact = {
  name: string;
  firm: string;
  score: number;
  icon?: "check" | "calendar";
  breathe?: boolean;
};

type Column = {
  stage: string;
  color: string;
  dot: string;
  scoreBar: string;
  contacts: Contact[];
};

const COLUMNS: Column[] = [
  {
    stage: "Discovered",
    color: "bg-slate-50 border-slate-200/70",
    dot: "bg-slate-400",
    scoreBar: "bg-slate-400",
    contacts: [
      { name: "Drew Castro", firm: "Lazard", score: 62 },
      { name: "Cam Lee", firm: "Houlihan", score: 55 },
      { name: "Parker West", firm: "PJT", score: 48 },
    ],
  },
  {
    stage: "Contacted",
    color: "bg-blue-50/70 border-blue-200/60",
    dot: "bg-blue-400",
    scoreBar: "bg-blue-500",
    contacts: [
      { name: "Riley Chen", firm: "Goldman", score: 71, breathe: true },
      { name: "Miles Park", firm: "Evercore", score: 65 },
    ],
  },
  {
    stage: "Responded",
    color: "bg-emerald-50/70 border-emerald-200/60",
    dot: "bg-emerald-400",
    scoreBar: "bg-emerald-500",
    contacts: [
      { name: "Nisha Rao", firm: "Centerview", score: 78, icon: "check", breathe: true },
    ],
  },
  {
    stage: "Meeting Set",
    color: "bg-[#ECFEFF] border-[#A5F3FC]",
    dot: "bg-[#0EA5E9]",
    scoreBar: "bg-[#0EA5E9]",
    contacts: [
      { name: "Ben Kaminski", firm: "KKR", score: 82, icon: "calendar" },
    ],
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <circle cx="8" cy="8" r="7" fill="#10B981" />
      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" fill="#0EA5E9" />
      <path d="M1.5 6h13" stroke="white" strokeWidth="1" />
      <rect x="4" y="1.5" width="1.2" height="3" rx="0.4" fill="#0EA5E9" />
      <rect x="10.8" y="1.5" width="1.2" height="3" rx="0.4" fill="#0EA5E9" />
      <circle cx="8" cy="10" r="1.3" fill="white" />
    </svg>
  );
}

export function ShowcaseKanban() {
  const reduce = useReducedMotion();

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
      {/* SVG flow curve: Riley Chen (Contacted, col 2) -> Nisha Rao (Responded, col 3) */}
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <motion.path
          d="M 48 28 C 52 28, 52 48, 56 48"
          stroke="#0EA5E9"
          strokeWidth="0.25"
          strokeDasharray="1 1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.55 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
        />
      </svg>

      <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
        {COLUMNS.map((col, colIdx) => (
          <div key={col.stage}>
            <div className="mb-3 flex items-center gap-2">
              <motion.div
                className={`h-2 w-2 rounded-full ${col.dot}`}
                animate={
                  reduce
                    ? undefined
                    : { opacity: [0.7, 1, 0.7] }
                }
                transition={
                  reduce
                    ? undefined
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: colIdx * 0.2 }
                }
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.stage}
              </span>
              <span className="ml-auto text-xs text-slate-400 tabular-nums">
                {col.contacts.length}
              </span>
            </div>

            <div className="space-y-2">
              {col.contacts.map((c, cardIdx) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                    delay: colIdx * 0.08 + cardIdx * 0.05,
                  }}
                  className={`relative rounded-lg border ${col.color} p-3`}
                >
                  <motion.div
                    animate={
                      reduce || !c.breathe
                        ? undefined
                        : { scale: [1, 1.01, 1] }
                    }
                    transition={
                      reduce || !c.breathe
                        ? undefined
                        : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.firm}</p>
                      </div>
                      {c.icon === "check" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{
                            duration: 0.5,
                            ease: [0.22, 1.4, 0.36, 1],
                            delay: 0.7,
                          }}
                        >
                          <CheckIcon />
                        </motion.div>
                      )}
                      {c.icon === "calendar" && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{
                            duration: 0.5,
                            ease: [0.22, 1.4, 0.36, 1],
                            delay: 0.8,
                          }}
                        >
                          <CalendarIcon />
                        </motion.div>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          className={`h-1 rounded-full ${col.scoreBar}`}
                          initial={{ width: "0%" }}
                          whileInView={{ width: `${c.score}%` }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{
                            duration: 0.9,
                            ease: "easeOut",
                            delay: colIdx * 0.08 + cardIdx * 0.05 + 0.2,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono tabular-nums text-slate-500">
                        {c.score}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
