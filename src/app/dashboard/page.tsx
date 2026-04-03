"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Compass,
  TrendingUp,
  Clock,
  AlertTriangle,
  Sparkles,
  Users,
  Settings,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

// ── Demo data ──────────────────────────────────────────────────────────────────

const WARMTH_SCORE = 78;
const WARMTH_DELTA = 8;
const WARMTH_TREND = [42, 48, 51, 55, 60, 63, 70, 78]; // 8 weeks

const RECRUITING_DAYS = 47;
const RECRUITING_LABEL = "Fall recruiting";
const WEEKLY_GOAL = { done: 2, total: 3, label: "coffee chats this week" };

const ALERTS: {
  name: string;
  company: string;
  action: string;
  time: string;
  border: string;
  icon: typeof AlertTriangle;
}[] = [
  {
    name: "Sarah Chen",
    company: "Goldman Sachs",
    action: "Going cold",
    time: "14 days since contact",
    border: "border-l-accent-red",
    icon: AlertTriangle,
  },
  {
    name: "Michael Park",
    company: "Evercore",
    action: "Follow-up due",
    time: "Sent 5 days ago",
    border: "border-l-accent-amber",
    icon: Clock,
  },
  {
    name: "James Liu",
    company: "JPMorgan",
    action: "Promoted to VP",
    time: "New signal",
    border: "border-l-accent-teal",
    icon: Sparkles,
  },
  {
    name: "Emily Zhao",
    company: "Centerview Partners",
    action: "Joined firm",
    time: "New alumni",
    border: "border-l-accent-blue",
    icon: Users,
  },
];

const KPI = [
  { label: "Warm Signals", value: 12, sub: "curated contacts", subColor: "text-accent-green", href: "/dashboard/contacts" },
  { label: "In Pipeline", value: 8, sub: "active outreach", subColor: "text-accent-teal", href: "/dashboard/pipeline" },
  { label: "Discovered", value: 47, sub: "total contacts", subColor: "text-text-muted", href: "/dashboard/discover" },
  { label: "Action Needed", value: 3, sub: "follow-ups due", subColor: "text-accent-red", href: null },
] as const;

const QUICK_NAV = [
  { href: "/dashboard/discover", label: "Discover", desc: "Find and rate new connections", icon: Compass, colorClass: "text-accent-blue" },
  { href: "/dashboard/import", label: "Import", desc: "Add LinkedIn profiles in bulk", icon: Upload, colorClass: "text-accent-green" },
  { href: "/dashboard/settings", label: "Settings", desc: "Target universities, industries", icon: Settings, colorClass: "text-text-muted" },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const trendMax = Math.max(...WARMTH_TREND);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-white">Overview</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your networking intelligence hub
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Demo data
        </span>
      </div>

      {/* ── Hero row: Warmth Score + Recruiting Countdown ─────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Network Warmth Score */}
        <div className="border border-white/[0.06] bg-bg-card p-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Network Warmth
          </p>
          <div className="mt-3 flex items-end gap-4">
            <span className="font-mono text-5xl font-bold tabular-nums text-white">
              {WARMTH_SCORE}
            </span>
            <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-accent-green">
              <TrendingUp size={14} />
              +{WARMTH_DELTA} this week
            </span>
          </div>

          {/* Sparkline bar */}
          <div className="mt-4 flex items-end gap-[3px]" style={{ height: 32 }}>
            {WARMTH_TREND.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-accent-teal/30 transition-all"
                style={{
                  height: `${(v / trendMax) * 100}%`,
                  backgroundColor:
                    i === WARMTH_TREND.length - 1
                      ? "var(--color-accent-teal)"
                      : undefined,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-text-muted">8-week trend</p>
        </div>

        {/* Recruiting Countdown + Weekly Goals */}
        <div className="border border-white/[0.06] bg-bg-card p-6">
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
                className="h-full bg-accent-teal transition-all"
                style={{ width: `${(WEEKLY_GOAL.done / WEEKLY_GOAL.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Needs Attention Alerts ────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Needs Attention
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ALERTS.map((alert) => {
            const Icon = alert.icon;
            return (
              <button
                key={alert.name}
                className={`flex items-start gap-3 border border-white/[0.06] border-l-2 ${alert.border} bg-bg-card p-4 text-left transition-all hover:bg-bg-hover hover:border-white/[0.12]`}
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">{alert.name}</span>
                    <span className="text-[12px] text-text-secondary">@ {alert.company}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[12px] text-text-secondary">{alert.action}</span>
                    <span className="text-[11px] text-text-muted">{alert.time}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="mt-0.5 shrink-0 text-text-muted" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI.map((kpi) => {
          const inner = (
            <>
              <p className="text-[12px] text-text-muted">{kpi.label}</p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
                {kpi.value}
              </p>
              <p className={`mt-1 text-[11px] ${kpi.subColor}`}>{kpi.sub}</p>
            </>
          );

          return kpi.href ? (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-accent-teal/30 hover:bg-bg-hover hover:glow-teal"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={kpi.label}
              className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:glow-amber"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-white/[0.12] hover:bg-bg-hover"
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
                className="shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
