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
  };
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
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(emptyOverview());
  }
}
