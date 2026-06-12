import { describe, it, expect } from "vitest";
import {
  engagementScore,
  relationshipClass,
  isDormantKith,
  displayTier,
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

describe("relationshipClass — friend OR proven contact", () => {
  it("friend toggle promotes instantly", () => {
    expect(relationshipClass({ isFriend: true, now: NOW })).toBe("kith");
  });

  it("a proven pipeline stage promotes (responded / meeting_set, case-insensitive)", () => {
    expect(relationshipClass({ pipelineStage: "responded", now: NOW })).toBe("kith");
    expect(relationshipClass({ pipelineStage: "MEETING_SET", now: NOW })).toBe("kith");
    expect(relationshipClass({ pipelineStage: "email_sent", now: NOW })).toBe("");
  });

  it("speaking within 30 days promotes; older or future does not", () => {
    expect(relationshipClass({ lastSpokenAt: daysAgo(10), now: NOW })).toBe("kith");
    expect(relationshipClass({ lastSpokenAt: daysAgo(45), now: NOW })).toBe("");
    expect(relationshipClass({ lastSpokenAt: daysAgo(-3), now: NOW })).toBe("");
  });

  it("a plain high-fit stranger stays a signal", () => {
    expect(relationshipClass({ now: NOW })).toBe("");
  });
});

describe("isDormantKith", () => {
  it("dormant only when a logged date is older than 90 days", () => {
    expect(isDormantKith({ lastSpokenAt: daysAgo(120), now: NOW })).toBe(true);
    expect(isDormantKith({ lastSpokenAt: daysAgo(30), now: NOW })).toBe(false);
  });

  it("never dormant without a logged date (fresh friends are not nagged)", () => {
    expect(isDormantKith({ now: NOW })).toBe(false);
    expect(isDormantKith({ lastSpokenAt: "", now: NOW })).toBe(false);
    expect(isDormantKith({ lastSpokenAt: "junk", now: NOW })).toBe(false);
  });
});

describe("displayTier", () => {
  it("kith class overrides the stored tier; otherwise stored tier passes through", () => {
    expect(displayTier("monitor", "kith")).toBe("kith");
    expect(displayTier("hot", "")).toBe("hot");
    expect(displayTier("", "")).toBe("cold");
  });
});
