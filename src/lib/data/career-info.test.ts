import { describe, it, expect } from "vitest";
import { CAREER_INFO } from "./career-info";
import { ALL_ROLES } from "./career-tracks";

describe("CAREER_INFO — coverage + completeness", () => {
  it("has an entry for every role in ALL_ROLES", () => {
    for (const role of ALL_ROLES) {
      expect(CAREER_INFO, `missing CAREER_INFO entry for "${role}"`).toHaveProperty(role);
    }
  });

  it("has no entry keys outside ALL_ROLES", () => {
    const roleSet = new Set(ALL_ROLES);
    for (const key of Object.keys(CAREER_INFO)) {
      expect(roleSet.has(key), `stray CAREER_INFO key "${key}" not in ALL_ROLES`).toBe(true);
    }
  });

  it("every entry has nonempty content in all fields", () => {
    for (const role of ALL_ROLES) {
      const info = CAREER_INFO[role];
      // String fields are nonempty after trimming.
      expect(info.summary.trim().length, `${role}.summary`).toBeGreaterThan(0);
      expect(info.timeline.trim().length, `${role}.timeline`).toBeGreaterThan(0);
      expect(info.outlook.trim().length, `${role}.outlook`).toBeGreaterThan(0);
      // Array fields are nonempty and contain only nonempty strings.
      for (const field of ["alsoKnownAs", "majors", "skills", "experience"] as const) {
        const arr = info[field];
        expect(arr.length, `${role}.${field} is empty`).toBeGreaterThan(0);
        for (const v of arr) {
          expect(v.trim().length, `${role}.${field} has a blank entry`).toBeGreaterThan(0);
        }
      }
      // Pay stages are nonempty and each carries a stage label + range.
      expect(info.pay.length, `${role}.pay is empty`).toBeGreaterThan(0);
      for (const p of info.pay) {
        expect(p.stage.trim().length, `${role}.pay stage`).toBeGreaterThan(0);
        expect(p.range.trim().length, `${role}.pay range`).toBeGreaterThan(0);
      }
    }
  });
});
