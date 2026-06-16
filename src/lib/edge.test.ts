import { describe, it, expect } from "vitest";
import {
  computeEdge,
  personTraits,
  viewerTargetTracks,
  parseSkillsField,
  type EdgePerson,
  type EdgeDimension,
} from "./edge";

// Build a cohort person carrying a single dimension's traits (others empty).
function person(id: string, name: string, dim: EdgeDimension, traits: string[]): EdgePerson {
  const base: Record<EdgeDimension, string[]> = { skills: [], clubs: [], experiences: [] };
  return { id, name, traits: { ...base, [dim]: traits } };
}
const emptyViewer: Record<EdgeDimension, string[]> = { skills: [], clubs: [], experiences: [] };

describe("computeEdge", () => {
  it("flags traits clearing both floors, lists holders, sorts by support", () => {
    // 6-person cohort, 4 with skills data. Support is measured among the 4
    // ELIGIBLE (with-data), not all 6. Excel: 4/4. Modeling: 3/4. Rare: 2/4.
    const cohort = [
      person("1", "A", "skills", ["Excel", "Modeling"]),
      person("2", "B", "skills", ["Excel", "Modeling"]),
      person("3", "C", "skills", ["Excel", "Modeling", "Rare"]),
      person("4", "D", "skills", ["Excel", "Rare"]),
      person("5", "E", "skills", []),
      person("6", "F", "skills", []),
    ];
    const res = computeEdge({ viewer: emptyViewer, cohort });
    expect(res.enoughCohort).toBe(true);
    expect(res.cohortSize).toBe(6);
    expect(res.dimensionEligible.skills).toBe(4);
    const traits = res.gaps.map((g) => g.trait);
    expect(traits).toEqual(["Excel", "Modeling"]); // Rare dropped (2 holders < 3)
    expect(res.gaps[0].holderCount).toBe(4);
    expect(res.gaps[0].eligibleCount).toBe(4);
    expect(res.gaps[0].support).toBeCloseTo(1.0, 2);
    expect(res.gaps[1].support).toBeCloseTo(0.75, 2); // Modeling 3/4
    expect(res.gaps[0].holders.map((h) => h.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("measures prevalence among contacts WITH data, not the whole cohort", () => {
    // 10-person cohort, only 3 have skills on file — all 3 share "Excel".
    // Whole-cohort support would be 3/10=30% and drop it; eligible support is
    // 3/3=100% so it correctly surfaces. This is the sparse-import fix.
    const cohort = [
      person("1", "A", "skills", ["Excel"]),
      person("2", "B", "skills", ["Excel"]),
      person("3", "C", "skills", ["Excel"]),
      ...Array.from({ length: 7 }, (_, i) => person(`e${i}`, "x", "skills", [])),
    ];
    const res = computeEdge({ viewer: emptyViewer, cohort });
    expect(res.cohortSize).toBe(10);
    expect(res.dimensionEligible.skills).toBe(3);
    expect(res.gaps.map((g) => g.trait)).toEqual(["Excel"]);
    expect(res.gaps[0]).toMatchObject({ holderCount: 3, eligibleCount: 3 });
    expect(res.gaps[0].support).toBeCloseTo(1.0, 2);
  });

  it("never flags a trait the viewer already has (case-insensitive)", () => {
    const cohort = Array.from({ length: 6 }, (_, i) => person(String(i), "x", "skills", ["Excel"]));
    const res = computeEdge({
      viewer: { ...emptyViewer, skills: ["excel"] },
      cohort,
    });
    expect(res.gaps).toHaveLength(0);
  });

  it("returns enoughCohort=false and no gaps below the cohort floor", () => {
    const cohort = Array.from({ length: 4 }, (_, i) => person(String(i), "x", "skills", ["Excel"]));
    const res = computeEdge({ viewer: emptyViewer, cohort });
    expect(res.enoughCohort).toBe(false);
    expect(res.gaps).toHaveLength(0);
  });

  it("respects custom thresholds", () => {
    const cohort = Array.from({ length: 5 }, (_, i) =>
      person(String(i), "x", "clubs", i < 2 ? ["Chess"] : []),
    );
    // 2/5 = 40%. Default would drop it; loosen both floors so it passes.
    const res = computeEdge({ viewer: emptyViewer, cohort, minHolders: 2, minSupport: 0.4 });
    expect(res.gaps.map((g) => g.trait)).toEqual(["Chess"]);
  });
});

describe("personTraits", () => {
  it("dedupes traits case-insensitively across a dimension", () => {
    const t = personTraits({ skills: '["Foozle","foozle","FOOZLE"]' });
    expect(t.skills).toHaveLength(1);
  });

  it("reads structured club memberships, falling back to the flat clubs column", () => {
    const structured = personTraits({
      clubMemberships: '[{"club":"Investment Club","role":"VP"}]',
    });
    expect(structured.clubs).toEqual(["Investment Club"]);

    const flat = personTraits({ clubMemberships: "", clubs: "Finance Club, Chess Club" });
    expect(flat.clubs).toEqual(["Finance Club", "Chess Club"]);
  });

  it("classifies experiences to roles and excludes only the viewer's bullseye role", () => {
    const raw = {
      experiences:
        '[{"title":"Investment Banking Summer Analyst","firm":"GS"},{"title":"Private Equity Analyst","firm":"Blackstone"}]',
    };
    // Without exclusion both Finance roles appear.
    expect(personTraits(raw).experiences.sort()).toEqual(
      ["Investment Banking", "Private Equity"].sort(),
    );
    // Excluding the IB bullseye role drops IB but KEEPS the same-track PE role —
    // that's the aspirational gap an IB-targeting student should still see.
    expect(personTraits(raw, { excludeExperienceRoles: ["Investment Banking"] }).experiences).toEqual([
      "Private Equity",
    ]);
  });
});

describe("viewerTargetTracks", () => {
  it("maps free-text targets onto the track taxonomy and dedupes", () => {
    expect(viewerTargetTracks(["Investment Banking", "Private Equity"])).toEqual(["Finance"]);
    expect(viewerTargetTracks([], "Management Consulting")).toEqual(["Consulting"]);
    expect(viewerTargetTracks(["something unclassifiable"])).toEqual([]);
  });
});

describe("parseSkillsField", () => {
  it("parses both a JSON array string and a comma list", () => {
    expect(parseSkillsField('["Python","Excel"]')).toEqual(["Python", "Excel"]);
    expect(parseSkillsField("Python, Excel")).toEqual(["Python", "Excel"]);
    expect(parseSkillsField("")).toEqual([]);
  });
});
