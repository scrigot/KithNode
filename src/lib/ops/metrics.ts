/**
 * Pure metric logic for the founder-ops cockpit (/dashboard/ops).
 *
 * Everything here is a pure function — no auth, no Supabase, no React — so it
 * can be unit-tested directly (see metrics.test.ts). The API route
 * (/api/ops/overview) feeds rows in; the client cockpit renders the output.
 *
 * Identity is the email everywhere (UserDiscover.userId / Connection.userId
 * are emails — see auth.ts). Date math is UTC, matching /api/dashboard/overview.
 */

// ─── Health (good/bad color state) ──────────────────────────────────────────
// Every number the cockpit renders carries a Health so there are no naked
// figures. healthColor maps it to a brand/dashboard.md token class (teal-only accent,
// semantic green/amber/red, muted for neutral).
export type Health = "good" | "warn" | "bad" | "neutral";

export function healthColor(h: Health): string {
  switch (h) {
    case "good":
      return "text-accent-green";
    case "warn":
      return "text-accent-amber";
    case "bad":
      return "text-accent-red";
    default:
      return "text-text-muted";
  }
}

// ─── Thresholds (canonical pre-launch bars; documented in the spec) ──────────
export const LVR_TARGET = 0.1; // Lead Velocity Rate: +10%/week is the bar.
export const FUNNEL_SIGNUP_TO_SWIPE = { good: 40, warn: 20 }; // % thresholds
export const FUNNEL_SWIPE_TO_CONNECT = { good: 25, warn: 10 }; // % thresholds

// Daily variable-API budget for the cost-burn red threshold (Sam-confirmed $2/day).
export const DAILY_COST_BUDGET_USD = 2;

// Fixed monthly subscriptions — KithNode's known recurring services. These are
// $0 placeholders for Sam to fill with real numbers; the total-burn tile sums
// them with the trailing-30d variable API spend vs the monthly-equivalent
// budget. Hunter & Apollo are FREE tier (logged at $0 in api_cost_log for
// credit-burn tracking), so they are NOT fixed subs here.
// TODO(sam): set real monthly $
export const FIXED_SUBSCRIPTIONS: ReadonlyArray<{ name: string; monthlyUsd: number }> = [
  { name: "Vercel", monthlyUsd: 0 },
  { name: "Supabase", monthlyUsd: 0 },
  { name: "Railway", monthlyUsd: 0 },
  { name: "Domain", monthlyUsd: 0 },
  { name: "PostHog", monthlyUsd: 0 },
  { name: "Sentry", monthlyUsd: 0 },
  { name: "Anthropic (min)", monthlyUsd: 0 },
];

const DAY_MS = 86_400_000;

// ─── Date helpers (UTC) ──────────────────────────────────────────────────────

/** Start of the UTC day for a timestamp, as `YYYY-MM-DD`. */
export function utcDayKey(ts: string | number | Date): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * Bucket dated rows into per-UTC-day counts over the trailing `days` window
 * ending at `now` (inclusive). Always returns exactly `days` ordered buckets,
 * back-filling empty days with 0 so a sparkline has no gaps.
 */
export function bucketByDay(
  timestamps: Array<string | number | Date>,
  days: number,
  now: Date = new Date(),
): Array<{ date: string; count: number }> {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);

  const buckets: Array<{ date: string; count: number }> = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(end.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({ date: key, count: 0 });
  }

  for (const ts of timestamps) {
    const key = utcDayKey(ts);
    const at = index.get(key);
    if (at !== undefined) buckets[at].count += 1;
  }
  return buckets;
}

// ─── (a) Signups velocity — WoW Lead Velocity Rate ───────────────────────────
export interface VelocityResult {
  thisWeek: number;
  lastWeek: number;
  /** Fractional WoW change (0.1 = +10%). null when lastWeek is 0 (undefined %). */
  wowPct: number | null;
  health: Health;
  series: Array<{ date: string; count: number }>;
}

/**
 * Compute this-week vs last-week signup counts from a 14-day window of dated
 * rows. "This week" = last 7 UTC days (incl today); "last week" = the prior 7.
 * Health: WoW >= +10% good, 0..+10% warn, negative bad. When last week is 0,
 * any signups this week count as good (growth from a standing start).
 */
export function computeVelocity(
  timestamps: Array<string | number | Date>,
  now: Date = new Date(),
): VelocityResult {
  const series = bucketByDay(timestamps, 14, now);
  const lastWeek = series.slice(0, 7).reduce((s, b) => s + b.count, 0);
  const thisWeek = series.slice(7).reduce((s, b) => s + b.count, 0);

  let wowPct: number | null;
  let health: Health;
  if (lastWeek === 0) {
    wowPct = null;
    health = thisWeek > 0 ? "good" : "neutral";
  } else {
    wowPct = (thisWeek - lastWeek) / lastWeek;
    if (wowPct >= LVR_TARGET) health = "good";
    else if (wowPct >= 0) health = "warn";
    else health = "bad";
  }

  return { thisWeek, lastWeek, wowPct, health, series };
}

