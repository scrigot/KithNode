import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { isFounder, FOUNDER_EMAIL } from "../founder";
import {
  healthColor,
  utcDayKey,
  bucketByDay,
  computeVelocity,
  computeFunnel,
  distinctUnionCount,
  computeActiveUsers,
  computeRevenue,
  taskHealth,
  computeCost,
  computeTotalBurn,
  DAILY_COST_BUDGET_USD,
  type CostRow,
} from "./metrics";

// Minimal Session-shaped object. We import only the Session *type* (type-only,
// erased at compile — does NOT pull next/server at runtime). isFounder reads
// session.user.email only, so a structural stand-in cast through the type is
// sufficient. FOUNDER_EMAIL defaults to samrigot31@gmail.com.
const session = (email: string | null | undefined): Session =>
  ({ user: { email } } as unknown as Session);

describe("isFounder (simulation — no NextAuth runtime import)", () => {
  it("default FOUNDER_EMAIL is sam's, lowercased", () => {
    expect(FOUNDER_EMAIL).toBe("samrigot31@gmail.com");
  });

  it("returns true for exact founder email", () => {
    expect(isFounder(session("samrigot31@gmail.com"))).toBe(true);
  });

  it("returns true for the personal owner email", () => {
    expect(isFounder(session("samrigot@kithnode.ai"))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isFounder(session("SamRigot31@Gmail.com"))).toBe(true);
  });

  it("returns false for a different email", () => {
    expect(isFounder(session("someone@unc.edu"))).toBe(false);
  });

  it("returns false for null session", () => {
    expect(isFounder(null)).toBe(false);
  });

  it("returns false when email is missing/null", () => {
    expect(isFounder(session(undefined))).toBe(false);
    expect(isFounder(session(null))).toBe(false);
  });
});

describe("healthColor", () => {
  it("maps each Health to its brand/dashboard.md token class", () => {
    expect(healthColor("good")).toBe("text-accent-green");
    expect(healthColor("warn")).toBe("text-accent-amber");
    expect(healthColor("bad")).toBe("text-accent-red");
    expect(healthColor("neutral")).toBe("text-text-muted");
  });
});

describe("utcDayKey", () => {
  it("returns the UTC YYYY-MM-DD for a timestamp", () => {
    expect(utcDayKey("2026-06-09T23:30:00.000Z")).toBe("2026-06-09");
    expect(utcDayKey("2026-06-09T00:00:00.000Z")).toBe("2026-06-09");
  });
});

