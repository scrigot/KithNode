"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api-client";
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
  Lock,
  GitBranch,
  PieChart as PieIcon,
  Building2,
  TrendingUp,
} from "lucide-react";

// Recharts is heavy + client-only; lazy load to keep dashboard TTI snappy
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false },
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const PieChart = dynamic(
  () => import("recharts").then((m) => m.PieChart),
  { ssr: false },
);
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const LabelList = dynamic(
  () => import("recharts").then((m) => m.LabelList),
  { ssr: false },
);

interface RecentActivity {
  type: "rate" | "pipeline_add" | "pipeline_move";
  contactId: string;
  contactName: string;
  firmName: string;
  detail: string;
  timestamp: string;
}
interface OverdueContact {
  contactId: string;
  contactName: string;
  firmName: string;
  stage: string;
  days: number;
  isRedacted?: boolean;
}
interface TopUnrated {
  contactId: string;
  contactName: string;
  firmName: string;
  score: number;
  tier: string;
}
interface TopFirm {
  firmName: string;
  count: number;
  hotCount: number;
}
interface TierCounts {
  hot: number;
  warm: number;
  monitor: number;
  cold: number;
}

interface OverviewData {
  ratings: { high_value: number; total: number };
  stats: { companies: number; contacts: number; scored: number };
  avg_warmth: number;
  pipeline_total: number;
  pipeline_by_stage: Record<string, number>;
  response_rate: number;
  reminders_count: number;
  top_overdue: OverdueContact[];
  top_unrated: TopUnrated[];
  recent_activity: RecentActivity[];
  tier_counts: TierCounts;
  top_firms: TopFirm[];
  recruiting_date: string | null;
  days_until_recruiting: number | null;
  weekly_goal_done: number;
  weekly_goal_target: number;
  subscription_status: string;
  trial_days_left: number | null;
  referral_count: number;
}

const QUICK_NAV = [
  { href: "/dashboard/discover", label: "Discover", icon: Compass },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Activity },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

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