// ─── (c) Activation funnel — signup -> first swipe -> first connection ────────
export interface FunnelResult {
  users: number;
  activated: number; // distinct users with >= 1 UserDiscover row
  connected: number; // distinct users with >= 1 Connection row
  signupToSwipePct: number;
  swipeToConnectPct: number;
  signupToSwipeHealth: Health;
  swipeToConnectHealth: Health;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function funnelHealth(p: number, t: { good: number; warn: number }): Health {
  if (p >= t.good) return "good";
  if (p >= t.warn) return "warn";
  return "bad";
}

/**
 * Funnel from raw userId arrays. `discoverUserIds`/`connectionUserIds` are the
 * full (non-distinct) userId lists; this distinct-counts them. Pre-launch with
 * a single user this reads 1/1/1 (100%/100%) — handled by the empty-state in
 * the tile, not here.
 */
export function computeFunnel(
  totalUsers: number,
  discoverUserIds: string[],
  connectionUserIds: string[],
): FunnelResult {
  const activated = new Set(discoverUserIds).size;
  const connected = new Set(connectionUserIds).size;
  const signupToSwipePct = pct(activated, totalUsers);
  const swipeToConnectPct = pct(connected, activated);
  return {
    users: totalUsers,
    activated,
    connected,
    signupToSwipePct,
    swipeToConnectPct,
    signupToSwipeHealth:
      totalUsers > 0
        ? funnelHealth(signupToSwipePct, FUNNEL_SIGNUP_TO_SWIPE)
        : "neutral",
    swipeToConnectHealth:
      activated > 0
        ? funnelHealth(swipeToConnectPct, FUNNEL_SWIPE_TO_CONNECT)
        : "neutral",
  };
}

// ─── (d) Active users — 7d distinct, WoW ──────────────────────────────────────
export interface ActiveUsersResult {
  active7d: number;
  priorActive7d: number;
  health: Health;
}

/** Distinct count of the union of two userId arrays. */
export function distinctUnionCount(a: string[], b: string[]): number {
  return new Set([...a, ...b]).size;
}

/**
 * Compare current-7d distinct active users vs prior-7d. Each window is the
 * distinct union of the AuditLog + UserDiscover userIds the caller already
 * filtered to that window. Health: current >= prior good, flat warn (equal,
 * non-zero), declining bad; both-zero neutral.
 */
export function computeActiveUsers(
  currentAudit: string[],
  currentDiscover: string[],
  priorAudit: string[],
  priorDiscover: string[],
): ActiveUsersResult {
  const active7d = distinctUnionCount(currentAudit, currentDiscover);
  const priorActive7d = distinctUnionCount(priorAudit, priorDiscover);

  let health: Health;
  if (active7d === 0 && priorActive7d === 0) health = "neutral";
  else if (active7d > priorActive7d) health = "good";
  else if (active7d === priorActive7d) health = "warn";
  else health = "bad";

  return { active7d, priorActive7d, health };
}

// ─── (h) Revenue stub — tally subscription statuses ──────────────────────────
export interface RevenueResult {
  active: number;
  trial: number;
  pastDue: number;
  canceled: number;
  mrr: number;
  health: Health;
}

/**
 * Tally subscription rows. MRR is 0 pre-launch (no paid plans live), so v1
 * passes a planPrice map but it resolves to 0. Health: any past_due is bad
 * (chase the failed payment); active growth good; all-trial/empty neutral.
 */
export function computeRevenue(
  rows: Array<{ subscriptionStatus?: string | null; subscriptionPlan?: string | null }>,
  planPrices: Record<string, number> = {},
): RevenueResult {
  let active = 0;
  let trial = 0;
  let pastDue = 0;
  let canceled = 0;
  let mrr = 0;

  for (const r of rows) {
    const status = (r.subscriptionStatus || "").toLowerCase();
    if (status === "active") {
      active += 1;
      mrr += planPrices[(r.subscriptionPlan || "").toLowerCase()] ?? 0;
    } else if (status === "trial") trial += 1;
    else if (status === "past_due") pastDue += 1;
    else if (status === "canceled") canceled += 1;
  }

  let health: Health;
  if (pastDue > 0) health = "bad";
  else if (active > 0) health = "good";
  else health = "neutral";

  return { active, trial, pastDue, canceled, mrr, health };
}

// ─── (e) Tasks — open-count health ────────────────────────────────────────────
/**
 * Advisory color for the next-actions tile by number of open tasks:
 * <= 5 good, 6-10 warn, > 10 bad (founder is overloaded). 0 open is neutral.
 */
export function taskHealth(openCount: number): Health {
  if (openCount <= 0) return "neutral";
  if (openCount <= 5) return "good";
  if (openCount <= 10) return "warn";
  return "bad";
}

// ─── (g) Cost-burn — variable API spend + total monthly burn ──────────────────
export interface CostRow {
  cost_usd: number | string | null;
  provider: string | null;
  created_at: string | null;
  meta?: Record<string, unknown> | null;
}

export interface CostResult {
  /** Total variable API spend today (UTC). */
  today: number;
  /** Total variable API spend over the trailing 7 days. */
  last7d: number;
  /** Per-day average over the trailing 7 days (last7d / 7). */
  avgPerDay: number;
  /** 7-day daily cost series for the sparkline. */
  series: Array<{ date: string; cost: number }>;
  /** Per-provider total over the trailing 7 days (anthropic / hunter / apollo). */
  byProvider: Array<{ provider: string; cost: number; calls: number }>;
  /** Avg cost per draft, grouped by meta.contact_id (null when no attributed rows). */
  costPerDraft: number | null;
  /** today vs DAILY_COST_BUDGET_USD: <= budget good, 1-2x warn, > 2x bad. Empty = neutral. */
  todayHealth: Health;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Bucket cost rows into a daily series + today/7d totals + provider breakdown +
 * cost-per-draft, over a trailing `days`-day window ending at `now` (UTC).
 * Rows are the raw api_cost_log selection; numeric() comes back as a string
 * from supabase-js, so cost_usd is parsed defensively.
 */
export function computeCost(
  rows: CostRow[],
  days = 7,
  now: Date = new Date(),
  budget: number = DAILY_COST_BUDGET_USD,
): CostResult {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const todayKey = end.toISOString().slice(0, 10);

  const series: Array<{ date: string; cost: number }> = [];
  const dayIndex = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(end.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    dayIndex.set(key, series.length);
    series.push({ date: key, cost: 0 });
  }

  let today = 0;
  let last7d = 0;
  const providers = new Map<string, { cost: number; calls: number }>();
  // contact_id -> summed cost, for cost-per-draft.
  const draftCosts = new Map<string, number>();

  for (const row of rows) {
    if (!row.created_at) continue;
    const cost = toNum(row.cost_usd);
    const key = utcDayKey(row.created_at);
    const at = dayIndex.get(key);
    if (at === undefined) continue; // outside the window

    series[at].cost += cost;
    last7d += cost;
    if (key === todayKey) today += cost;

    const provider = (row.provider || "unknown").toLowerCase();
    const p = providers.get(provider) ?? { cost: 0, calls: 0 };
    p.cost += cost;
    p.calls += 1;
    providers.set(provider, p);

    const contactId = row.meta?.contact_id;
    if (typeof contactId === "string" && contactId) {
      draftCosts.set(contactId, (draftCosts.get(contactId) ?? 0) + cost);
    }
  }

  const byProvider = Array.from(providers.entries())
    .map(([provider, v]) => ({ provider, cost: v.cost, calls: v.calls }))
    .sort((a, b) => b.cost - a.cost);

  const costPerDraft =
    draftCosts.size > 0
      ? Array.from(draftCosts.values()).reduce((s, c) => s + c, 0) / draftCosts.size
      : null;

  const hasSpend = last7d > 0;
  let todayHealth: Health;
  if (!hasSpend) todayHealth = "neutral";
  else if (today <= budget) todayHealth = "good";
  else if (today <= budget * 2) todayHealth = "warn";
  else todayHealth = "bad";

  return {
    today,
    last7d,
    avgPerDay: last7d / days,
    series,
    byProvider,
    costPerDraft,
    todayHealth,
  };
}

// ─── (g) Total burn — fixed subscriptions + 30d variable, vs monthly budget ───
export interface TotalBurnResult {
  fixedMonthly: number;
  variable30d: number;
  totalMonthly: number;
  monthlyBudget: number;
  health: Health;
}

/**
 * Total monthly burn = sum(fixed subscriptions) + trailing-30d variable API
 * spend, compared against the monthly-equivalent budget (DAILY_COST_BUDGET_USD
 * * 30). Health: <= budget good, 1-2x warn, > 2x bad.
 */
export function computeTotalBurn(
  fixedSubscriptions: ReadonlyArray<{ monthlyUsd: number }>,
  variable30d: number,
  budget: number = DAILY_COST_BUDGET_USD,
): TotalBurnResult {
  const fixedMonthly = fixedSubscriptions.reduce((s, f) => s + f.monthlyUsd, 0);
  const totalMonthly = fixedMonthly + variable30d;
  const monthlyBudget = budget * 30;

  let health: Health;
  if (totalMonthly <= monthlyBudget) health = "good";
  else if (totalMonthly <= monthlyBudget * 2) health = "warn";
  else health = "bad";

  return { fixedMonthly, variable30d, totalMonthly, monthlyBudget, health };
}
