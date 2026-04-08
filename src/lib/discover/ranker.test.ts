import { describe, expect, it } from "vitest";
import { rank } from "./ranker";
import type { Signal } from "./types";

const linkedinSignal = (
  type: Signal["type"],
  label: string,
  boost: number,
  confidence = 0.95,
): Signal => ({
  type,
  label,
  boost,
  sourceUrl: "https://linkedin.com/in/example",
  confidence,
});

describe("rank()", () => {
  it("scores a fully-anchored target-firm contact in the hot tier", () => {
    const result = rank({
      title: "Analyst",
      emailConfidence: 1.0,
      signals: [
        linkedinSignal("firm-tier", "Bulge Bracket", 18),
        linkedinSignal("seniority", "Analyst", 3),
        linkedinSignal("affinity", "Target Firm", 25),
        linkedinSignal("affinity", "Same School", 15),
        linkedinSignal("affinity", "Same Greek Org", 12),
        linkedinSignal("industry", "Target Industry", 10),
      ],
    });

    expect(result.tier).toBe("hot");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("sinks low-confidence pattern-guess contacts even with one weak signal", () => {
    const result = rank({
      title: "Engineer",
      emailConfidence: 0.5,
      signals: [
        {
          type: "firm-tier",
          label: "Big 4",
          boost: 8,
          sourceUrl: "https://duckduckgo.com/?q=...",
          confidence: 0.4,
        },
      ],
    });

    expect(result.tier).toBe("cold");
    expect(result.score).toBeLessThan(40);
  });

  it("downweights senior MDs vs analysts in reachability", () => {
    const baseSignals: Signal[] = [linkedinSignal("firm-tier", "Bulge Bracket", 18)];
    const analyst = rank({ title: "Analyst", emailConfidence: 0.9, signals: baseSignals });
    const md = rank({ title: "Managing Director", emailConfidence: 0.9, signals: baseSignals });
    expect(analyst.reachability).toBeGreaterThan(md.reachability);
  });

  it("is deterministic for the same input", () => {
    const input = {
      title: "Associate",
      emailConfidence: 0.8,
      signals: [
        linkedinSignal("firm-tier", "Elite Boutique", 16),
        linkedinSignal("affinity", "Same School", 15),
      ],
    };
    expect(rank(input)).toEqual(rank(input));
  });

  it("treats empty signals as max confidence to avoid nuking the score", () => {
    const result = rank({ title: "Analyst", emailConfidence: 1.0, signals: [] });
    expect(result.confidence).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });
});
