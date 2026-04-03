"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Reminder {
  contact_id: number;
  name: string;
  company_name: string;
  stage: string;
  days_since_activity: number;
  message: string;
  urgency: string;
}

interface Coverage {
  covered: { company: string; contacts: number }[];
  uncovered: string[];
  total_target: number;
  total_covered: number;
}

interface Overview {
  stats: { companies: number; contacts: number; scored: number };
  pipeline_total: number;
  pipeline_by_stage: Record<string, number>;
  reminders_count: number;
  ratings: { total: number; high_value: number };
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/overview").then((r) => r.json()).then(setOverview).catch(() => {});
    fetch("/api/dashboard/reminders").then((r) => r.json()).then((d) => setReminders(d.reminders || [])).catch(() => {});
    fetch("/api/dashboard/coverage").then((r) => r.json()).then(setCoverage).catch(() => {});
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-white">Overview</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your networking intelligence hub
        </p>
      </div>

      {/* KPI Stat Cards — Image 3 style */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link
          href="/dashboard/contacts"
          className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-accent-teal/30 hover:bg-bg-hover hover:glow-teal"
        >
          <p className="text-[12px] text-text-muted">Warm Signals</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {overview?.ratings.high_value || 0}
          </p>
          <p className="mt-1 text-[11px] text-accent-green">curated contacts</p>
        </Link>

        <Link
          href="/dashboard/pipeline"
          className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-accent-teal/30 hover:bg-bg-hover hover:glow-teal"
        >
          <p className="text-[12px] text-text-muted">In Pipeline</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {overview?.pipeline_total || 0}
          </p>
          <p className="mt-1 text-[11px] text-accent-teal">active outreach</p>
        </Link>

        <Link
          href="/dashboard/discover"
          className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-accent-teal/30 hover:bg-bg-hover hover:glow-teal"
        >
          <p className="text-[12px] text-text-muted">Discovered</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {overview?.stats.contacts || 0}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">total contacts</p>
        </Link>

        <div className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:glow-amber">
          <p className="text-[12px] text-text-muted">Action Needed</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">
            {overview?.reminders_count || 0}
          </p>
          <p className="mt-1 text-[11px] text-accent-red">follow-ups due</p>
        </div>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-6 border border-white/[0.06] bg-bg-card p-5">
          <h3 className="mb-3 text-[13px] font-semibold text-white">
            Action Needed
          </h3>
          <div className="space-y-2">
            {reminders.slice(0, 5).map((r) => (
              <Link
                key={r.contact_id}
                href="/dashboard/pipeline"
                className="flex items-center justify-between bg-white/[0.03] px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
              >
                <div>
                  <span className="font-medium text-white">{r.name}</span>
                  <span className="text-text-secondary"> @ {r.company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-accent-amber">{r.message}</span>
                  <Badge
                    variant="outline"
                    className="rounded-full text-[10px] bg-accent-amber/10 text-accent-amber border-accent-amber/20"
                  >
                    {r.days_since_activity}d ago
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Firm Coverage */}
      {coverage && coverage.total_target > 0 && (
        <div className="mb-6 border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-white">
              Firm Coverage
            </h3>
            <span className="font-heading text-sm font-bold tabular-nums text-accent-teal">
              {coverage.total_covered}/{coverage.total_target}
            </span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-accent-teal transition-all"
              style={{ width: `${(coverage.total_covered / coverage.total_target) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {coverage.covered.map((c) => (
              <Badge key={c.company} className="rounded-full bg-accent-green/10 text-accent-green border-0 text-[11px]">
                {c.company} ({c.contacts})
              </Badge>
            ))}
            {coverage.uncovered.map((co) => (
              <Badge key={co} variant="outline" className="rounded-full text-[11px] text-text-muted border-white/[0.08]">
                {co}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/dashboard/discover", label: "Discover", desc: "Find and rate new connections", colorClass: "text-accent-blue" },
          { href: "/dashboard/import", label: "Import", desc: "Add LinkedIn profiles in bulk", colorClass: "text-accent-green" },
          { href: "/dashboard/settings", label: "Settings", desc: "Target universities, industries", colorClass: "text-text-muted" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-white/[0.06] bg-bg-card p-5 transition-all hover:border-white/[0.12] hover:bg-bg-hover"
          >
            <p className={`text-[13px] font-semibold ${item.colorClass}`}>
              {item.label}
            </p>
            <p className="mt-1 text-[12px] text-text-muted">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
