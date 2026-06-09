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
  it("maps each Health to its DESIGN.md token class", () => {
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
