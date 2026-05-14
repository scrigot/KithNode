"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type Range = "7d" | "30d" | "90d" | "all";

const RANGE_LABELS: Array<{ key: Range; label: string }> = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "ALL" },
];

interface TimeseriesData {
  data: Array<{ date: string; count: number }>;
  total: number;
  delta: number;
  deltaPct: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-white/[0.18] bg-bg-primary px-2 py-1 font-mono text-[10px] tabular-nums text-foreground shadow-lg">
      <span className="uppercase tracking-wider text-muted-foreground/80">
        {label}
      </span>{" "}
      <span className="font-bold text-foreground">{payload[0].value}</span>
    </div>
  );
}

export function NetworkGrowthChart() {
  const [range, setRange] = useState<Range>("30d");
  const [series, setSeries] = useState<TimeseriesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/dashboard/timeseries?metric=warm_signals&range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TimeseriesData | null) => {
        if (cancelled) return;
        setSeries(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const delta = series?.delta ?? 0;
  const deltaPct = series?.deltaPct ?? 0;
  const isUp = delta >= 0;

  return (
    <div className="flex flex-col border border-white/[0.06] bg-card">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            WARM SIGNALS GROWTH
          </p>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tabular-nums text-accent-teal">
              {series?.total ?? 0}
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                isUp ? "text-accent-green" : "text-accent-red"
              }`}
            >
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? "+" : ""}
              {delta} ({isUp ? "+" : ""}
              {deltaPct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {RANGE_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                range === key
                  ? "border border-primary/40 bg-primary/20 text-primary"
                  : "border border-transparent text-text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[180px] px-1 py-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            Loading...
          </div>
        ) : !series || series.data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            No data yet. Rate contacts in Discover.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series.data}
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{
                  fill: "#64748B",
                  fontSize: 9,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, monospace",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fill: "#64748B",
                  fontSize: 9,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0EA5E9"
                strokeWidth={1.5}
                fill="url(#growthFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
