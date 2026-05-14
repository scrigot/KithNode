"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import {
  Upload,
  Compass,
  Settings,
  ArrowUpRight,
  Zap,
  Users,
  AlertTriangle,
  Star,
  Activity,
  Clock,
  GitBranch,
  PieChart as PieIcon,
  Building2,
  TrendingUp,
  Filter,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";
import {
  SANDBOX_OVERVIEW,
  SANDBOX_TIER_COUNTS,
  SANDBOX_PIPELINE_BY_STAGE,
  SANDBOX_ACTIVITY,
  SANDBOX_TOP_FIRMS,
  SANDBOX_TIMESERIES,
  SANDBOX_TIMESERIES_TOTAL,
  SANDBOX_TIMESERIES_DELTA,
  SANDBOX_TIMESERIES_DELTA_PCT,
  SANDBOX_CONTACTS,
  SANDBOX_PIPELINE,
  type Tier,
} from "./_data";

const STAGE_ORDER = [
  "researched",
  "connected",
  "email_sent",
  "follow_up",
  "responded",
  "meeting_set",
] as const;

const STAGE_LABEL: Record<string, string> = {
  researched: "RESEARCHED",
  connected: "CONNECTED",
  email_sent: "EMAIL SENT",
  follow_up: "FOLLOW UP",
  responded: "RESPONDED",
  meeting_set: "MEETING SET",
};

const STAGE_FILL: Record<string, string> = {
  researched: "#a1a1aa",
  connected: "#60a5fa",
  email_sent: "#38bdf8",
  follow_up: "#fbbf24",
  responded: "#4ade80",
  meeting_set: "#a78bfa",
};

const TIER_COLOR: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIER_FILL: Record<string, string> = {
  hot: "#f87171",
  warm: "#60a5fa",
  monitor: "#fbbf24",
  cold: "#a1a1aa",
};

const TIERS: Tier[] = ["hot", "warm", "monitor", "cold"];

const QUICK_NAV = [
  { href: "/demo/sandbox/discover", label: "Discover", icon: Compass },
  {
    href: "/waitlist?from=demo&section=pipeline",
    label: "Pipeline",
    icon: Activity,
  },
  {
    href: "/waitlist?from=demo&section=contacts",
    label: "Contacts",
    icon: Users,
  },
  {
    href: "/waitlist?from=demo&section=import",
    label: "Import",
    icon: Upload,
  },
  {
    href: "/waitlist?from=demo&section=settings",
    label: "Settings",
    icon: Settings,
  },
];

function timeAgo(iso: string): string {
  const diff = new Date("2026-05-14T20:00:00Z").getTime() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload?: { name?: string } }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const name = label ?? item.payload?.name ?? item.name;
  return (
    <div className="border border-white/[0.18] bg-bg-primary px-2 py-1 font-mono text-[10px] tabular-nums text-foreground shadow-lg">
      <span className="uppercase tracking-wider text-muted-foreground/80">
        {name}
      </span>{" "}
      <span className="font-bold text-foreground">{item.value}</span>
    </div>
  );
}

