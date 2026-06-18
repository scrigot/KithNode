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

  it("ranks an alumnus above a current student identical on firm/title/email", () => {
    const base = {
      title: "Analyst",
      emailConfidence: 1.0,
      signals: [linkedinSignal("firm-tier", "Bulge Bracket", 18)],
    };
    const thisYear = new Date().getFullYear();

    // By source category: discover_run/linkedin → alumni, club → student.
    const alumnusBySource = rank({ ...base, source: "linkedin_csv" });
    const studentBySource = rank({ ...base, source: "unc_greek_clubs" });
    expect(alumnusBySource.score).toBeGreaterThan(studentBySource.score);

    // By grad year: a clearly-graduated year beats a current student.
    const alumnusByYear = rank({ ...base, graduationYear: thisYear - 5 });
    const studentByYear = rank({ ...base, graduationYear: thisYear });
    expect(alumnusByYear.score).toBeGreaterThan(studentByYear.score);

    // A very-recent grad (within ~1 year) is treated as a student.
    const recentGrad = rank({ ...base, graduationYear: thisYear - 1 });
    expect(recentGrad.score).toBeLessThan(alumnusByYear.score);
    expect(recentGrad.score).toBe(studentByYear.score);
  });

  it("applies ALUMNI_BOOST (+5) and STUDENT_PENALTY (-8) relative to neutral", () => {
    const base = {
      title: "Analyst",
      emailConfidence: 1.0,
      signals: [linkedinSignal("firm-tier", "Bulge Bracket", 18)],
    };
    // No source / unknown source / professor are neutral (no recency weight).
    const neutral = rank(base);
    expect(rank({ ...base, source: "unknown_src" }).score).toBe(neutral.score);
    expect(rank({ ...base, source: "professor" }).score).toBe(neutral.score);

    const alum = rank({ ...base, source: "linkedin_csv" });
    const student = rank({ ...base, source: "unc_greek_clubs" });
    expect(alum.score).toBeGreaterThan(neutral.score);
    expect(student.score).toBeLessThan(neutral.score);

    // Closed form for this fixture: base = 30 + 18(±boost), reachability = 100
    // (verified email + Analyst), confidence = 0.95 (single 0.95 signal).
    //   score = round((30 + 18 + boost) * 0.85 + 100 * 0.15) * 0.95)
    const scoreFor = (boost: number) =>
      Math.round(((48 + boost) * 0.85 + 100 * 0.15) * 0.95);
    expect(alum.score).toBe(scoreFor(5)); // +ALUMNI_BOOST
    expect(student.score).toBe(scoreFor(-8)); // -STUDENT_PENALTY
    expect(neutral.score).toBe(scoreFor(0));
  });

  it("coerces non-finite emailConfidence to a finite score and valid tier", () => {
    const validTiers = ["hot", "warm", "monitor", "cold"];
    const signals = [linkedinSignal("firm-tier", "Bulge Bracket", 18)];

    for (const bad of [NaN, undefined as unknown as number]) {
      const result = rank({ title: "Analyst", emailConfidence: bad, signals });
      expect(Number.isFinite(result.score)).toBe(true);
      expect(Number.isFinite(result.reachability)).toBe(true);
      expect(validTiers).toContain(result.tier);
    }

    // A NaN emailConfidence must behave like 0 (no email evidence), so it
    // scores strictly below the same contact with a fully-verified email.
    const nanResult = rank({ title: "Analyst", emailConfidence: NaN, signals });
    const verified = rank({ title: "Analyst", emailConfidence: 1.0, signals });
    expect(nanResult.reachability).toBeLessThan(verified.reachability);
  });
});
