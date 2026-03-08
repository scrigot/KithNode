import { describe, it, expect } from "vitest";
import { scoreConnection, ScoringUser, ScoringAlumni } from "./scoring";

const baseUser: ScoringUser = {
  university: "UNC Chapel Hill",
  targetIndustry: "Investment Banking",
  graduationYear: 2025,
};

const baseAlumni: ScoringAlumni = {
  university: "Duke University",
  graduationYear: 2018,
  firmName: "Some Unknown Firm",
};

describe("scoreConnection", () => {
  it("returns base score for no matching factors", () => {
    // No shared university, no shared decade, no industry match
    // Only firm prestige tier 3 (+10)
    const score = scoreConnection(baseUser, baseAlumni);
    expect(score).toBe(10);
  });

  it("adds +20 for shared university", () => {
    const alumni = { ...baseAlumni, university: "UNC Chapel Hill" };
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(30); // 20 (university) + 10 (tier 3)
  });

  it("shared university comparison is case-insensitive", () => {
    const alumni = { ...baseAlumni, university: "unc chapel hill" };
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(30);
  });

  it("adds +10 for shared graduation decade", () => {
    const alumni = { ...baseAlumni, graduationYear: 2023 };
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(20); // 10 (decade) + 10 (tier 3)
  });

  it("does not add decade bonus when decades differ", () => {
    const alumni = { ...baseAlumni, graduationYear: 2018 };
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(10); // only tier 3
  });

  it("skips decade scoring when user has no graduation year", () => {
    const user = { ...baseUser, graduationYear: undefined };
    const alumni = { ...baseAlumni, graduationYear: 2025 };
    const score = scoreConnection(user, alumni);
    expect(score).toBe(10); // only tier 3
  });

  it("adds +15 for same industry", () => {
    const alumni = { ...baseAlumni, firmName: "Goldman Sachs" };
    // Goldman is IB + tier 1 (25) + same industry (15) = 40
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(40);
  });

  it("does not add industry bonus when industries differ", () => {
    const user = { ...baseUser, targetIndustry: "Consulting" };
    const alumni = { ...baseAlumni, firmName: "Goldman Sachs" };
    // Goldman is IB, user targets Consulting -> no industry match
    // tier 1 (25) only
    const score = scoreConnection(user, alumni);
    expect(score).toBe(25);
  });

  it("adds +25 for tier 1 firm prestige", () => {
    const alumni = { ...baseAlumni, firmName: "McKinsey & Company" };
    // User targets IB, McKinsey is Consulting -> no industry match
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(25);
  });

  it("adds +18 for tier 2 firm prestige", () => {
    const alumni = { ...baseAlumni, firmName: "Deloitte" };
    const score = scoreConnection(baseUser, alumni);
    expect(score).toBe(18);
  });

  it("adds +10 for tier 3 (unknown) firm", () => {
    const score = scoreConnection(baseUser, baseAlumni);
    expect(score).toBe(10);
  });

  it("adds +5 per mutual connection, max 20", () => {
    const score1 = scoreConnection(baseUser, baseAlumni, 1);
    expect(score1).toBe(15); // 10 (tier 3) + 5

    const score3 = scoreConnection(baseUser, baseAlumni, 3);
    expect(score3).toBe(25); // 10 + 15

    const score4 = scoreConnection(baseUser, baseAlumni, 4);
    expect(score4).toBe(30); // 10 + 20 (max)

    const score10 = scoreConnection(baseUser, baseAlumni, 10);
    expect(score10).toBe(30); // 10 + 20 (capped)
  });

  it("caps total score at 100", () => {
    const user: ScoringUser = {
      university: "UNC Chapel Hill",
      targetIndustry: "Investment Banking",
      graduationYear: 2020,
    };
    const alumni: ScoringAlumni = {
      university: "UNC Chapel Hill",
      graduationYear: 2020,
      firmName: "Goldman Sachs",
    };
    // 20 (uni) + 10 (decade) + 15 (industry) + 25 (tier 1) + 20 (mutual) = 90
    const score = scoreConnection(user, alumni, 4);
    expect(score).toBe(90);

    // With 10 mutual connections -> 20 (uni) + 10 + 15 + 25 + 20 = 90 (mutual capped at 20)
    const score2 = scoreConnection(user, alumni, 10);
    expect(score2).toBe(90);
  });

  it("combines all factors correctly", () => {
    const user: ScoringUser = {
      university: "UNC Chapel Hill",
      targetIndustry: "Private Equity",
      graduationYear: 2020,
    };
    const alumni: ScoringAlumni = {
      university: "UNC Chapel Hill",
      graduationYear: 2021,
      firmName: "KKR",
    };
    // 20 (uni) + 10 (decade: both 202x) + 15 (PE match) + 25 (tier 1) = 70
    const score = scoreConnection(user, alumni, 2);
    expect(score).toBe(80); // + 10 mutual
  });
});
