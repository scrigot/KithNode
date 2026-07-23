import { describe, expect, it } from "vitest";
import {
  countPeopleViews,
  isWarmPath,
  personMatchesView,
  sortPeopleForView,
} from "./people-views";

const people = [
  {
    name: "Zoe Known",
    relationship_class: "kith",
    score: { fit_score: 45, engagement_score: 20, tier: "cold" },
  },
  {
    name: "Ada Stranger",
    relationship_class: "",
    score: { fit_score: 99, engagement_score: 0, tier: "hot" },
  },
  {
    name: "Maya Missing",
    relationship_class: "",
    needs_info: true,
    score: { fit_score: 60, engagement_score: 0, tier: "warm" },
  },
  {
    name: "Ari Known",
    relationship_class: "kith",
    score: { fit_score: 80, engagement_score: 5, tier: "monitor" },
  },
];

describe("People workspace views", () => {
  it("treats only a proven relationship as a warm path", () => {
    expect(isWarmPath(people[0])).toBe(true);
    expect(isWarmPath(people[1])).toBe(false);
    expect(isWarmPath(people[2])).toBe(false);
    expect(personMatchesView(people[1], "warm")).toBe(false);
  });

  it("keeps the all-people view neutral and alphabetical", () => {
    expect(sortPeopleForView(people, "all").map((person) => person.name)).toEqual([
      "Ada Stranger",
      "Ari Known",
      "Maya Missing",
      "Zoe Known",
    ]);
  });

  it("ranks warm paths by relationship activity before fit", () => {
    const warm = sortPeopleForView(
      people.filter((person) => personMatchesView(person, "warm")),
      "warm",
    );
    expect(warm.map((person) => person.name)).toEqual([
      "Zoe Known",
      "Ari Known",
    ]);
  });

  it("reports distinct counts for each view", () => {
    expect(countPeopleViews(people)).toEqual({
      all: 4,
      warm: 2,
      needs_info: 1,
    });
  });
});
