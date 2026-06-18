import { describe, it, expect } from "vitest";
import minors from "./unc-minors.json";
import concentrations from "./unc-concentrations.json";
import majors from "./us-majors.json";
import { DEGREE_OPTIONS, ALL_DEGREES, GRAD_DEGREES } from "./preference-options";

const norm = (s: string) => s.toLowerCase().replace(/’/g, "'").trim();

describe("unc-minors pool", () => {
  it("is a nonempty deduped list with no ' Minor' suffix", () => {
    const list = minors as string[];
    expect(list.length).toBeGreaterThan(90);
    expect(new Set(list.map(norm)).size).toBe(list.length);
    expect(list.filter((m) => m.endsWith(" Minor"))).toEqual([]);
    for (const m of list) expect(m.trim().length).toBeGreaterThan(1);
  });
});

describe("unc-concentrations pool", () => {
  it("keys every concentration off a major that exists in the majors pool", () => {
    const majorSet = new Set((majors as string[]).map(norm));
    for (const key of Object.keys(concentrations)) {
      expect(majorSet.has(norm(key)), `concentration key "${key}" missing from us-majors`).toBe(true);
    }
  });

  it("every major key has a nonempty deduped concentration list", () => {
    for (const [key, list] of Object.entries(concentrations as Record<string, string[]>)) {
      expect(list.length, `${key} has no concentrations`).toBeGreaterThan(0);
      expect(new Set(list.map(norm)).size).toBe(list.length);
      for (const c of list) expect(c.trim().length).toBeGreaterThan(1);
    }
  });
});

describe("DEGREE_OPTIONS", () => {
  it("has undergrad + grad groups with no overlap and no dupes", () => {
    expect(DEGREE_OPTIONS.undergrad.length).toBeGreaterThan(4);
    expect(DEGREE_OPTIONS.grad.length).toBeGreaterThan(10);
    expect(new Set(ALL_DEGREES).size).toBe(ALL_DEGREES.length);
  });

  it("GRAD_DEGREES excludes every undergrad designation", () => {
    for (const u of DEGREE_OPTIONS.undergrad) {
      expect(GRAD_DEGREES.includes(u), `${u} leaked into GRAD_DEGREES`).toBe(false);
    }
    expect(GRAD_DEGREES).toContain("MBA");
    expect(GRAD_DEGREES).toContain("PhD");
  });
});
