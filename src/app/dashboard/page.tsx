"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Upload, Compass, Zap, Users } from "lucide-react";
import type { RankedContact } from "@/lib/api";
import { OutreachSheet } from "./contacts/outreach-sheet";
import {
  buildFeed,
  FeedDivider,
  FeedRow,
  type FeedItem,
  type OverdueLite,
  type UnratedLite,
} from "./_components/home-feed";
import { HomeContextRail } from "./_components/home-context-rail";

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
  top_overdue: OverdueLite[];
  top_unrated: UnratedLite[];
  tier_counts: TierCounts;
  recruiting_date: string | null;
  days_until_recruiting: number | null;
  weekly_goal_done: number;
  weekly_goal_target: number;
  subscription_status: string;
  trial_days_left: number | null;
}

function todayLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [contacts, setContacts] = useState<RankedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [outreachTarget, setOutreachTarget] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ovRes, ctRes] = await Promise.all([
        apiFetch("/api/dashboard/overview"),
        apiFetch("/api/contacts"),
      ]);
      if (!ovRes.ok) {
        setFetchError(`Overview unavailable (HTTP ${ovRes.status}). Retry?`);
        setLoading(false);
        return;
      }
      setData(await ovRes.json());
      setContacts(ctRes.ok ? await ctRes.json() : []);
      setFetchError(null);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Network error loading dashboard.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const feed = useMemo<FeedItem[]>(() => {
    if (!data) return [];
    return buildFeed(
      data.top_overdue ?? [],
      contacts,
      data.top_unrated ?? [],
    ).filter((f) => !skipped.has(f.id));
  }, [data, contacts, skipped]);

  // Default-select the first row whenever the feed changes and nothing valid is selected.
  useEffect(() => {
    if (feed.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !feed.some((f) => f.id === selectedId)) {
      setSelectedId(feed[0].id);
    }
  }, [feed, selectedId]);

  const selected = useMemo(
    () => feed.find((f) => f.id === selectedId) ?? null,
    [feed, selectedId],
  );

  const openDraft = useCallback((item: FeedItem) => {
    setSelectedId(item.id);
    setOutreachTarget({ id: item.id, name: item.name, email: item.email });
  }, []);

  const grouped = useMemo(() => {
    return {
      overdue: feed.filter((f) => f.bucket === "overdue"),
      today: feed.filter((f) => f.bucket === "today"),
      upcoming: feed.filter((f) => f.bucket === "upcoming"),
    };
  }, [feed]);

  // ─── LOADING ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-10 items-center gap-3 border-b border-white/[0.06] bg-card px-4">
          <div className="h-3 w-24 animate-pulse bg-muted" />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-40 shrink-0 flex-col gap-2 border-r border-white/[0.06] p-3 md:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted" />
            ))}
          </div>
          <div className="flex-1 space-y-px p-px">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-muted" />
            ))}
          </div>
          <div className="hidden w-[300px] shrink-0 animate-pulse border-l border-white/[0.06] bg-muted xl:block" />
        </div>
      </div>
    );
  }

  // ─── ERROR ────────────────────────────────────────────────────────────
  if (fetchError && !data) {
    return (
      <div className="p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          OVERVIEW
        </h2>
        <div className="mt-3 h-px bg-border" />
        <div className="mt-6 border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-300">
            Dashboard failed to load
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">{fetchError}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchAll();
            }}
            className="mt-4 border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalContacts = data?.stats.contacts ?? 0;
  const isEmpty = totalContacts === 0;

  // ─── EMPTY / COLD-START (guiding, not blank) ──────────────────────────
  if (isEmpty) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <TopBar data={data} overdueCount={0} warmSignals={0} />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-2xl border border-white/[0.06] bg-card">
            <div className="border-b border-white/[0.06] px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                Get started
              </p>
              <p className="mt-1 text-base font-bold text-foreground">
                Build your warm-path network
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                KithNode ranks who to reach and why. Bring in contacts to light
                up your daily feed.
              </p>
            </div>
            <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <Link
                href="/dashboard/import"
                className="group flex flex-col gap-2 px-5 py-5 hover:bg-white/[0.02]"
              >
                <Upload className="h-5 w-5 text-foreground" />
                <p className="text-[13px] font-bold text-foreground">
                  Import contacts
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Upload your LinkedIn connections to map existing warm paths.
                </p>
                <span className="mt-1 inline-flex w-fit border border-white/[0.12] bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground group-hover:bg-white/[0.08]">
                  Import
                </span>
              </Link>
              <Link
                href="/dashboard/discover"
                className="group flex flex-col gap-2 px-5 py-5 hover:bg-white/[0.02]"
              >
                <Compass className="h-5 w-5 text-primary" />
                <p className="text-[13px] font-bold text-foreground">
                  Discover alumni
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Find high-warmth alumni at your target firms, ranked for you.
                </p>
                <span className="mt-1 inline-flex w-fit bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white group-hover:opacity-85">
                  Discover
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const warmSignals = data?.ratings.high_value ?? 0;
  const overdueCount = data?.reminders_count ?? 0;
  const pipelineTotal = data?.pipeline_total ?? 0;
  const responseRate = data?.response_rate ?? 0;
  const weeklyDone = data?.weekly_goal_done ?? 0;
  const weeklyTarget = data?.weekly_goal_target ?? 3;
  const tc = data?.tier_counts ?? { hot: 0, warm: 0, monitor: 0, cold: 0 };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OutreachSheet
        contactId={outreachTarget?.id ?? null}
        contactName={outreachTarget?.name ?? ""}
        contactEmail={outreachTarget?.email}
        open={outreachTarget !== null}
        onClose={() => setOutreachTarget(null)}
      />

      <TopBar data={data} overdueCount={overdueCount} warmSignals={warmSignals} />

      <div className="flex min-h-0 flex-1">
        {/* ─── SLIM KPI STRIP ─────────────────────────────────────────── */}
        <div className="hidden w-40 min-w-40 shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] md:flex">
          {data?.days_until_recruiting != null && (
            <KpiSection title="Recruiting">
              <div className="border border-primary/15 bg-primary/[0.04] px-2 py-2">
                <p className="text-[22px] font-bold leading-none tabular-nums text-primary">
                  {data.days_until_recruiting}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                  Days to deadline
                </p>
              </div>
            </KpiSection>
          )}

          <KpiSection title="Network">
            <KpiItem label="Warm Signals" value={warmSignals} accent />
            <KpiItem label="In Pipeline" value={pipelineTotal} />
            <KpiItem
              label="Response Rate"
              value={`${responseRate}%`}
              tone={responseRate >= 20 ? "accent" : undefined}
            />
            <KpiItem
              label="This Week"
              value={`${weeklyDone}/${weeklyTarget}`}
              tone={weeklyDone >= weeklyTarget ? "accent" : "mon"}
            />
            <KpiItem
              label="Overdue"
              value={overdueCount}
              tone={overdueCount > 0 ? "hot" : undefined}
            />
          </KpiSection>

          <KpiSection title="Tiers">
            <div className="grid grid-cols-2 gap-1">
              <TierCell label="HOT" value={tc.hot} cls="border-red-500/30 bg-red-500/10 text-red-400" />
              <TierCell label="WARM" value={tc.warm} cls="border-blue-500/30 bg-blue-500/10 text-blue-400" />
              <TierCell label="MON" value={tc.monitor} cls="border-amber-500/30 bg-amber-500/10 text-amber-400" />
              <TierCell label="COLD" value={tc.cold} cls="border-zinc-500/30 bg-zinc-500/10 text-zinc-400" />
            </div>
          </KpiSection>
        </div>

        {/* ─── CENTER FEED: WHO TO REACH NOW ──────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-white/[0.06]">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-card px-3.5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
              Reach Now
            </span>
            <span className="border border-white/[0.12] bg-white/[0.04] px-1.5 py-px font-mono text-[9px] font-bold text-muted-foreground">
              {feed.length}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground/60">
              Sorted by <span className="text-primary">warmth</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {feed.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-[13px] font-bold text-foreground">
                  Nothing to reach right now
                </p>
                <p className="max-w-xs text-[11px] text-muted-foreground">
                  No overdue follow-ups and no high-warmth contacts queued.
                  Discover more alumni to refill your feed.
                </p>
                <Link
                  href="/dashboard/discover"
                  className="inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white hover:opacity-85"
                >
                  <Compass className="h-3 w-3" />
                  Discover Alumni
                </Link>
              </div>
            ) : (
              <>
                {grouped.overdue.length > 0 && (
                  <>
                    <FeedDivider label="Overdue" color="text-red-400" />
                    {grouped.overdue.map((item) => (
                      <FeedRow
                        key={item.id}
                        item={item}
                        selected={item.id === selectedId}
                        onSelect={() => setSelectedId(item.id)}
                        onDraft={() => openDraft(item)}
                        onSkip={() =>
                          setSkipped((s) => new Set(s).add(item.id))
                        }
                      />
                    ))}
                  </>
                )}
                {grouped.today.length > 0 && (
                  <>
                    <FeedDivider label="Today" color="text-amber-400" />
                    {grouped.today.map((item) => (
                      <FeedRow
                        key={item.id}
                        item={item}
                        selected={item.id === selectedId}
                        onSelect={() => setSelectedId(item.id)}
                        onDraft={() => openDraft(item)}
                        onSkip={() =>
                          setSkipped((s) => new Set(s).add(item.id))
                        }
                      />
                    ))}
                  </>
                )}
                {grouped.upcoming.length > 0 && (
                  <>
                    <FeedDivider label="Upcoming" />
                    {grouped.upcoming.map((item) => (
                      <FeedRow
                        key={item.id}
                        item={item}
                        selected={item.id === selectedId}
                        onSelect={() => setSelectedId(item.id)}
                        onDraft={() => openDraft(item)}
                        onSkip={() =>
                          setSkipped((s) => new Set(s).add(item.id))
                        }
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── RIGHT CONTEXT RAIL ─────────────────────────────────────── */}
        <HomeContextRail item={selected} onDraft={openDraft} />
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────
function TopBar({
  data,
  overdueCount,
  warmSignals,
}: {
  data: OverviewData | null;
  overdueCount: number;
  warmSignals: number;
}) {
  const responseRate = data?.response_rate ?? 0;
  const weeklyDone = data?.weekly_goal_done ?? 0;
  const weeklyTarget = data?.weekly_goal_target ?? 3;
  const status = data?.subscription_status;
  return (
    <div className="flex h-10 shrink-0 items-center border-b border-white/[0.06] bg-card px-4">
      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">
        Overview
      </span>
      <span className="mx-3 h-4 w-px bg-white/[0.1]" />
      <span className="font-mono text-[11px] text-muted-foreground">
        WHO TO REACH NOW
      </span>

      <div className="ml-auto flex items-center gap-3">
        <TopKpi value={warmSignals} label="Warm" />
        <span className="h-4 w-px bg-white/[0.1]" />
        <TopKpi value={`${responseRate}%`} label="Reply Rate" />
        <span className="h-4 w-px bg-white/[0.1]" />
        <TopKpi value={`${weeklyDone}/${weeklyTarget}`} label="This Week" />
        {overdueCount > 0 && (
          <>
            <span className="h-4 w-px bg-white/[0.1]" />
            <span className="border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-red-400">
              {overdueCount} Overdue
            </span>
          </>
        )}

        {/* Trial / upgrade badge */}
        {status === "active" ? (
          <span className="flex items-center gap-1 border border-accent-green/30 bg-accent-green/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-accent-green">
            <Zap className="h-3 w-3" />
            Active
          </span>
        ) : status === "trial" ? (
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 border border-accent-teal/30 bg-accent-teal/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-accent-teal hover:bg-accent-teal/20"
          >
            <Zap className="h-3 w-3" />
            {data?.trial_days_left != null
              ? `Trial · ${data.trial_days_left}d`
              : "Trial"}
          </Link>
        ) : status ? (
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1 border border-accent-amber/30 bg-accent-amber/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-accent-amber hover:bg-accent-amber/20"
          >
            <Zap className="h-3 w-3" />
            Upgrade
          </Link>
        ) : null}

        <span className="h-4 w-px bg-white/[0.1]" />
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {todayLabel()}
        </span>
      </div>
    </div>
  );
}

function TopKpi({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[13px] font-bold tabular-nums text-primary">
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.07em] text-muted-foreground/60">
        {label}
      </span>
    </span>
  );
}

// ─── KPI strip building blocks ──────────────────────────────────────────
function KpiSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.06] px-3 py-2.5">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function KpiItem({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tone?: "accent" | "hot" | "warm" | "mon";
}) {
  const toneCls =
    tone === "accent" || accent
      ? "text-primary"
      : tone === "hot"
        ? "text-red-400"
        : tone === "warm"
          ? "text-blue-400"
          : tone === "mon"
            ? "text-amber-400"
            : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="truncate text-[10px] text-muted-foreground">{label}</span>
      <span className={`shrink-0 text-[13px] font-bold tabular-nums ${toneCls}`}>
        {value}
      </span>
    </div>
  );
}

function TierCell({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className={`flex flex-col gap-px border px-1.5 py-1 ${cls}`}>
      <span className="text-[14px] font-bold leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
    </div>
  );
}