// Match /dashboard/pipeline header colors (zinc/blue/sky/amber/green/purple)
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
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

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiFetch("/api/dashboard/overview");
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!data) return;
    const target = data.avg_warmth;
    if (target === 0) {
      setDisplayScore(0);
      return;
    }
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
  }, [data]);

  const pipelineFunnelData = useMemo(() => {
    if (!data) return [];
    return STAGE_ORDER.map((stage) => ({
      name: STAGE_LABEL[stage],
      stage,
      value: data.pipeline_by_stage[stage] || 0,
    }));
  }, [data]);

  const tierData = useMemo(() => {
    if (!data) return [];
    const tc = data.tier_counts || { hot: 0, warm: 0, monitor: 0, cold: 0 };
    return [
      { name: "HOT", key: "hot", value: tc.hot },
      { name: "WARM", key: "warm", value: tc.warm },
      { name: "MONITOR", key: "monitor", value: tc.monitor },
      { name: "COLD", key: "cold", value: tc.cold },
    ];
  }, [data]);

  const tierTotal = useMemo(
    () => tierData.reduce((s, d) => s + d.value, 0),
    [tierData],
  );

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-3 grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-muted" />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="h-16 animate-pulse bg-muted" />
          <div className="h-16 animate-pulse bg-muted" />
          <div className="h-16 animate-pulse bg-muted" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="h-48 animate-pulse bg-muted" />
          <div className="h-48 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  const totalContacts = data?.stats.contacts ?? 0;
  const isEmpty = totalContacts === 0;

  if (isEmpty) {
    return (
      <div className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          OVERVIEW
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Networking intelligence at a glance
        </p>
        <div className="mt-3 h-px bg-border" />

        <div className="mt-6 border border-white/[0.06] bg-card p-8 text-center">
          <p className="text-lg font-bold text-foreground">Welcome to KithNode</p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Import your LinkedIn connections or discover alumni to start mapping
            your warm-path network.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/dashboard/import"
              className="flex items-center gap-2 border border-white/[0.12] bg-muted px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]"
            >
              <Upload className="h-3 w-3" />
              Import Contacts
            </Link>
            <Link
              href="/dashboard/discover"
              className="flex items-center gap-2 bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
            >
              <Compass className="h-3 w-3" />
              Discover Alumni
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {QUICK_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 border border-white/[0.06] bg-card px-3 py-2 text-[11px] text-muted-foreground hover:border-white/[0.18] hover:text-foreground"
            >
              <Icon className="h-3 w-3" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const warmSignals = data?.ratings.high_value ?? 0;
  const pipelineTotal = data?.pipeline_total ?? 0;
  const remindersCount = data?.reminders_count ?? 0;
  const responseRate = data?.response_rate ?? 0;
  const weeklyDone = data?.weekly_goal_done ?? 0;
  const weeklyTarget = data?.weekly_goal_target ?? 3;

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
      href: "/dashboard/contacts",
    },
    {
      label: "IN PIPELINE",
      value: pipelineTotal,
      sub: "active outreach",
      subColor: "text-accent-teal",
      href: "/dashboard/pipeline",
    },
    {
      label: "DISCOVERED",
      value: totalContacts,
      sub: "total contacts",
      subColor: "text-text-muted",
      href: "/dashboard/discover",
    },
    {
      label: "OVERDUE",
      value: remindersCount,
      sub: "follow-ups due",
      subColor: remindersCount > 0 ? "text-accent-amber" : "text-text-muted",
      href: "/dashboard/pipeline",
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
      subColor: weeklyDone >= weeklyTarget ? "text-accent-green" : "text-accent-amber",
    },
  ];

  const recentActivity = data?.recent_activity ?? [];
  const topFirms = data?.top_firms ?? [];
  const maxFirmCount = Math.max(1, ...topFirms.map((f) => f.count));

  return (
    <div className="flex min-h-full flex-col gap-2 p-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            OVERVIEW
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Networking intelligence at a glance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data?.subscription_status === "active" && (
            <span className="flex items-center gap-1.5 border border-accent-green/30 bg-accent-green/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-green">
              <Zap className="h-3 w-3" />
              Active
            </span>
          )}
          {data?.subscription_status === "trial" && (
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20"
            >
              <Zap className="h-3 w-3" />
              {data.trial_days_left != null
                ? `Trial · ${data.trial_days_left}d left · Upgrade`
                : "Trial · Upgrade"}
            </Link>
          )}
          {data?.subscription_status !== "active" &&
            data?.subscription_status !== "trial" && (
              <Link
                href="/dashboard/billing"
                className="flex items-center gap-1.5 border border-accent-amber/30 bg-accent-amber/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-amber hover:bg-accent-amber/20"
              >
                <Zap className="h-3 w-3" />
                Upgrade
              </Link>
            )}
          {(data?.referral_count ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 border border-accent-blue/30 bg-accent-blue/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-blue">
              <Users className="h-3 w-3" />
              {data?.referral_count} ref
            </span>
          )}
        </div>
      </div>

      {/* Row 1: KPI strip (6 cols) */}
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
              <p className={`text-[10px] leading-tight ${kpi.subColor}`}>{kpi.sub}</p>
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

      {/* Row 2: Hero strip (warmth + recruiting + weekly) */}
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
          {data?.days_until_recruiting != null ? (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {data.days_until_recruiting}
              </span>
              <span className="text-[10px] text-muted-foreground">
                days to go
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Set recruiting date in{" "}
              <Link
                href="/dashboard/settings"
                className="text-accent-teal hover:underline"
              >
                Settings
              </Link>
            </p>
          )}
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

      {/* Row 3: Charts (pipeline funnel + tier distribution) */}
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        {/* Pipeline funnel */}
        <div className="flex flex-col border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <GitBranch className="h-3 w-3" />
              Pipeline Funnel
            </span>
            <Link
              href="/dashboard/pipeline"
              className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {pipelineTotal} total &middot; open
            </Link>
          </div>
          <div className="h-[170px] px-1 py-1">
            {pipelineTotal === 0 ? (
              <div className="flex h-full items-center justify-center px-3 text-[11px] text-muted-foreground">
                Add contacts to your pipeline to see the funnel.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={pipelineFunnelData}
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  barCategoryGap={4}
                >
                  <XAxis
                    type="number"
                    hide
                    domain={[0, "dataMax"]}
                    allowDecimals={false}
                  />
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
                      fontFamily:
                        "ui-monospace, SFMono-Regular, monospace",
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
                        fontFamily:
                          "ui-monospace, SFMono-Regular, monospace",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
              {tierTotal === 0 ? (
                <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                  No tier data.
                </div>
              ) : (
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
              )}
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              {tierData.map((d) => {
                const pct = tierTotal > 0 ? Math.round((d.value / tierTotal) * 100) : 0;
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

      {/* Row 4: Activity timeline (8) | Today's Focus (4) */}
      <div className="grid flex-1 grid-cols-1 gap-1 lg:grid-cols-12">
        {/* Activity timeline */}
        <div className="flex flex-col border border-white/[0.06] bg-card lg:col-span-8">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Activity className="h-3 w-3" />
              Activity Timeline
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Last {recentActivity.length || 0}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {recentActivity.length === 0 ? (
              <p className="px-2 py-3 text-[11px] text-muted-foreground">
                No activity yet. Rate some contacts in Discover.
              </p>
            ) : (
              <ol className="relative space-y-1">
                {/* Vertical rail */}
                <span
                  aria-hidden
                  className="absolute left-[7px] top-1 bottom-1 w-px bg-white/[0.06]"
                />
                {recentActivity.map((a, i) => {
                  const dotColor =
                    a.type === "rate"
                      ? "bg-accent-teal"
                      : a.type === "pipeline_add"
                        ? "bg-accent-green"
                        : "bg-accent-amber";
                  const href =
                    a.type === "rate"
                      ? `/dashboard/contacts/${a.contactId}`
                      : "/dashboard/pipeline";
                  return (
                    <li key={`${a.contactId}-${i}`} className="relative pl-5">
                      <span
                        className={`absolute left-[3px] top-2 h-2 w-2 ${dotColor} ring-2 ring-card`}
                        aria-hidden
                      />
                      <Link
                        href={href}
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
            )}
          </div>
        </div>

        {/* Today's Focus right rail */}
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
            {/* Overdue */}
            <div>
              <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                Overdue · {data?.top_overdue?.length ?? 0}
              </p>
              {(data?.top_overdue ?? []).length === 0 ? (
                <p className="px-1 text-[10px] text-muted-foreground">
                  Nothing overdue. Nice.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {data!.top_overdue.map((o) => (
                    <Link
                      key={o.contactId}
                      href="/dashboard/pipeline"
                      className="flex items-center gap-1.5 border border-white/[0.06] bg-background px-1.5 py-1 text-[10px] hover:border-amber-500/30"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                      {o.isRedacted && (
                        <Lock
                          className="h-3 w-3 shrink-0 text-muted-foreground/70"
                          aria-label="Blurred contact"
                        />
                      )}
                      <span
                        className={`truncate font-bold ${
                          o.isRedacted ? "text-muted-foreground/80" : "text-foreground"
                        }`}
                      >
                        {o.contactName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {o.firmName}
                      </span>
                      <span className="ml-auto font-mono text-[9px] tabular-nums text-amber-400">
                        {o.days}d
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Unrated */}
            <div>
              <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-primary/80">
                Top unrated
              </p>
              {(data?.top_unrated ?? []).length === 0 ? (
                <p className="px-1 text-[10px] text-muted-foreground">
                  All rated. Discover more.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {data!.top_unrated.map((u) => (
                    <Link
                      key={u.contactId}
                      href="/dashboard/discover"
                      className="flex items-center gap-1.5 border border-white/[0.06] bg-background px-1.5 py-1 text-[10px] hover:border-primary/30"
                    >
                      <Star className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate font-bold text-foreground">
                        {u.contactName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {u.firmName}
                      </span>
                      <span
                        className={`ml-auto font-mono text-[10px] font-bold tabular-nums ${TIER_COLOR[u.tier.toLowerCase()] || "text-zinc-400"}`}
                      >
                        {Math.round(u.score)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
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
            href="/dashboard/contacts"
            className="text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-4 lg:grid-cols-8">
          {topFirms.length === 0 ? (
            <p className="col-span-full px-1 py-1 text-[10px] text-muted-foreground">
              No firms yet. Import or discover contacts to populate this.
            </p>
          ) : (
            topFirms.map((f) => {
              const widthPct = Math.max(
                6,
                Math.round((f.count / maxFirmCount) * 100),
              );
              return (
                <Link
                  key={f.firmName}
                  href={`/dashboard/contacts?firm=${encodeURIComponent(f.firmName)}`}
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
            })
          )}
        </div>
      </div>

      {/* Row 7: Quick nav strip */}
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
  );
}