describe("bucketByDay", () => {
  const now = new Date("2026-06-09T12:00:00.000Z");

  it("returns exactly `days` ordered buckets, back-filling zeros", () => {
    const buckets = bucketByDay([], 7, now);
    expect(buckets).toHaveLength(7);
    expect(buckets[0].date).toBe("2026-06-03");
    expect(buckets[6].date).toBe("2026-06-09");
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("counts timestamps into the correct UTC-day bucket", () => {
    const ts = [
      "2026-06-09T01:00:00.000Z",
      "2026-06-09T20:00:00.000Z",
      "2026-06-07T10:00:00.000Z",
    ];
    const buckets = bucketByDay(ts, 7, now);
    expect(buckets.find((b) => b.date === "2026-06-09")?.count).toBe(2);
    expect(buckets.find((b) => b.date === "2026-06-07")?.count).toBe(1);
  });

  it("ignores timestamps outside the window", () => {
    const buckets = bucketByDay(["2026-05-01T00:00:00.000Z"], 7, now);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(0);
  });
});

describe("computeVelocity (WoW Lead Velocity Rate)", () => {
  const now = new Date("2026-06-14T12:00:00.000Z"); // a Sunday

  it("computes +% WoW as good when >= +10%", () => {
    // last week (days -13..-7): 2 signups; this week (days -6..0): 4 signups
    const ts = [
      "2026-06-02T00:00:00.000Z",
      "2026-06-03T00:00:00.000Z",
      "2026-06-09T00:00:00.000Z",
      "2026-06-10T00:00:00.000Z",
      "2026-06-11T00:00:00.000Z",
      "2026-06-12T00:00:00.000Z",
    ];
    const r = computeVelocity(ts, now);
    expect(r.lastWeek).toBe(2);
    expect(r.thisWeek).toBe(4);
    expect(r.wowPct).toBeCloseTo(1.0);
    expect(r.health).toBe("good");
    expect(r.series).toHaveLength(14);
  });

  it("flat/small-positive growth is warn", () => {
    // last week: 10, this week: 10 -> 0% -> warn
    const ts = [
      ...Array(10).fill("2026-06-03T00:00:00.000Z"),
      ...Array(10).fill("2026-06-10T00:00:00.000Z"),
    ];
    const r = computeVelocity(ts, now);
    expect(r.wowPct).toBe(0);
    expect(r.health).toBe("warn");
  });

  it("negative WoW is bad", () => {
    const ts = [
      ...Array(5).fill("2026-06-03T00:00:00.000Z"),
      ...Array(2).fill("2026-06-10T00:00:00.000Z"),
    ];
    const r = computeVelocity(ts, now);
    expect(r.wowPct).toBeLessThan(0);
    expect(r.health).toBe("bad");
  });

  it("growth from a standing start (lastWeek 0) is good with null %", () => {
    const r = computeVelocity(["2026-06-10T00:00:00.000Z"], now);
    expect(r.lastWeek).toBe(0);
    expect(r.thisWeek).toBe(1);
    expect(r.wowPct).toBeNull();
    expect(r.health).toBe("good");
  });

  it("empty input is neutral", () => {
    const r = computeVelocity([], now);
    expect(r.thisWeek).toBe(0);
    expect(r.health).toBe("neutral");
  });
});

describe("computeFunnel", () => {
  it("computes distinct stage counts and conversion %", () => {
    const r = computeFunnel(
      10,
      ["a", "a", "b", "c", "d"], // 4 distinct activated
      ["a", "b"], // 2 distinct connected
    );
    expect(r.activated).toBe(4);
    expect(r.connected).toBe(2);
    expect(r.signupToSwipePct).toBe(40);
    expect(r.swipeToConnectPct).toBe(50);
    expect(r.signupToSwipeHealth).toBe("good"); // 40 >= 40
    expect(r.swipeToConnectHealth).toBe("good"); // 50 >= 25
  });

  it("low conversion is bad", () => {
    const r = computeFunnel(100, ["a"], []);
    expect(r.signupToSwipePct).toBe(1);
    expect(r.signupToSwipeHealth).toBe("bad");
    expect(r.swipeToConnectHealth).toBe("bad"); // 0% of 1 activated
  });

  it("zero users yields neutral health, no divide-by-zero", () => {
    const r = computeFunnel(0, [], []);
    expect(r.signupToSwipePct).toBe(0);
    expect(r.swipeToConnectPct).toBe(0);
    expect(r.signupToSwipeHealth).toBe("neutral");
    expect(r.swipeToConnectHealth).toBe("neutral");
  });
});

describe("distinctUnionCount / computeActiveUsers", () => {
  it("distinctUnionCount counts the deduped union", () => {
    expect(distinctUnionCount(["a", "b"], ["b", "c"])).toBe(3);
    expect(distinctUnionCount([], [])).toBe(0);
  });

  it("growth in active users is good", () => {
    const r = computeActiveUsers(["a", "b"], ["b", "c"], ["a"], []);
    expect(r.active7d).toBe(3);
    expect(r.priorActive7d).toBe(1);
    expect(r.health).toBe("good");
  });

  it("flat active users is warn", () => {
    const r = computeActiveUsers(["a"], [], ["b"], []);
    expect(r.active7d).toBe(1);
    expect(r.priorActive7d).toBe(1);
    expect(r.health).toBe("warn");
  });

  it("declining active users is bad", () => {
    const r = computeActiveUsers(["a"], [], ["a", "b", "c"], []);
    expect(r.health).toBe("bad");
  });

  it("no activity at all is neutral", () => {
    const r = computeActiveUsers([], [], [], []);
    expect(r.health).toBe("neutral");
  });
});

describe("computeRevenue", () => {
  it("pre-launch all-trial is neutral with $0 MRR", () => {
    const r = computeRevenue([
      { subscriptionStatus: "trial" },
      { subscriptionStatus: "trial" },
    ]);
    expect(r.trial).toBe(2);
    expect(r.active).toBe(0);
    expect(r.mrr).toBe(0);
    expect(r.health).toBe("neutral");
  });

  it("computes MRR from a plan-price map for active subs", () => {
    const r = computeRevenue(
      [
        { subscriptionStatus: "active", subscriptionPlan: "monthly" },
        { subscriptionStatus: "active", subscriptionPlan: "annual" },
      ],
      { monthly: 20, annual: 15 },
    );
    expect(r.active).toBe(2);
    expect(r.mrr).toBe(35);
    expect(r.health).toBe("good");
  });

  it("any past_due flips health to bad", () => {
    const r = computeRevenue([
      { subscriptionStatus: "active", subscriptionPlan: "monthly" },
      { subscriptionStatus: "past_due" },
    ], { monthly: 20 });
    expect(r.pastDue).toBe(1);
    expect(r.health).toBe("bad");
  });
});

describe("taskHealth (open-count)", () => {
  it("0 open is neutral", () => {
    expect(taskHealth(0)).toBe("neutral");
  });
  it("<= 5 open is good", () => {
    expect(taskHealth(1)).toBe("good");
    expect(taskHealth(5)).toBe("good");
  });
  it("6-10 open is warn", () => {
    expect(taskHealth(6)).toBe("warn");
    expect(taskHealth(10)).toBe("warn");
  });
  it("> 10 open is bad (overloaded)", () => {
    expect(taskHealth(11)).toBe("bad");
  });
});

describe("computeCost (cost bucketing + budget health)", () => {
  const now = new Date("2026-06-09T12:00:00.000Z");

  const rows: CostRow[] = [
    // today
    { cost_usd: "0.50", provider: "anthropic", created_at: "2026-06-09T01:00:00.000Z", meta: { contact_id: "c1" } },
    { cost_usd: 0.25, provider: "anthropic", created_at: "2026-06-09T08:00:00.000Z", meta: { contact_id: "c2" } },
    // earlier in window
    { cost_usd: "0.10", provider: "hunter", created_at: "2026-06-07T10:00:00.000Z", meta: {} },
    { cost_usd: 0, provider: "apollo", created_at: "2026-06-06T10:00:00.000Z", meta: {} },
    // outside the 7d window — ignored
    { cost_usd: 99, provider: "anthropic", created_at: "2026-05-01T00:00:00.000Z", meta: {} },
  ];

  it("sums today and 7d totals, parses numeric strings", () => {
    const r = computeCost(rows, 7, now);
    expect(r.today).toBeCloseTo(0.75, 6);
    expect(r.last7d).toBeCloseTo(0.85, 6);
    expect(r.avgPerDay).toBeCloseTo(0.85 / 7, 6);
    expect(r.series).toHaveLength(7);
    expect(r.series[6].date).toBe("2026-06-09");
    expect(r.series[6].cost).toBeCloseTo(0.75, 6);
  });

  it("breaks down by provider with call counts", () => {
    const r = computeCost(rows, 7, now);
    const anthropic = r.byProvider.find((p) => p.provider === "anthropic");
    expect(anthropic?.cost).toBeCloseTo(0.75, 6);
    expect(anthropic?.calls).toBe(2);
    expect(r.byProvider.find((p) => p.provider === "apollo")?.calls).toBe(1);
  });

  it("computes cost-per-draft grouped by contact_id", () => {
    const r = computeCost(rows, 7, now);
    // c1 = 0.50, c2 = 0.25 -> avg 0.375
    expect(r.costPerDraft).toBeCloseTo(0.375, 6);
  });

  it("null cost-per-draft when no attributed rows", () => {
    const r = computeCost(
      [{ cost_usd: 1, provider: "hunter", created_at: "2026-06-09T01:00:00.000Z", meta: {} }],
      7,
      now,
    );
    expect(r.costPerDraft).toBeNull();
  });

  it("today health: <= budget good, 1-2x warn, > 2x bad", () => {
    const at = (cost: number) =>
      computeCost(
        [{ cost_usd: cost, provider: "anthropic", created_at: "2026-06-09T01:00:00.000Z", meta: {} }],
        7,
        now,
      ).todayHealth;
    expect(at(DAILY_COST_BUDGET_USD)).toBe("good");
    expect(at(DAILY_COST_BUDGET_USD * 1.5)).toBe("warn");
    expect(at(DAILY_COST_BUDGET_USD * 2.5)).toBe("bad");
  });

  it("empty rows are neutral with zero totals", () => {
    const r = computeCost([], 7, now);
    expect(r.today).toBe(0);
    expect(r.last7d).toBe(0);
    expect(r.todayHealth).toBe("neutral");
    expect(r.byProvider).toEqual([]);
  });
});

describe("computeTotalBurn (fixed + variable vs budget)", () => {
  it("sums fixed subs + 30d variable and compares to monthly budget", () => {
    const r = computeTotalBurn(
      [{ monthlyUsd: 20 }, { monthlyUsd: 5 }],
      10,
      DAILY_COST_BUDGET_USD,
    );
    expect(r.fixedMonthly).toBe(25);
    expect(r.variable30d).toBe(10);
    expect(r.totalMonthly).toBe(35);
    expect(r.monthlyBudget).toBe(DAILY_COST_BUDGET_USD * 30); // 60
    expect(r.health).toBe("good"); // 35 <= 60
  });

  it("over 2x monthly budget is bad", () => {
    const r = computeTotalBurn([{ monthlyUsd: 100 }], 50, DAILY_COST_BUDGET_USD);
    expect(r.totalMonthly).toBe(150);
    expect(r.health).toBe("bad"); // 150 > 120
  });

  it("$0 fixed + $0 variable is good (within budget)", () => {
    const r = computeTotalBurn([{ monthlyUsd: 0 }], 0, DAILY_COST_BUDGET_USD);
    expect(r.totalMonthly).toBe(0);
    expect(r.health).toBe("good");
  });
});
