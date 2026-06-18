import { describe, expect, it } from "vitest";
import { poolRankBonus } from "./pool-rank";
import type { UserPrefs } from "../user-prefs";

const prefsWith = (overrides: Partial<UserPrefs> = {}): UserPrefs =>
  ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    educations: [],
    experiences: [],
    clubMemberships: [],
    recruitingDate: null,
    graduationYear: null,
    weeklyGoalTarget: 3,
    ...overrides,
  }) as UserPrefs;

describe("poolRankBonus()", () => {
  it("returns 0 when nothing matches", () => {
    expect(poolRankBonus({}, prefsWith(), "alumni")).toBe(0);
    expect(poolRankBonus({}, prefsWith(), "student")).toBe(0);
    expect(poolRankBonus({}, prefsWith(), "professor")).toBe(0);
  });

  it("is null-safe against non-string contact fields", () => {
    const contact = { greekOrg: 42, university: null, firmName: undefined, industry: {} };
    const prefs = prefsWith({ greekOrg: "Sigma Chi", university: "UNC" });
    expect(poolRankBonus(contact, prefs, "alumni")).toBe(0);
  });

  it("alumni: rewards shared greek, same college, target firm, target industry", () => {
    const prefs = prefsWith({
      greekOrg: "Sigma Chi",
      university: "UNC",
      targetFirms: ["Goldman Sachs"],
      targetIndustries: ["Investment Banking"],
    });
    const full = poolRankBonus(
      {
        greekOrg: "Sigma Chi",
        university: "UNC",
        firmName: "Goldman Sachs",
        industry: "Investment Banking",
      },
      prefs,
      "alumni",
    );
    // All four core signals fire and stack.
    expect(full).toBeGreaterThan(
      poolRankBonus({ greekOrg: "Sigma Chi" }, prefs, "alumni"),
    );
    expect(full).toBeGreaterThan(0);
  });

  it("alumni: target firm matches on substring (firm contains pref)", () => {
    const prefs = prefsWith({ targetFirms: ["Goldman"] });
    expect(
      poolRankBonus({ firmName: "Goldman Sachs & Co" }, prefs, "alumni"),
    ).toBeGreaterThan(0);
  });

  it("alumni: hometown does NOT count (narrow pool)", () => {
    const prefs = prefsWith({ hometown: "Charlotte" });
    expect(poolRankBonus({ hometown: "Charlotte" }, prefs, "alumni")).toBe(0);
  });

  it("student: hometown DOES count on top of the core signals (broad pool)", () => {
    const prefs = prefsWith({ greekOrg: "Sigma Chi", hometown: "Charlotte" });
    const withHometown = poolRankBonus(
      { greekOrg: "Sigma Chi", hometown: "Charlotte" },
      prefs,
      "student",
    );
    const withoutHometown = poolRankBonus(
      { greekOrg: "Sigma Chi" },
      prefs,
      "student",
    );
    expect(withHometown).toBeGreaterThan(withoutHometown);
  });

  it("professor: rewards teaching at the user's school", () => {
    const prefs = prefsWith({ university: "UNC" });
    const sameSchool = poolRankBonus(
      { firmName: "UNC", title: "Professor" },
      prefs,
      "professor",
    );
    const otherSchool = poolRankBonus(
      { firmName: "Duke", title: "Professor" },
      prefs,
      "professor",
    );
    expect(sameSchool).toBeGreaterThan(otherSchool);
  });

  it("professor: full professor outranks a lecturer", () => {
    const prefs = prefsWith();
    const full = poolRankBonus({ title: "Professor of Finance" }, prefs, "professor");
    const lecturer = poolRankBonus({ title: "Lecturer" }, prefs, "professor");
    const adjunct = poolRankBonus({ title: "Adjunct Professor" }, prefs, "professor");
    expect(full).toBeGreaterThan(lecturer);
    expect(full).toBeGreaterThan(adjunct);
  });

  it("professor: field-to-target matches a target industry via title/industry", () => {
    const prefs = prefsWith({ targetIndustries: ["Finance"] });
    expect(
      poolRankBonus({ title: "Professor of Finance" }, prefs, "professor"),
    ).toBeGreaterThan(poolRankBonus({ title: "Professor of History" }, prefs, "professor"));
  });

  it("is deterministic for the same input", () => {
    const prefs = prefsWith({ greekOrg: "Sigma Chi", university: "UNC" });
    const contact = { greekOrg: "Sigma Chi", university: "UNC" };
    expect(poolRankBonus(contact, prefs, "alumni")).toBe(
      poolRankBonus(contact, prefs, "alumni"),
    );
  });
});
