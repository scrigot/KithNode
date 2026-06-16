import { describe, it, expect } from "vitest";
import {
  calculateProfileCompleteness,
  COMPLETENESS_CAP,
  type CompletenessInput,
} from "./profile-completeness";

const EMPTY: CompletenessInput = {
  university: "",
  highSchool: "",
  hometown: "",
  greekOrg: "",
  educations: [],
  targetIndustries: [],
  targetFirms: [],
  targetLocations: [],
  recruitingDate: null,
  skills: [],
  minor: "",
  experiences: [],
  clubMemberships: [],
};

const FULL: CompletenessInput = {
  university: "UNC",
  highSchool: "Some HS",
  hometown: "Charlotte",
  greekOrg: "Chi Phi",
  educations: [{}],
  targetIndustries: ["IB"],
  targetFirms: ["Goldman Sachs"],
  targetLocations: ["NYC"],
  recruitingDate: "2026-09-01",
  skills: ["Excel"],
  minor: "CS",
  experiences: [{}],
  clubMemberships: [{}],
};

describe("calculateProfileCompleteness", () => {
  it("empty profile scores 0 with all 13 atoms missing", () => {
    const r = calculateProfileCompleteness(EMPTY);
    expect(r.percent).toBe(0);
    expect(r.categories.every((c) => c.percent === 0)).toBe(true);
    expect(r.missing).toHaveLength(13);
  });

  it("full profile caps at 95, never 100, with nothing missing", () => {
    const r = calculateProfileCompleteness(FULL);
    expect(r.percent).toBe(COMPLETENESS_CAP);
    expect(r.percent).toBeLessThan(100);
    expect(r.missing).toHaveLength(0);
    expect(r.categories.every((c) => c.percent === 100)).toBe(true);
  });

  it("university only sits low (identity-only credit)", () => {
    const r = calculateProfileCompleteness({ ...EMPTY, university: "UNC" });
    // identity 1/5 = 20% * weight 0.4 = 0.08 -> round(0.08 * 95) = 8
    expect(r.percent).toBe(8);
    expect(r.categories.find((c) => c.key === "identity")!.percent).toBe(20);
    expect(r.categories.find((c) => c.key === "targets")!.percent).toBe(0);
  });

  it("filling only Targets reflects that category's weight", () => {
    const r = calculateProfileCompleteness({
      ...EMPTY,
      targetIndustries: ["IB"],
      targetFirms: ["GS"],
      targetLocations: ["NYC"],
      recruitingDate: "2026-09-01",
    });
    // targets 4/4 = 100% * 0.35 = 0.35 -> round(0.35 * 95) = 33
    expect(r.percent).toBe(33);
    expect(r.categories.find((c) => c.key === "targets")!.percent).toBe(100);
  });

  it("missing list names unfilled atoms only", () => {
    const r = calculateProfileCompleteness({ ...EMPTY, university: "UNC", skills: ["Excel"] });
    expect(r.missing).not.toContain("school");
    expect(r.missing).not.toContain("skills");
    expect(r.missing).toContain("target firms");
  });

  it("whitespace-only strings do not count as filled", () => {
    const r = calculateProfileCompleteness({ ...EMPTY, university: "   " });
    expect(r.percent).toBe(0);
  });
});
