"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Activity,
  DollarSign,
  ListChecks,
  Inbox,
  Plus,
  Flame,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { OpsOverview } from "@/app/api/ops/overview/route";
import { healthColor, type Health } from "@/lib/ops/metrics";
import { addOpsTask, toggleOpsTask } from "../actions";
import { OpsTile, OpsEmpty } from "./ops-tile";
import { relativeTime } from "./state";
import { BetaCodesPanel } from "./beta-codes-panel";
import { FeedbackPanel } from "./feedback-panel";
import { PhasedTimeline } from "./phased-timeline";
import { OrgBand } from "./org-band";

const TRACK_LABELS: Record<string, string> = {
  IB: "IB",
  PE: "PE",
  CONSULTING: "CONS",
  ib: "IB",
  pe: "PE",
  consulting: "CONS",
};

function TrendIcon({ health }: { health: Health }) {
  if (health === "good") return <TrendingUp size={12} />;
  if (health === "bad") return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

function DeltaLine({
  health,
  children,
}: {
  health: Health;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${healthColor(health)}`}
    >
      <TrendIcon health={health} />
      {children}
    </span>
  );
}

export function OpsCockpit() {
  const [data, setData] = useState<OpsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const r = await apiFetch("/api/ops/overview");
      if (r.ok) setData(await r.json());
    } catch {
      // keep stale data on a transient failure
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/ops/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OpsOverview | null) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const launchDate = new Date("2026-04-16T00:00:00.000Z"); // design system / alpha date
  const daysSinceLaunch = Math.max(
    0,
    Math.floor((Date.now() - launchDate.getTime()) / 86_400_000),
  );
  const todayLabel = new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="min-h-full bg-bg-primary p-4">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
            OPS COCKPIT
          </h1>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Founder · Internal
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted">
          <span>{todayLabel}</span>
          <span className="h-3 w-px bg-white/[0.12]" />
          <span>
            <span className="font-bold text-accent-teal tabular-nums">{daysSinceLaunch}</span>{" "}
            DAYS SINCE LAUNCH
          </span>
        </div>
      </div>

      {loading ? (
        <>
          {/* North-star band skeleton + tile skeletons */}
          <div className="h-32 animate-pulse border border-white/[0.06] bg-bg-card" />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse border border-white/[0.06] bg-bg-card"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ─── North star: phased timeline (read first) ────────────────── */}
          <PhasedTimeline
            timeline={data?.timeline ?? null}
            nextTasks={data?.nextTasks ?? []}
            syncedAt={data?.syncedAt ?? null}
          />

          {/* ─── Row 1: pulse tiles (status) ─────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <VelocityTile data={data} />
            <ActiveUsersTile data={data} />
            <CostBurnTile data={data} />
          </div>

          {/* ─── Agent-org strip (where to focus) ────────────────────────── */}
          <div className="mt-4">
            <OrgBand lanes={data?.lanes ?? []} />
          </div>

          {/* ─── Row 2: funnel | revenue | tasks ─────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <FunnelTile data={data} />
            <RevenueTile data={data} />
            <TasksTile data={data} onChange={refetch} />
          </div>

          {/* ─── Row 3: recent signups feed (2/3) | total burn (1/3) ─────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentSignupsTile data={data} />
            </div>
            <TotalBurnTile data={data} />
          </div>

          {/* ─── Row 4: beta codes (full width) ──────────────────────────── */}
          <div className="mt-4">
            <BetaCodesPanel />
          </div>

          {/* ─── Row 5: tester feedback (full width) ─────────────────────── */}
          <div className="mt-4">
            <FeedbackPanel />
          </div>
        </>
      )}
    </div>
  );
}

// ─── (a) Signups velocity ─────────────────────────────────────────────────────
function VelocityTile({ data }: { data: OpsOverview | null }) {
  const v = data?.velocity;
  const empty = !v || (v.thisWeek === 0 && v.lastWeek === 0);
  const pctLabel =
    v?.wowPct == null
      ? "new"
      : `${v.wowPct >= 0 ? "+" : ""}${(v.wowPct * 100).toFixed(0)}% WoW`;

  return (
    <OpsTile
      label="Signups Velocity"
      subtitle="Waitlist · last 14 days"
      badge={v ? pctLabel : undefined}
      badgeHealth={v?.health ?? "neutral"}
    >
      {empty ? (
        <OpsEmpty
          icon={<TrendingUp size={20} />}
          heading="No signups in 14 days"
          description="Push the referral loop or a new acquisition channel this week."
        />
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
              {v.thisWeek}
            </span>
            <DeltaLine health={v.health}>
              {pctLabel} · vs {v.lastWeek} last wk
            </DeltaLine>
          </div>
          <div className="mt-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={v.series}
                margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="opsVelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={<SparkTooltip />}
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0EA5E9"
                  strokeWidth={1.5}
                  fill="url(#opsVelFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </OpsTile>
  );
}

function SparkTooltip({
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
    <div className="border border-white/[0.18] bg-bg-primary px-2 py-1 font-mono text-[10px] tabular-nums text-text-primary shadow-lg">
      <span className="uppercase tracking-wider text-text-muted">{label}</span>{" "}
      <span className="font-bold">{payload[0].value}</span>
    </div>
  );
}

// ─── (d) Active users ─────────────────────────────────────────────────────────
function ActiveUsersTile({ data }: { data: OpsOverview | null }) {
  const a = data?.activeUsers;
  const empty = !a || (a.active7d === 0 && a.priorActive7d === 0);
  return (
    <OpsTile
      label="Active Users"
      subtitle="Distinct · 7 days"
      badge={a ? "7D" : undefined}
      badgeHealth={a?.health ?? "neutral"}
    >
      {empty ? (
        <OpsEmpty
          icon={<Activity size={20} />}
          heading="No activity yet"
          description="Engagement lights up once users swipe in Discover or take actions."
        />
      ) : (
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
            {a.active7d}
          </span>
          <DeltaLine health={a.health}>
            vs {a.priorActive7d} prior 7d
          </DeltaLine>
        </div>
      )}
    </OpsTile>
  );
}

// ─── Money formatter ──────────────────────────────────────────────────────────
function usd(n: number, dp = 2): string {
  return `$${n.toFixed(dp)}`;
}

// ─── (g) Cost-burn — variable API spend (Anthropic / Hunter / Apollo) ─────────
function CostBurnTile({ data }: { data: OpsOverview | null }) {
  const c = data?.cost;
  const empty = !c || c.last7d === 0;
  return (
    <OpsTile
      label="Cost Burn"
      subtitle="API spend · last 7 days"
      badge={c ? `${usd(c.today)} today` : undefined}
      badgeHealth={c?.todayHealth ?? "neutral"}
    >
      {empty ? (
        <OpsEmpty
          icon={<DollarSign size={20} />}
          heading="No spend logged yet"
          description="Variable API cost appears here once a draft or enrichment runs."
        />
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
              {usd(c.today)}
            </span>
            <DeltaLine health={c.todayHealth}>
              today · vs {usd(c.avgPerDay)}/day 7d-avg
            </DeltaLine>
          </div>
          {c.costPerDraft != null && (
            <p className="mt-1 font-mono text-[10px] text-text-muted">
              {usd(c.costPerDraft, 4)} avg per draft
            </p>
          )}
          <div className="mt-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={c.series}
                margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="opsCostFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={<CostTooltip />}
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#0EA5E9"
                  strokeWidth={1.5}
                  fill="url(#opsCostFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.byProvider.map((p) => (
              <span
                key={p.provider}
                className="border border-white/[0.12] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-text-muted"
              >
                {p.provider} {usd(p.cost, 4)} · {p.calls}
              </span>
            ))}
          </div>
        </>
      )}
    </OpsTile>
  );
}

function CostTooltip({
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
    <div className="border border-white/[0.18] bg-bg-primary px-2 py-1 font-mono text-[10px] tabular-nums text-text-primary shadow-lg">
      <span className="uppercase tracking-wider text-text-muted">{label}</span>{" "}
      <span className="font-bold">{usd(payload[0].value, 4)}</span>
    </div>
  );
}

// ─── (g) Total burn — fixed subscriptions + 30d variable vs monthly budget ────
function TotalBurnTile({ data }: { data: OpsOverview | null }) {
  const b = data?.totalBurn;
  return (
    <OpsTile
      label="Total Burn"
      subtitle="Fixed + variable · monthly"
      badge={b ? `vs ${usd(b.monthlyBudget, 0)}/mo` : undefined}
      badgeHealth={b?.health ?? "neutral"}
    >
      {!b ? (
        <OpsEmpty icon={<Flame size={20} />} heading="No burn data" />
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
              {usd(b.totalMonthly)}
            </span>
            <DeltaLine health={b.health}>
              /mo · budget {usd(b.monthlyBudget, 0)}
            </DeltaLine>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-baseline justify-between border border-white/[0.06] px-2 py-1">
              <span className="uppercase tracking-wider text-text-muted">Fixed</span>
              <span className="font-mono font-bold tabular-nums text-text-secondary">
                {usd(b.fixedMonthly)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border border-white/[0.06] px-2 py-1">
              <span className="uppercase tracking-wider text-text-muted">Variable 30d</span>
              <span className="font-mono font-bold tabular-nums text-text-secondary">
                {usd(b.variable30d, 4)}
              </span>
            </div>
          </div>
          {b.fixedMonthly === 0 && (
            <p className="mt-2 text-[10px] text-text-muted">
              Fixed subs are $0 placeholders — set real monthly figures to track runway.
            </p>
          )}
        </>
      )}
    </OpsTile>
  );
}

// ─── (c) Activation funnel ────────────────────────────────────────────────────
function FunnelBar({
  label,
  count,
  total,
  pct,
  health,
}: {
  label: string;
  count: number;
  total: number;
  pct: number | null;
  health: Health;
}) {
  const width = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="uppercase tracking-wider text-text-secondary">{label}</span>
        <span className="font-mono tabular-nums text-text-primary">
          {count}
          {pct != null && (
            <span className={`ml-1.5 ${healthColor(health)}`}>{pct}%</span>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 w-full bg-white/[0.04]">
        <div
          className="h-full bg-accent-teal/70"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function FunnelTile({ data }: { data: OpsOverview | null }) {
  const f = data?.funnel;
  const empty = !f || f.users === 0;
  const singleUser = !!f && f.users === 1;
  return (
    <OpsTile
      label="Activation Funnel"
      subtitle="Signup → swipe → connect"
      badge={singleUser ? "single user" : undefined}
      badgeHealth="neutral"
    >
      {empty ? (
        <OpsEmpty
          icon={<Users size={20} />}
          heading="No users yet"
          description="The funnel populates as signups convert into Discover + connections."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <FunnelBar
            label="Signed up"
            count={f.users}
            total={f.users}
            pct={null}
            health="neutral"
          />
          <FunnelBar
            label="First swipe"
            count={f.activated}
            total={f.users}
            pct={f.signupToSwipePct}
            health={f.signupToSwipeHealth}
          />
          <FunnelBar
            label="First connection"
            count={f.connected}
            total={f.users}
            pct={f.swipeToConnectPct}
            health={f.swipeToConnectHealth}
          />
        </div>
      )}
    </OpsTile>
  );
}

// ─── (h) Revenue stub (live post-launch) ──────────────────────────────────────
function RevenueTile({ data }: { data: OpsOverview | null }) {
  const r = data?.revenue;
  const noPaid = !r || (r.active === 0 && r.pastDue === 0 && r.canceled === 0);
  return (
    <OpsTile
      label="Revenue"
      subtitle="Subscriptions · MRR"
      badge="stub · $0"
      badgeHealth={r?.health ?? "neutral"}
    >
      {!r ? (
        <OpsEmpty
          icon={<DollarSign size={20} />}
          heading="No subscription data"
        />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
              ${r.mrr}
            </span>
            <span className={`font-mono text-[11px] ${healthColor(r.health)}`}>
              MRR {noPaid ? "(pre-launch)" : ""}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            <StatCell label="Active" value={r.active} health={r.active > 0 ? "good" : "neutral"} />
            <StatCell label="Trial" value={r.trial} health="neutral" />
            <StatCell label="Past-due" value={r.pastDue} health={r.pastDue > 0 ? "bad" : "neutral"} />
            <StatCell label="Canceled" value={r.canceled} health="neutral" />
          </div>
        </>
      )}
    </OpsTile>
  );
}

function StatCell({
  label,
  value,
  health,
}: {
  label: string;
  value: number;
  health: Health;
}) {
  return (
    <div className="flex items-baseline justify-between border border-white/[0.06] px-2 py-1">
      <span className="uppercase tracking-wider text-text-muted">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${healthColor(health)}`}>
        {value}
      </span>
    </div>
  );
}

