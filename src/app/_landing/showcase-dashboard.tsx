"use client";

import { motion, useReducedMotion } from "framer-motion";

type Tier = "HOT" | "WARM" | "MONITOR";

type Row = {
  tier: Tier;
  name: string;
  title: string;
  firm: string;
  score: number;
  warmPath?: string;
};

const TIER_STYLES: Record<Tier, { text: string; bg: string; border: string }> = {
  HOT: {
    text: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
  },
  WARM: {
    text: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  MONITOR: {
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
};

const METRICS = [
  { label: "CONTACTS", value: "604" },
  { label: "RESPONSE RATE", value: "23%" },
  { label: "MEETINGS", value: "4" },
  { label: "WARM PATHS", value: "127" },
];

const ROWS: Row[] = [
  {
    tier: "HOT",
    name: "Riley Chen",
    title: "Associate",
    firm: "Goldman Sachs",
    score: 84,
    warmPath: "Via Jake Bennett (Greek Life) → Associate at Goldman",
  },
  {
    tier: "WARM",
    name: "Miles Park",
    title: "VP",
    firm: "Evercore",
    score: 72,
  },
  {
    tier: "WARM",
    name: "Nisha Rao",
    title: "MD",
    firm: "Centerview",
    score: 78,
    warmPath: "Via Emma Diaz → Centerview",
  },
  {
    tier: "MONITOR",
    name: "Drew Castro",
    title: "Analyst",
    firm: "Lazard",
    score: 62,
  },
];

export function ShowcaseDashboard() {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden border border-white/[0.06] bg-[#0A1628] shadow-2xl shadow-slate-900/40">
      {/* AutoGuard pill */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 px-2.5 py-1">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]"
          animate={reduce ? undefined : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
          transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#0EA5E9]">
          AutoGuard Active
        </span>
      </div>

      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <div className="h-2 w-2 rounded-full bg-red-500/70" />
        <div className="h-2 w-2 rounded-full bg-amber-500/70" />
        <div className="h-2 w-2 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          kithnode / dashboard / contacts
        </span>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 border-b border-white/[0.06] sm:grid-cols-4">
        {METRICS.map((m, idx) => (
          <div
            key={m.label}
            className={`px-5 py-3 ${idx < METRICS.length - 1 ? "sm:border-r border-white/[0.06]" : ""} ${idx < 2 ? "border-b sm:border-b-0" : ""} ${idx % 2 === 0 ? "border-r" : ""}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {m.label}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#0EA5E9]">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Tier
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Name
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Title
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Firm
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Score
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Warm Path
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, idx) => {
              const tier = TIER_STYLES[r.tier];
              return (
                <motion.tr
                  key={r.name}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.06 }}
                  className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block border ${tier.border} ${tier.bg} px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tier.text}`}
                    >
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[13px] font-medium text-white">
                    {r.name}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-white/60">{r.title}</td>
                  <td className="px-3 py-3 text-[12px] text-white/80">{r.firm}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[12px] font-semibold tabular-nums text-[#0EA5E9]">
                      {r.score}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {r.warmPath ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                          Warm Path
                        </span>
                        <span className="font-mono text-[11px] text-[#0EA5E9]">
                          {r.warmPath}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-white/25">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