function SandboxGrowthChart() {
  const isUp = SANDBOX_TIMESERIES_DELTA >= 0;
  return (
    <div className="flex flex-col border border-white/[0.06] bg-card">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            WARM SIGNALS GROWTH
          </p>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tabular-nums text-accent-teal">
              {SANDBOX_TIMESERIES_TOTAL}
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                isUp ? "text-accent-green" : "text-accent-red"
              }`}
            >
              <TrendingUp size={12} />
              {isUp ? "+" : ""}
              {SANDBOX_TIMESERIES_DELTA} ({isUp ? "+" : ""}
              {SANDBOX_TIMESERIES_DELTA_PCT.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {["7D", "30D", "90D", "ALL"].map((label, i) => (
            <span
              key={label}
              className={`px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                i === 1
                  ? "border border-primary/40 bg-primary/20 text-primary"
                  : "border border-transparent text-text-muted"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="h-[180px] px-1 py-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={SANDBOX_TIMESERIES}
            margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="sandboxGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{
                fill: "#64748B",
                fontSize: 9,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{
                fill: "#64748B",
                fontSize: 9,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
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
              fill="url(#sandboxGrowthFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SandboxQuickActionRail() {
  const [selectedTiers, setSelectedTiers] = useState<Set<Tier>>(
    new Set<Tier>(["hot", "warm"]),
  );
  const [localTarget, setLocalTarget] = useState(SANDBOX_OVERVIEW.weekly_goal_target);
  const total = useMemo(
    () => Object.values(SANDBOX_TIER_COUNTS).reduce((a, b) => a + b, 0),
    [],
  );

  // Next best action = top unrated by score
  const nextBest = useMemo(
    () =>
      [...SANDBOX_CONTACTS]
        .filter((c) => c.tier === "hot" || c.tier === "warm")
        .sort((a, b) => b.warmthScore - a.warmthScore)[0],
    [],
  );

  const done = SANDBOX_OVERVIEW.weekly_goal_done;

  function toggleTier(t: Tier) {
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function updateTarget(delta: number) {
    setLocalTarget((prev) => Math.max(1, Math.min(20, prev + delta)));
  }

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-1 border-l border-white/[0.06] bg-bg-secondary p-2 xl:flex">
      {/* Next Best Action */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Zap size={12} />
            Next Best Action
          </span>
        </div>
        <div className="p-3">
          <p className="text-[13px] font-bold text-foreground">{nextBest.name}</p>
          <p className="text-[11px] text-muted-foreground">{nextBest.firmName}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
              Score
            </span>
            <span
              className={`font-mono text-[14px] font-bold tabular-nums ${TIER_COLOR[nextBest.tier]}`}
            >
              {Math.round(nextBest.warmthScore)}
            </span>
          </div>
          <Link
            href="/waitlist?from=demo&section=outreach"
            className="mt-3 flex w-full items-center justify-center gap-1.5 border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
          >
            Draft Outreach
          </Link>
        </div>
      </div>

      {/* Tier Filter */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Filter size={12} />
            Tier Filter
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-2">
          {TIERS.map((t) => {
            const count = SANDBOX_TIER_COUNTS[t];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const active = selectedTiers.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTier(t)}
                className={`flex flex-col gap-0.5 border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/[0.06] bg-background hover:border-white/[0.18]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5"
                    style={{ background: TIER_FILL[t] }}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${TIER_COLOR[t]}`}
                  >
                    {t}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">
                    {count}
                  </span>
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <Link
          href="/waitlist?from=demo&section=contacts"
          className="block w-full border-t border-white/[0.06] bg-background py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:bg-white/[0.04] hover:text-foreground"
        >
          Apply Filter →
        </Link>
      </div>

      {/* Weekly Goal */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Weekly Coffee Chats
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {done}
              <span className="text-sm text-muted-foreground">/{localTarget}</span>
            </span>
            <span
              className={`text-[10px] ${done >= localTarget ? "text-accent-green" : "text-accent-amber"}`}
            >
              {done >= localTarget ? "goal hit" : `${localTarget - done} to go`}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden bg-white/[0.06]">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, localTarget > 0 ? (done / localTarget) * 100 : 0)}%`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
              Target / week
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateTarget(-1)}
                aria-label="Decrease target"
                className="border border-white/[0.06] bg-background p-1 hover:bg-white/[0.04]"
              >
                <Minus size={10} />
              </button>
              <span className="w-6 text-center font-mono text-[11px] font-bold tabular-nums text-foreground">
                {localTarget}
              </span>
              <button
                onClick={() => updateTarget(1)}
                aria-label="Increase target"
                className="border border-white/[0.06] bg-background p-1 hover:bg-white/[0.04]"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/demo/sandbox/discover"
        className="mt-1 flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
      >
        <Zap size={12} />
        Discover Contacts
      </Link>
    </aside>
  );
}

export default function SandboxOverviewPage() {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const target = SANDBOX_OVERVIEW.avg_warmth;
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(interval);
      } else {
        setDisplayScore(current);
      }
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const pipelineFunnelData = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        name: STAGE_LABEL[stage],
        stage,
        value: SANDBOX_PIPELINE_BY_STAGE[stage] || 0,
      })),
    [],
  );

  const tierData = useMemo(
    () => [
      { name: "HOT", key: "hot", value: SANDBOX_TIER_COUNTS.hot },
      { name: "WARM", key: "warm", value: SANDBOX_TIER_COUNTS.warm },
      { name: "MONITOR", key: "monitor", value: SANDBOX_TIER_COUNTS.monitor },
      { name: "COLD", key: "cold", value: SANDBOX_TIER_COUNTS.cold },
    ],
    [],
  );
  const tierTotal = tierData.reduce((s, d) => s + d.value, 0);

  const totalContacts = SANDBOX_OVERVIEW.stats.contacts;
  const warmSignals = SANDBOX_OVERVIEW.ratings.high_value;
  const pipelineTotal = SANDBOX_OVERVIEW.pipeline_total;
  const remindersCount = SANDBOX_OVERVIEW.reminders_count;
  const responseRate = SANDBOX_OVERVIEW.response_rate;
  const weeklyDone = SANDBOX_OVERVIEW.weekly_goal_done;
  const weeklyTarget = SANDBOX_OVERVIEW.weekly_goal_target;

  const KPI: Array<{
    label: string;
    value: number | string;
    sub: string;
    subColor: string;
    href?: string;
    suffix?: string;
  }> = [
    {
      label: "WARM SIGNALS",
      value: warmSignals,
      sub: "hot + warm tier",
      subColor: "text-accent-green",
      href: "/waitlist?from=demo&section=contacts",
    },
    {
      label: "IN PIPELINE",
      value: pipelineTotal,
      sub: "active outreach",
      subColor: "text-accent-teal",
      href: "/waitlist?from=demo&section=pipeline",
    },
    {
      label: "DISCOVERED",
      value: totalContacts,
      sub: "total contacts",
      subColor: "text-text-muted",
      href: "/demo/sandbox/discover",
    },
    {
      label: "OVERDUE",
      value: remindersCount,
      sub: "follow-ups due",
      subColor: remindersCount > 0 ? "text-accent-amber" : "text-text-muted",
      href: "/waitlist?from=demo&section=pipeline",
    },
    {
      label: "RESPONSE RATE",
      value: responseRate,
      suffix: "%",
      sub: "replied / contacted",
      subColor: responseRate >= 20 ? "text-accent-green" : "text-text-muted",
    },
    {
      label: "THIS WEEK",
      value: `${weeklyDone}/${weeklyTarget}`,
      sub: "coffee chats",
      subColor:
        weeklyDone >= weeklyTarget ? "text-accent-green" : "text-accent-amber",
    },
  ];

  const topOverdue = SANDBOX_PIPELINE.filter((p) => p.daysSinceTouch >= 3).slice(
    0,
    3,
  );
  const topUnrated = [...SANDBOX_CONTACTS]
    .sort((a, b) => b.warmthScore - a.warmthScore)
    .slice(0, 4);

  const maxFirmCount = Math.max(1, ...SANDBOX_TOP_FIRMS.map((f) => f.count));

  return (
    <div className="flex min-h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                OVERVIEW
              </h2>
              <span className="flex items-center gap-1 border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                LIVE DEMO
              </span>
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Networking intelligence at a glance · seeded sample data
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/waitlist?from=demo"
              className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20"
            >
              <Sparkles className="h-3 w-3" />
              Sign up to unlock
            </Link>
          </div>
        </div>

        {/* Row 0: Hero growth chart */}
        <SandboxGrowthChart />

        {/* Row 1: KPI strip */}
        <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
          {KPI.map((kpi) => {
            const inner = (
              <>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  {kpi.label}
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold leading-tight tabular-nums text-foreground">
                  {kpi.value}
                  {kpi.suffix && (
                    <span className="text-xs text-muted-foreground">
                      {kpi.suffix}
                    </span>
                  )}
                </p>
                <p className={`text-[10px] leading-tight ${kpi.subColor}`}>
                  {kpi.sub}
                </p>
              </>
            );
            return kpi.href ? (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="border border-white/[0.06] bg-card px-2.5 py-1.5 hover:border-white/[0.18]"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={kpi.label}
                className="border border-white/[0.06] bg-card px-2.5 py-1.5"
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* Row 2: Hero strip */}
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          <div className="border border-white/[0.06] bg-card px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Network Warmth
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {displayScore}
              </span>
              <span className="text-[10px] text-muted-foreground">
                avg · {totalContacts} contacts
              </span>
            </div>
          </div>

          <div className="border border-white/[0.06] bg-card px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Recruiting Timeline
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {SANDBOX_OVERVIEW.days_until_recruiting}
              </span>
              <span className="text-[10px] text-muted-foreground">days to go</span>
            </div>
          </div>

          <div className="border border-white/[0.06] bg-card px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Weekly Coffee Chats
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {weeklyDone}
                <span className="text-sm text-muted-foreground">/{weeklyTarget}</span>
              </span>
              <span
                className={`text-[10px] ${
                  weeklyDone >= weeklyTarget
                    ? "text-accent-green"
                    : "text-accent-amber"
                }`}
              >
                {weeklyDone >= weeklyTarget
                  ? "goal hit"
                  : `${weeklyTarget - weeklyDone} to go`}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden bg-white/[0.06]">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, weeklyTarget > 0 ? (weeklyDone / weeklyTarget) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Charts */}
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          {/* Pipeline funnel */}
          <div className="flex flex-col border border-white/[0.06] bg-card">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <GitBranch className="h-3 w-3" />
                Pipeline Funnel
              </span>
              <Link
                href="/waitlist?from=demo&section=pipeline"
                className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {pipelineTotal} total · open
              </Link>
            </div>
            <div className="h-[170px] px-1 py-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={pipelineFunnelData}
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  barCategoryGap={4}
                >
                  <XAxis type="number" hide domain={[0, "dataMax"]} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={92}
                    tick={{
                      fill: "#a1a1aa",
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={<ChartTooltip />}
                  />
                  <Bar dataKey="value" barSize={14} isAnimationActive={false}>
                    {pipelineFunnelData.map((d) => (
                      <Cell key={d.stage} fill={STAGE_FILL[d.stage]} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      style={{
                        fill: "#e5e5e5",
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier distribution */}
          <div className="flex flex-col border border-white/[0.06] bg-card">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <PieIcon className="h-3 w-3" />
                Tier Distribution
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {tierTotal} contacts
              </span>
            </div>
            <div className="grid h-[170px] grid-cols-5 items-center gap-2 px-3 py-1">
              <div className="col-span-2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierData.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={1}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {tierData
                        .filter((d) => d.value > 0)
                        .map((d) => (
                          <Cell key={d.key} fill={TIER_FILL[d.key]} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-3 flex flex-col gap-1">
                {tierData.map((d) => {
                  const pct =
                    tierTotal > 0 ? Math.round((d.value / tierTotal) * 100) : 0;
                  return (
                    <div
                      key={d.key}
                      className="flex items-center gap-2 border border-white/[0.06] bg-background px-2 py-1"
                    >
                      <span
                        className="h-2 w-2"
                        style={{ background: TIER_FILL[d.key] }}
                      />
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${TIER_COLOR[d.key]}`}
                      >
                        {d.name}
                      </span>
                      <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-foreground">
                        {d.value}
                      </span>
                      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Activity timeline + Today's Focus */}
        <div className="grid flex-1 grid-cols-1 gap-1 lg:grid-cols-12">
          {/* Activity timeline */}
          <div className="flex flex-col border border-white/[0.06] bg-card lg:col-span-8">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Activity className="h-3 w-3" />
                Activity Timeline
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Last {SANDBOX_ACTIVITY.length}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <ol className="relative space-y-1">
                <span
                  aria-hidden
                  className="absolute bottom-1 left-[7px] top-1 w-px bg-white/[0.06]"
                />
                {SANDBOX_ACTIVITY.map((a, i) => {
                  const dotColor =
                    a.type === "rate"
                      ? "bg-accent-teal"
                      : a.type === "pipeline_add"
                        ? "bg-accent-green"
                        : "bg-accent-amber";
                  return (
                    <li key={`${a.contactId}-${i}`} className="relative pl-5">
                      <span
                        className={`absolute left-[3px] top-2 h-2 w-2 ${dotColor} ring-2 ring-card`}
                        aria-hidden
                      />
                      <Link
                        href="/demo/sandbox/discover"
                        className="flex items-center gap-2 border border-white/[0.06] bg-background px-2 py-1 text-[11px] hover:border-white/[0.18]"
                      >
                        <span className="truncate font-bold text-foreground">
                          {a.contactName}
                        </span>
                        <span className="truncate text-muted-foreground">
                          {a.firmName}
                        </span>
                        <span className="ml-auto truncate text-[10px] text-muted-foreground/80">
                          {a.detail}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                          {timeAgo(a.timestamp)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Today's Focus */}
          <div className="flex flex-col border border-white/[0.06] bg-card lg:col-span-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <AlertTriangle className="h-3 w-3" />
                Today&apos;s Focus
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Overdue + unrated
              </span>
            </div>

            <div className="flex flex-col gap-2 p-2">
              <div>
                <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Overdue · {topOverdue.length}
                </p>
                <div className="space-y-0.5">
                  {topOverdue.map((o) => (
                    <Link
                      key={o.contactId}
                      href="/waitlist?from=demo&section=pipeline"
                      className="flex items-center gap-1.5 border border-white/[0.06] bg-background px-1.5 py-1 text-[10px] hover:border-amber-500/30"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                      <span className="truncate font-bold text-foreground">
                        {o.contactName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {o.firmName}
                      </span>
                      <span className="ml-auto font-mono text-[9px] tabular-nums text-amber-400">
                        {o.daysSinceTouch}d
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-primary/80">
                  Top unrated
                </p>
                <div className="space-y-0.5">
                  {topUnrated.map((u) => (
                    <Link
                      key={u.id}
                      href="/demo/sandbox/discover"
                      className="flex items-center gap-1.5 border border-white/[0.06] bg-background px-1.5 py-1 text-[10px] hover:border-primary/30"
                    >
                      <Star className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate font-bold text-foreground">
                        {u.name}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {u.firmName}
                      </span>
                      <span
                        className={`ml-auto font-mono text-[10px] font-bold tabular-nums ${TIER_COLOR[u.tier]}`}
                      >
                        {Math.round(u.warmthScore)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Top firms */}
        <div className="border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Building2 className="h-3 w-3" />
              Top Firms by Contact Count
            </span>
            <Link
              href="/waitlist?from=demo&section=contacts"
              className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-4 lg:grid-cols-8">
            {SANDBOX_TOP_FIRMS.map((f) => {
              const widthPct = Math.max(
                6,
                Math.round((f.count / maxFirmCount) * 100),
              );
              return (
                <Link
                  key={f.firmName}
                  href="/waitlist?from=demo&section=contacts"
                  className="flex flex-col gap-0.5 border border-white/[0.06] bg-background px-2 py-1.5 hover:border-white/[0.18]"
                >
                  <p
                    className="truncate text-[10px] font-bold uppercase tracking-wider text-foreground"
                    title={f.firmName}
                  >
                    {f.firmName}
                  </p>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono text-base font-bold tabular-nums text-foreground">
                      {f.count}
                    </span>
                    {f.hotCount > 0 && (
                      <span className="flex items-center gap-0.5 font-mono text-[9px] font-bold tabular-nums text-red-400">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {f.hotCount} hot
                      </span>
                    )}
                  </div>
                  <div className="h-1 w-full bg-white/[0.04]">
                    <div
                      className="h-full bg-accent-teal/70"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Row 7: Quick nav */}
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
          {QUICK_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between gap-2 border border-white/[0.06] bg-card px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-white/[0.18] hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {label}
              </span>
              <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
      <SandboxQuickActionRail />
    </div>
  );
}
