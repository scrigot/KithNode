import { describe, it, expect } from "vitest";
import {
  engagementScore,
  signalScore,
  combinedTotal,
  tierFromTotal,
} from "./relationship-score";

const NOW = Date.parse("2026-06-11T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe("engagementScore", () => {
  it("tiers by recency of last contact", () => {
    expect(engagementScore({ lastSpokenAt: daysAgo(2), now: NOW })).toBe(20);
    expect(engagementScore({ lastSpokenAt: daysAgo(20), now: NOW })).toBe(15);
    expect(engagementScore({ lastSpokenAt: daysAgo(60), now: NOW })).toBe(9);
    expect(engagementScore({ lastSpokenAt: daysAgo(400), now: NOW })).toBe(0);
  });

  it("uses the frequency floor when recency is weak, takes the max", () => {
    expect(engagementScore({ speakFrequency: "weekly", now: NOW })).toBe(14);
    // recent conversation (20) beats the monthly floor (9)
    expect(
      engagementScore({ lastSpokenAt: daysAgo(3), speakFrequency: "monthly", now: NOW }),
    ).toBe(20);
  });

  it("contributes 0 for missing/future/unparseable dates", () => {
    expect(engagementScore({ now: NOW })).toBe(0);
    expect(engagementScore({ lastSpokenAt: daysAgo(-5), now: NOW })).toBe(0);
    expect(engagementScore({ lastSpokenAt: "not a date", now: NOW })).toBe(0);
  });
});

describe("signalScore", () => {
  it("friend is the dominant signal, leadership adds, caps at 30", () => {
    expect(signalScore({ isFriend: true })).toBe(24);
    expect(signalScore({ affiliationNames: ["Club Leadership"] })).toBe(6);
    expect(
      signalScore({ isFriend: true, affiliationNames: ["Club Leadership", "Same School"] }),
    ).toBe(30);
    expect(signalScore({})).toBe(0);
  });
});

describe("combinedTotal + tierFromTotal", () => {
  it("sums the three bars and caps at 100", () => {
    expect(combinedTotal(60, 24, 20)).toBe(100);
    expect(combinedTotal(30, 0, 0)).toBe(30);
  });

  it("maps totals to tiers on the existing thresholds", () => {
    expect(tierFromTotal(90)).toBe("hot");
    expect(tierFromTotal(70)).toBe("warm");
    expect(tierFromTotal(50)).toBe("monitor");
    expect(tierFromTotal(20)).toBe("cold");
  });
});
