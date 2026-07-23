import { describe, it, expect } from "vitest";
import { matchesContactSearch, matchesTrackRole, countByTrack } from "./contacts-list";

// Minimal contact shapes — the helpers only read track + role.
const c = (track: string, role: string) => ({ track, role });

describe("matchesTrackRole — Warm Signals tab predicate", () => {
  it("ALL (empty track) matches everything", () => {
    expect(matchesTrackRole(c("AI", "AI Engineer"), "", "")).toBe(true);
    expect(matchesTrackRole(c("", ""), "", "")).toBe(true);
  });

  it("a track filter matches contacts in that track, any role", () => {
    expect(matchesTrackRole(c("AI", "ML Engineer"), "AI", "")).toBe(true);
    expect(matchesTrackRole(c("Finance", "Investment Banking"), "AI", "")).toBe(false);
  });

  it("a role sub-chip narrows to that exact role within the track", () => {
    expect(matchesTrackRole(c("AI", "AI Engineer"), "AI", "AI Engineer")).toBe(true);
    expect(matchesTrackRole(c("AI", "ML Engineer"), "AI", "AI Engineer")).toBe(false);
  });

  it("an unclassified contact (empty track) is excluded once a track is selected", () => {
    expect(matchesTrackRole(c("", ""), "AI", "")).toBe(false);
  });
});

describe("countByTrack — tab label counts", () => {
  it("counts contacts per track and ignores unclassified", () => {
    const counts = countByTrack([
      c("AI", "AI Engineer"),
      c("AI", "ML Engineer"),
      c("Finance", "Investment Banking"),
      c("", ""),
    ]);
    expect(counts).toEqual({ AI: 2, Finance: 1 });
  });

  it("returns an empty map for no contacts", () => {
    expect(countByTrack([])).toEqual({});
  });
});

describe("matchesContactSearch", () => {
  const contact = {
    name: "Arth Vijaywargia",
    title: "Junior Solutions Architect",
    skills: "Artificial Intelligence (AI), Generative AI, Financial Modeling",
    company: { name: "Red Hat", location: "Raleigh", industry_tags: [] },
  };

  it("finds contacts by AI and finance skills", () => {
    expect(matchesContactSearch(contact, "generative ai")).toBe(true);
    expect(matchesContactSearch(contact, "financial modeling")).toBe(true);
  });
});
