import { describe, it, expect, vi } from "vitest";

// rescore-contact imports supabase at module load for loadContactTags. We test
// only the pure rescoreContact path, so stub the client to a no-op — never
// import next-auth here (it pulls next/server).
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { rescoreContact } from "./rescore-contact";
import type { UserPrefs } from "./user-prefs";

const prefs = (overrides: Partial<UserPrefs> = {}): UserPrefs => ({
  university: "",
  highSchool: "",
  hometown: "",
  greekOrg: "",
  targetIndustries: [],
  targetFirms: [],
  targetLocations: [],
  clubs: [],
  recruitingDate: null,
  weeklyGoalTarget: 3,
  ...overrides,
});

describe("rescoreContact", () => {
  it("keeps tag-driven affiliations on recompute (enrich-wipes-tags regression)", () => {
    // greekOrg matches ONLY via the manual tag — proves tags are threaded in.
    const contact = {
      name: "Jordan Lee",
      education: "Some State University",
      location: "",
      firmName: "Acme Co",
      title: "Analyst",
      industry: "",
      seniorityLevel: "",
    };
    const withTags = rescoreContact(contact, prefs({ greekOrg: "Chi Phi" }), [
      "chi phi",
    ]);
    expect(withTags.affiliations.some((a) => a.name === "Same Greek Org")).toBe(true);

    // Same row, no tags → the tag-driven affiliation disappears. This is the
    // exact delta the old tag-less enrich recompute silently caused.
    const noTags = rescoreContact(contact, prefs({ greekOrg: "Chi Phi" }), []);
    expect(noTags.affiliations.some((a) => a.name === "Same Greek Org")).toBe(false);
    expect(withTags.score).toBeGreaterThan(noTags.score);
  });

  it("scores highSchool/clubs/passions columns off the contact row", () => {
    const contact = {
      name: "Sam R",
      education: "",
      location: "",
      firmName: "",
      title: "",
      highSchool: "East Chapel Hill High School",
      clubs: "chi phi intramurals",
    };
    const result = rescoreContact(
      contact,
      prefs({ highSchool: "East Chapel Hill", greekOrg: "Chi Phi" }),
      [],
    );
    expect(result.affiliations.some((a) => a.name === "Same High School")).toBe(true);
    expect(result.affiliations.some((a) => a.name === "Same Greek Org")).toBe(true);
  });

  it("threads the greekOrg column into Same Greek Org", () => {
    // greekOrg matches ONLY via the contact's greekOrg column (no tags, no
    // clubs, no education) — proves the column reaches detectAffiliations.
    const contact = {
      name: "Casey M",
      education: "",
      location: "",
      firmName: "",
      title: "",
      greekOrg: "Chi Phi",
    };
    const withOrg = rescoreContact(contact, prefs({ greekOrg: "Chi Phi" }), []);
    expect(withOrg.affiliations.some((a) => a.name === "Same Greek Org")).toBe(true);

    const noOrg = rescoreContact(
      { ...contact, greekOrg: "" },
      prefs({ greekOrg: "Chi Phi" }),
      [],
    );
    expect(noOrg.affiliations.some((a) => a.name === "Same Greek Org")).toBe(false);
  });
});
