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
// figures. healthColor maps it to a DESIGN.md token class (teal-only accent,
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
