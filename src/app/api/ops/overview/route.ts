import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { supabase } from "@/lib/supabase";
import {
  computeVelocity,
  computeFunnel,
  computeActiveUsers,
  computeRevenue,
  computeCost,
  computeTotalBurn,
  taskHealth,
  FIXED_SUBSCRIPTIONS,
  type VelocityResult,
  type FunnelResult,
  type ActiveUsersResult,
  type RevenueResult,
  type CostResult,
  type TotalBurnResult,
  type CostRow,
  type Health,
} from "@/lib/ops/metrics";
import {
  buildTimeline,
  nextTasks,
  laneSummary,
  type Timeline,
  type NextTask,
  type LaneSummary,
  type LaneStat,
  type PhaseInput,
  type MilestoneInput,
  type OpsEventInput,
} from "@/lib/ops/cockpit";
import { LANES, type LaneMetricKey } from "@/lib/ops/lane-config";

// ─── Response shape (shared with the client cockpit) ─────────────────────────
export interface RecentSignup {
  createdAt: string;
  name: string;
  university: string;
  track: string;
  source: "referral" | "organic";
}

export interface OpsTask {
  id: string;
  title: string;
  done: boolean;
  sort: number;
  createdAt: string;
}

export interface TasksResult {
  tasks: OpsTask[];
  openCount: number;
  health: Health;
}

export interface OpsOverview {
  velocity: VelocityResult;
  recentSignups: RecentSignup[];
  referralCount: number;
  organicCount: number;
  funnel: FunnelResult;
  activeUsers: ActiveUsersResult;
  revenue: RevenueResult;
  tasks: TasksResult;
  cost: CostResult;
  totalBurn: TotalBurnResult;
  // ─── Cockpit v2 (optional; each degrades to null/[] independently) ─────────
  /** Phased timeline ladder + active phase. null if the read failed. */
  timeline: Timeline | null;
  /** Next ~10 incomplete tasks under the active phase. [] if none / read failed. */
  nextTasks: NextTask[];
  /** The 8 lane cards for the OrgBand. [] if the read failed. */
  lanes: LaneSummary[];
  /** When the roadmap->DB mirror last ran (ISO), for the "synced Nh ago" badge. */
  syncedAt: string | null;
}

const DAY_MS = 86_400_000;

function emptyOverview(): OpsOverview {
  return {
    velocity: {
      thisWeek: 0,
      lastWeek: 0,
      wowPct: null,
      health: "neutral",
      series: [],
    },
    recentSignups: [],
    referralCount: 0,
    organicCount: 0,
    funnel: {
      users: 0,
      activated: 0,
      connected: 0,
      signupToSwipePct: 0,
      swipeToConnectPct: 0,
      signupToSwipeHealth: "neutral",
      swipeToConnectHealth: "neutral",
    },
    activeUsers: { active7d: 0, priorActive7d: 0, health: "neutral" },
    revenue: { active: 0, trial: 0, pastDue: 0, canceled: 0, mrr: 0, health: "neutral" },
    tasks: { tasks: [], openCount: 0, health: "neutral" },
    cost: {
      today: 0,
      last7d: 0,
      avgPerDay: 0,
      series: [],
      byProvider: [],
      costPerDraft: null,
      todayHealth: "neutral",
    },
    totalBurn: computeTotalBurn(FIXED_SUBSCRIPTIONS, 0),
    timeline: null,
    nextTasks: [],
    lanes: [],
    syncedAt: null,
  };
}

// Build a lane's headline stat from the already-computed metric signals. Maps
// each lane's metricKey -> a {label,value,health} or null (null = the card
// shows a muted "manual", never a fabricated number — the org-band rule).
function laneStat(
  metricKey: LaneMetricKey | null,
  signals: {
    velocity: VelocityResult;
    funnel: FunnelResult;
    totalBurn: TotalBurnResult;
    revenue: RevenueResult;
    activeUsers: ActiveUsersResult;
    taskOpenCount: number;
    taskHealthValue: Health;
  },
): LaneStat | null {
  switch (metricKey) {
    case "velocity": {
      const v = signals.velocity;
      const label =
        v.wowPct == null
          ? "new"
          : `${v.wowPct >= 0 ? "+" : ""}${(v.wowPct * 100).toFixed(0)}% WoW`;
      return { label: "Signups / wk", value: `${v.thisWeek}`, health: v.health };
    }
    case "funnel": {
      const f = signals.funnel;
      return {
        label: "Signup→swipe",
        value: `${f.signupToSwipePct}%`,
        health: f.signupToSwipeHealth,
      };
    }
    case "totalBurn": {
      const b = signals.totalBurn;
      return {
        label: "Burn / mo",
        value: `$${b.totalMonthly.toFixed(0)}`,
        health: b.health,
      };
    }
    case "revenue": {
      const r = signals.revenue;
      return { label: "MRR", value: `$${r.mrr}`, health: r.health };
    }
    case "activeUsers": {
      const a = signals.activeUsers;
      return { label: "Active 7d", value: `${a.active7d}`, health: a.health };
    }
    case "taskHealth": {
      return {
        label: "Open tasks",
        value: `${signals.taskOpenCount}`,
        health: signals.taskHealthValue,
      };
    }
    default:
      return null;
  }
}

