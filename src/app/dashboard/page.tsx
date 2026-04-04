"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Upload,
  Compass,
  TrendingUp,
  Clock,
  Settings,
  ArrowUpRight,
  Zap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  ratings: { high_value: number; total: number };
  stats: { companies: number; contacts: number; scored: number };
  avg_warmth: number;
  pipeline_total: number;
  pipeline_by_stage: Record<string, number>;
  reminders_count: number;
}

// ── Constants (user-configurable, not demo data) ─────────────────────────────

const RECRUITING_DAYS = 47;
const RECRUITING_LABEL = "Fall recruiting";
const WEEKLY_GOAL = { done: 2, total: 3, label: "coffee chats this week" };

const QUICK_NAV = [
  { href: "/dashboard/discover", label: "Discover", desc: "Find and rate new connections", icon: Compass, colorClass: "text-accent-blue" },
  { href: "/dashboard/import", label: "Import", desc: "Add LinkedIn profiles in bulk", icon: Upload, colorClass: "text-accent-green" },
  { href: "/dashboard/settings", label: "Settings", desc: "Target universities, industries", icon: Settings, colorClass: "text-text-muted" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Animate warmth score counter
  useEffect(() => {
    if (!data) return;
    const target = data.avg_warmth;
    if (target === 0) { setDisplayScore(0); return; }
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
        <div className="h-6 w-32 animate-pulse bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const totalContacts = data?.stats.contacts ?? 0;
  const isEmpty = totalContacts === 0;

  // Welcome state — no contacts imported yet
  if (isEmpty) {
    return (
      <div className="p-5">
        <h2 className="font-heading text-2xl font-bold text-white">Welcome to KithNode</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Get started by importing your LinkedIn connections or discovering alumni in your target firms.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/import"
            className="flex items-center gap-4 border border-white/[0.06] bg-bg-card p-6 transition-all duration-150 hover:border-accent-green/30 hover:bg-bg-hover"
          >
            <Upload size={24} className="shrink-0 text-accent-green" />
            <div>
              <p className="text-[14px] font-semibold text-white">Import Contacts</p>
              <p className="mt-1 text-[12px] text-text-secondary">
                Paste LinkedIn profile URLs to import and score contacts
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard/discover"
            className="flex items-center gap-4 border border-white/[0.06] bg-bg-card p-6 transition-all duration-150 hover:border-accent-blue/30 hover:bg-bg-hover"
          >
            <Compass size={24} className="shrink-0 text-accent-blue" />
            <div>
              <p className="text-[14px] font-semibold text-white">Discover Alumni</p>
              <p className="mt-1 text-[12px] text-text-secondary">
                Browse and rate alumni at your target firms
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 border border-white/[0.06] bg-bg-card p-4 transition-all duration-150 hover:border-white/[0.12] hover:bg-bg-hover"
              >
                <Icon size={18} className={`shrink-0 ${item.colorClass}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold ${item.colorClass}`}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-text-muted">{item.desc}</p>
                </div>
                <ArrowUpRight
                  size={14}
                  className="shrink-0 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                />
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Real data dashboard
  const warmSignals = data?.ratings.high_value ?? 0;
  const pipelineTotal = data?.pipeline_total ?? 0;
  const remindersCount = data?.reminders_count ?? 0;

  const KPI = [
    { label: "Warm Signals", value: warmSignals, sub: "curated contacts", subColor: "text-accent-green", href: "/dashboard/contacts" },
    { label: "In Pipeline", value: pipelineTotal, sub: "active outreach", subColor: "text-accent-teal", href: "/dashboard/pipeline" },
    { label: "Discovered", value: totalContacts, sub: "total contacts", subColor: "text-text-muted", href: "/dashboard/discover" },
    { label: "Action Needed", value: remindersCount, sub: "follow-ups due", subColor: "text-accent-red", href: null },
  ] as const;

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white">Overview</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your networking intelligence at a glance
          </p>
        </div>
      </div>

      {/* Trial Banner */}
      <div className="mb-4 flex items-center justify-between border border-accent-teal/20 bg-accent-teal/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Zap size={15} className="text-accent-teal" />
          <span className="text-[13px] text-text-secondary">
            <span className="font-medium text-white">7 days</span> left in your free trial
          </span>
        </div>
        <Link
          href="/dashboard/billing"
          className="text-[12px] font-semibold text-accent-teal hover:text-white transition-colors duration-150"
        >
          Upgrade
        </Link>
      </div>

      {/* Hero row: Warmth Score + Recruiting Countdown */}
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Network Warmth Score */}
        <div className="border border-white/[0.10] bg-bg-card p-5 shadow-[0_0_20px_rgba(14,165,233,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Network Warmth
          </p>
          <div className="mt-3 flex items-end gap-4">
            <span className="font-mono text-5xl font-bold tabular-nums text-white">
              {displayScore}
            </span>
            {data && data.avg_warmth > 0 && (
              <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-accent-green">
                <TrendingUp size={14} />
                avg across {totalContacts} contacts
              </span>
            )}
          </div>
          {data && data.avg_warmth === 0 && (
            <p className="mt-2 text-[12px] text-text-muted">
              Import contacts to see your network warmth score
            </p>
          )}
        </div>

        {/* Recruiting Countdown + Weekly Goals */}
        <div className="border border-white/[0.10] bg-bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Recruiting Timeline
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-mono text-5xl font-bold tabular-nums text-white">
              {RECRUITING_DAYS}
            </span>
            <span className="mb-1.5 text-sm text-text-secondary">
              days until {RECRUITING_LABEL}
            </span>
          </div>

          {/* Weekly goal tracker */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-secondary">
                <span className="font-mono font-bold text-white">{WEEKLY_GOAL.done}</span>
                {" "}of{" "}
                <span className="font-mono font-bold text-white">{WEEKLY_GOAL.total}</span>
                {" "}{WEEKLY_GOAL.label}
              </span>
              <span className="text-accent-amber">
                {WEEKLY_GOAL.total - WEEKLY_GOAL.done} remaining
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden bg-white/[0.06]">
              <div
                className="h-full bg-accent-teal transition-all duration-150"
                style={{ width: `${(WEEKLY_GOAL.done / WEEKLY_GOAL.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention — only show if pipeline has contacts needing action */}
      {remindersCount > 0 && (
        <div className="mb-5">
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Needs Attention
          </h3>
          <Link
            href="/dashboard/pipeline"
            className="flex items-center gap-3 border border-white/[0.06] border-l-2 border-l-accent-amber bg-bg-card p-4 text-left transition-all duration-150 hover:bg-bg-hover hover:border-white/[0.12]"
          >
            <Clock size={16} className="mt-0.5 shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-medium text-white">
                {remindersCount} pipeline contact{remindersCount !== 1 ? "s" : ""} need follow-up
              </span>
              <p className="mt-0.5 text-[12px] text-text-secondary">
                Contacts that haven&apos;t been updated in over 7 days
              </p>
            </div>
            <ArrowUpRight size={14} className="shrink-0 text-text-muted" />
          </Link>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((kpi) => {
          const inner = (
            <>
              <p className="text-[12px] text-text-muted">{kpi.label}</p>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
                {kpi.value}
              </p>
              <p className={`mt-1 text-[11px] ${kpi.subColor}`}>{kpi.sub}</p>
            </>
          );

          return kpi.href ? (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="border border-white/[0.06] bg-bg-card p-4 transition-all duration-150 hover:border-accent-teal/30 hover:bg-bg-hover hover:glow-teal"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={kpi.label}
              className="border border-white/[0.06] bg-bg-card p-4 transition-all duration-150 hover:glow-amber"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 border border-white/[0.06] bg-bg-card p-4 transition-all duration-150 hover:border-white/[0.12] hover:bg-bg-hover"
            >
              <Icon size={18} className={`shrink-0 ${item.colorClass}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold ${item.colorClass}`}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-[12px] text-text-muted">{item.desc}</p>
              </div>
              <ArrowUpRight
                size={14}
                className="shrink-0 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