// ─── (e) Next-actions task list (add + toggle via server action) ──────────────
function TasksTile({
  data,
  onChange,
}: {
  data: OpsOverview | null;
  onChange: () => Promise<void>;
}) {
  const t = data?.tasks;
  const tasks = t?.tasks ?? [];
  const open = t?.openCount ?? 0;
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const value = title.trim();
    if (!value || pending) return;
    setPending(true);
    const res = await addOpsTask(value);
    if (res.ok) {
      setTitle("");
      await onChange();
    }
    setPending(false);
  }

  async function handleToggle(id: string, done: boolean) {
    if (pending) return;
    setPending(true);
    const res = await toggleOpsTask(id, done);
    if (res.ok) await onChange();
    setPending(false);
  }

  return (
    <OpsTile
      label="Next Actions"
      subtitle="Run-the-business to-do"
      badge={tasks.length > 0 ? `${open} open` : undefined}
      badgeHealth={t?.health ?? "neutral"}
    >
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a task…"
          disabled={pending}
          className="min-w-0 flex-1 border border-white/[0.12] bg-bg-primary px-2 py-1 text-[12px] text-text-primary placeholder:text-text-muted focus:border-accent-teal/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !title.trim()}
          aria-label="Add task"
          className="flex shrink-0 items-center justify-center border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-accent-teal hover:bg-accent-teal/20 disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-3">
          <OpsEmpty
            icon={<ListChecks size={20} />}
            heading="No open tasks"
            description="Add the next thing to clear for running the business."
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.06]">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex cursor-pointer items-center gap-2 py-1.5 first:pt-0 last:pb-0"
            >
              <input
                type="checkbox"
                checked={task.done}
                disabled={pending}
                onChange={() => handleToggle(task.id, !task.done)}
                className="h-3.5 w-3.5 shrink-0 accent-accent-teal"
              />
              <span
                className={`min-w-0 flex-1 truncate text-[12px] ${
                  task.done
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              >
                {task.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </OpsTile>
  );
}

// ─── (b) Recent signups feed ──────────────────────────────────────────────────
function RecentSignupsTile({ data }: { data: OpsOverview | null }) {
  const rows = data?.recentSignups ?? [];
  const referral = data?.referralCount ?? 0;
  const organic = data?.organicCount ?? 0;
  return (
    <OpsTile
      label="Recent Signups"
      subtitle={`Last ${rows.length} · ${referral} referral / ${organic} organic`}
      badge={referral > 0 ? "viral loop" : undefined}
      badgeHealth={referral > 0 ? "good" : "neutral"}
    >
      {rows.length === 0 ? (
        <OpsEmpty
          icon={<Inbox size={20} />}
          heading="No signups yet"
          description="New waitlist signups appear here with source + target track."
        />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {rows.map((s, i) => {
            const track = TRACK_LABELS[s.track] ?? (s.track || "").toUpperCase();
            const isReferral = s.source === "referral";
            return (
              <div
                key={`${s.createdAt}-${i}`}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="w-16 shrink-0 font-mono text-[10px] text-text-muted">
                  {relativeTime(s.createdAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                  {s.name || "—"}
                </span>
                <span className="hidden min-w-0 max-w-[40%] truncate text-[11px] text-text-muted sm:block">
                  {s.university}
                </span>
                {track && (
                  <span className="shrink-0 border border-white/[0.12] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-text-secondary">
                    {track}
                  </span>
                )}
                <span
                  className={`shrink-0 border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${
                    isReferral
                      ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal"
                      : "border-white/[0.12] text-text-muted"
                  }`}
                >
                  {s.source}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </OpsTile>
  );
}
