"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";

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
}
interface TopUnrated {
  contactId: string;
  contactName: string;
  firmName: string;
  score: number;
  tier: string;
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

const STAGE_LABEL: Record<string, string> = {
  researched: "RESEARCHED",
  connected: "CONNECTED",
  email_sent: "EMAIL SENT",
  follow_up: "FOLLOW UP",
  responded: "RESPONDED",
  meeting_set: "MEETING SET",
};

const TIER_COLOR: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
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

  if (loading) {
    return (
      <div className="p-5">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-muted" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="h-64 animate-pulse bg-muted" />
          <div className="h-64 animate-pulse bg-muted" />
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

  return (
    <div className="flex min-h-full flex-col p-5">
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

      {/* Hero strip: warmth + recruiting + weekly */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Network Warmth
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {displayScore}
            </span>
            <span className="text-[10px] text-muted-foreground">
              avg · {totalContacts} contacts
            </span>
          </div>
        </div>

        <div className="border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Recruiting Timeline
          </p>
          {data?.days_until_recruiting != null ? (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
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

        <div className="border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Weekly Coffee Chats
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {weeklyDone}
              <span className="text-base text-muted-foreground">/{weeklyTarget}</span>
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
          <div className="mt-2 h-1 w-full overflow-hidden bg-white/[0.06]">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, weeklyTarget > 0 ? (weeklyDone / weeklyTarget) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
        {KPI.map((kpi) => {
          const inner = (
            <>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {kpi.label}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {kpi.value}
                {kpi.suffix && (
                  <span className="text-sm text-muted-foreground">
                    {kpi.suffix}
                  </span>
                )}
              </p>
              <p className={`mt-0.5 text-[10px] ${kpi.subColor}`}>{kpi.sub}</p>
            </>
          );
          return kpi.href ? (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="border border-white/[0.06] bg-card px-3 py-2 hover:border-white/[0.18]"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={kpi.label}
              className="border border-white/[0.06] bg-card px-3 py-2"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Two-column: Today's Focus + Recent Activity */}
      <div className="mt-3 grid flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
        {/* Today's Focus */}
        <div className="flex flex-col border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <AlertTriangle className="h-3 w-3" />
              Today&apos;s Focus
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Overdue + top unrated
            </span>
          </div>

          <div className="flex flex-col gap-3 p-3">
            {/* Overdue */}
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                Overdue follow-ups · {data?.top_overdue?.length ?? 0}
              </p>
              {(data?.top_overdue ?? []).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Nothing overdue. Nice.
                </p>
              ) : (
                <div className="space-y-1">
                  {data!.top_overdue.map((o) => (
                    <Link
                      key={o.contactId}
                      href="/dashboard/pipeline"
                      className="flex items-center gap-2 border border-white/[0.06] bg-background px-2 py-1.5 text-[11px] hover:border-amber-500/30"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                      <span className="truncate font-bold text-foreground">
                        {o.contactName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {o.firmName}
                      </span>
                      <span className="ml-auto font-mono text-[10px] tabular-nums text-amber-400">
                        {o.days}d · {STAGE_LABEL[o.stage] || o.stage}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Unrated */}
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-primary/80">
                Top unrated · rate these next
              </p>
              {(data?.top_unrated ?? []).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  All rated. Discover more.
                </p>
              ) : (
                <div className="space-y-1">
                  {data!.top_unrated.map((u) => (
                    <Link
                      key={u.contactId}
                      href="/dashboard/discover"
                      className="flex items-center gap-2 border border-white/[0.06] bg-background px-2 py-1.5 text-[11px] hover:border-primary/30"
                    >
                      <Star className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate font-bold text-foreground">
                        {u.contactName}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {u.firmName}
                      </span>
                      <span
                        className={`ml-auto font-mono text-[11px] font-bold tabular-nums ${TIER_COLOR[u.tier.toLowerCase()] || "text-zinc-400"}`}
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

        {/* Recent Activity */}
        <div className="flex flex-col border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Activity className="h-3 w-3" />
              Recent Activity
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Last 8
            </span>
          </div>
          <div className="flex-1 p-3">
            {(data?.recent_activity ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No activity yet. Rate some contacts in Discover.
              </p>
            ) : (
              <div className="space-y-1">
                {data!.recent_activity.map((a, i) => (
                  <div
                    key={`${a.contactId}-${i}`}
                    className="flex items-center gap-2 border border-white/[0.06] bg-background px-2 py-1.5 text-[11px]"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        a.type === "rate"
                          ? "bg-primary"
                          : a.type === "pipeline_add"
                            ? "bg-accent-green"
                            : "bg-amber-400"
                      }`}
                    />
                    <span className="truncate font-bold text-foreground">
                      {a.contactName}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {a.firmName}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground/80">
                      {a.detail}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                      {timeAgo(a.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick nav strip */}
      <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-5">
        {QUICK_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between gap-2 border border-white/[0.06] bg-card px-3 py-2 text-[11px] text-muted-foreground hover:border-white/[0.18] hover:text-foreground"
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