export async function GET() {
  const session = await auth();
  // 404 (not 403) so non-founders can't confirm the route exists. This is the
  // load-bearing security gate — the sidebar/page are UX only.
  if (!isFounder(session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS).toISOString();
    // Boundary between the prior-7d and current-7d active-user windows.
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    // Total-burn variable window (trailing 30d).
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS).toISOString();

    const [
      velocityRows,
      recentRows,
      userCountRes,
      discoverRows,
      connectionRows,
      auditWindowRows,
      discoverWindowRows,
      revenueRows,
      taskRows,
      costRows,
      phaseRows,
      milestoneRows,
      opsEventRows,
    ] = await Promise.all([
      // (a) signups velocity — 14d window of created_at
      supabase
        .from("waitlist_signups")
        .select("created_at")
        .gte("created_at", fourteenDaysAgo),
      // (b) recent signups feed — last 10
      supabase
        .from("waitlist_signups")
        .select("created_at, full_name, university, target_track, referred_by")
        .order("created_at", { ascending: false })
        .limit(10),
      // (c) funnel stage 1 — total users
      supabase.from("User").select("*", { count: "exact", head: true }),
      // (c) funnel stage 2 — distinct activated (any UserDiscover row)
      supabase.from("UserDiscover").select("userId"),
      // (c) funnel stage 3 — distinct connected (any Connection row)
      supabase.from("Connection").select("userId"),
      // (d) active users — AuditLog over last 14d (split into current/prior 7d)
      supabase
        .from("AuditLog")
        .select("userId, createdAt")
        .gte("createdAt", fourteenDaysAgo),
      // (d) active users — UserDiscover over last 14d
      supabase
        .from("UserDiscover")
        .select("userId, createdAt")
        .gte("createdAt", fourteenDaysAgo),
      // (h) revenue stub — subscription tallies
      supabase.from("User").select("subscriptionStatus, subscriptionPlan"),
      // (e) tasks — open first, then by sort, then created (matches the spec order)
      supabase
        .from("ops_tasks")
        .select("id, title, done, sort, created_at")
        .order("done", { ascending: true })
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true }),
      // (g) cost — last 30d of api_cost_log (covers both the 7d tile + 30d burn)
      supabase
        .from("api_cost_log")
        .select("cost_usd, provider, created_at, meta")
        .gte("created_at", thirtyDaysAgo),
      // (cockpit) phases — the timeline ladder
      supabase
        .from("phases")
        .select("id, name, gate, order, status, createdAt")
        .order("order", { ascending: true }),
      // (cockpit) milestones — per-lane roadmap + next-10
      supabase
        .from("milestones")
        .select("id, title, lane, phaseId, gate, status, order, note, evidence")
        .order("order", { ascending: true }),
      // (cockpit) recent changes per lane — last 30 ops events
      supabase
        .from("ops_events")
        .select("id, lane, kind, summary, ref, createdAt")
        .order("createdAt", { ascending: false })
        .limit(30),
    ]);

    // (a) velocity
    const velocity = computeVelocity(
      (velocityRows.data ?? []).map((r) => r.created_at as string),
      now,
    );

    // (b) recent signups feed
    const recentSignups: RecentSignup[] = (recentRows.data ?? []).map((r) => ({
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      name: (r.full_name as string) ?? "",
      university: (r.university as string) ?? "",
      track: (r.target_track as string) ?? "",
      source: r.referred_by ? ("referral" as const) : ("organic" as const),
    }));
    const referralCount = recentSignups.filter((s) => s.source === "referral").length;
    const organicCount = recentSignups.length - referralCount;

    // (c) funnel
    const funnel = computeFunnel(
      userCountRes.count ?? 0,
      (discoverRows.data ?? []).map((r) => r.userId as string).filter(Boolean),
      (connectionRows.data ?? []).map((r) => r.userId as string).filter(Boolean),
    );

    // (d) active users — split the 14d windows into current/prior 7d
    const splitWindow = (
      rows: Array<{ userId: string | null; createdAt: string | null }> | null,
    ) => {
      const current: string[] = [];
      const prior: string[] = [];
      for (const row of rows ?? []) {
        if (!row.userId || !row.createdAt) continue;
        if (row.createdAt >= sevenDaysAgo) current.push(row.userId);
        else prior.push(row.userId);
      }
      return { current, prior };
    };
    const audit = splitWindow(
      auditWindowRows.data as Array<{ userId: string | null; createdAt: string | null }>,
    );
    const disc = splitWindow(
      discoverWindowRows.data as Array<{ userId: string | null; createdAt: string | null }>,
    );
    const activeUsers = computeActiveUsers(
      audit.current,
      disc.current,
      audit.prior,
      disc.prior,
    );

    // (h) revenue stub — $0 pre-launch (no plan-price map until paid plans live)
    const revenue = computeRevenue(
      (revenueRows.data ?? []).map((r) => ({
        subscriptionStatus: r.subscriptionStatus as string | null,
        subscriptionPlan: r.subscriptionPlan as string | null,
      })),
    );

    // (e) tasks
    const tasks: OpsTask[] = (taskRows.data ?? []).map((r) => ({
      id: r.id as string,
      title: (r.title as string) ?? "",
      done: !!r.done,
      sort: (r.sort as number) ?? 0,
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
    }));
    const openCount = tasks.filter((t) => !t.done).length;
    const tasksResult: TasksResult = {
      tasks,
      openCount,
      health: taskHealth(openCount),
    };

    // (g) cost-burn — 7d tile from the 30d selection; total-burn over the full 30d
    const allCostRows = (costRows.data ?? []) as CostRow[];
    const cost = computeCost(allCostRows, 7, now);
    const variable30d = allCostRows.reduce((sum, row) => {
      const c =
        typeof row.cost_usd === "string"
          ? parseFloat(row.cost_usd)
          : row.cost_usd ?? 0;
      return sum + (Number.isFinite(c) ? (c as number) : 0);
    }, 0);
    const totalBurn = computeTotalBurn(FIXED_SUBSCRIPTIONS, variable30d);

    // ─── Cockpit v2: timeline + next-10 + lane cards (per-section degrade) ────
    // Each block guards on its own row error: a failed read degrades that
    // section to neutral/empty while the rest of the payload still returns 200.
    let timeline: Timeline | null = null;
    let next: NextTask[] = [];
    let lanes: LaneSummary[] = [];
    let syncedAt: string | null = null;

    const phases: PhaseInput[] = phaseRows.error
      ? []
      : (phaseRows.data ?? []).map((p) => ({
          id: p.id as string,
          name: (p.name as string) ?? "",
          gate: (p.gate as string) ?? "",
          order: (p.order as number) ?? 0,
          status: (p.status as string) ?? "planned",
        }));

    const milestones: MilestoneInput[] = milestoneRows.error
      ? []
      : (milestoneRows.data ?? []).map((m) => ({
          id: m.id as string,
          title: (m.title as string) ?? "",
          lane: (m.lane as string) ?? "",
          phaseId: (m.phaseId as string | null) ?? null,
          gate: (m.gate as string) ?? "",
          status: (m.status as string) ?? "planned",
          order: (m.order as number) ?? 0,
          note: (m.note as string | null) ?? null,
          evidence: (m.evidence as string | null) ?? null,
        }));

    const opsEvents: OpsEventInput[] = opsEventRows.error
      ? []
      : (opsEventRows.data ?? []).map((e) => ({
          id: e.id as string,
          lane: (e.lane as string) ?? "",
          kind: (e.kind as string) ?? "",
          summary: (e.summary as string) ?? "",
          ref: (e.ref as string | null) ?? null,
          createdAt: (e.createdAt as string) ?? new Date().toISOString(),
        }));

    if (!phaseRows.error) {
      timeline = buildTimeline(phases, milestones);
      next = nextTasks(milestones, timeline.activePhaseId);
      // syncedAt = the most recent phase createdAt as a freshness proxy.
      syncedAt =
        (phaseRows.data ?? [])
          .map((p) => p.createdAt as string | null)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
    }

    // Lane cards — always built from the static LANES config; a per-lane stat
    // resolves from the metric signals, milestones, and events.
    const laneSignals = {
      velocity,
      funnel,
      totalBurn,
      revenue,
      activeUsers,
      taskOpenCount: openCount,
      taskHealthValue: tasksResult.health,
    };
    lanes = LANES.map((lane) =>
      laneSummary(
        lane,
        milestones,
        opsEvents,
        laneStat(lane.metricKey, laneSignals),
      ),
    );

    const payload: OpsOverview = {
      velocity,
      recentSignups,
      referralCount,
      organicCount,
      funnel,
      activeUsers,
      revenue,
      tasks: tasksResult,
      cost,
      totalBurn,
      timeline,
      nextTasks: next,
      lanes,
      syncedAt,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(emptyOverview());
  }
}
