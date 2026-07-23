import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  classifyAffiliation,
  detectSignals,
  namesPlausiblyMatch,
} from "./signal-detector";
import type { ContactCandidate } from "./contact-finder";
import type { UserPrefs } from "@/lib/user-prefs";

const PREFS: UserPrefs = {
  university: "UNC Chapel Hill",
  highSchool: "",
  hometown: "Charlotte, NC",
  greekOrg: "Chi Phi",
  targetIndustries: ["Investment Banking"],
  targetFirms: ["Goldman Sachs"],
  targetLocations: ["New York, NY"],
  clubs: [],
  skills: [],
  pastFirms: [],
  major: "",
  minor: "",
  concentration: "",
  degrees: "",
  educations: [],
  experiences: [],
  clubMemberships: [],
  recruitingDate: null,
  weeklyGoalTarget: 3,
};

const TEAM_CONTACT: ContactCandidate = {
  name: "Alice Johnson",
  title: "Analyst",
  company: "Goldman Sachs",
  companyDomain: "gs.com",
  linkedinUrl: "",
  source: "team_page",
  sourceUrl: "https://gs.com/team",
};

const LINKEDIN_CONTACT: ContactCandidate = {
  name: "Alice Johnson",
  title: "Analyst",
  company: "Goldman Sachs",
  companyDomain: "gs.com",
  linkedinUrl: "https://linkedin.com/in/alice-j",
  source: "linkedin_search",
  sourceUrl: "https://linkedin.com/in/alice-j",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifyAffiliation", () => {
  it("classifies firm tiers", () => {
    expect(classifyAffiliation("Bulge Bracket")).toBe("firm-tier");
    expect(classifyAffiliation("Mega PE")).toBe("firm-tier");
    expect(classifyAffiliation("MBB")).toBe("firm-tier");
  });
  it("strips the (Incoming) suffix when classifying", () => {
    expect(classifyAffiliation("Bulge Bracket (Incoming)")).toBe("firm-tier");
  });
  it("classifies seniority levels", () => {
    expect(classifyAffiliation("Analyst")).toBe("seniority");
    expect(classifyAffiliation("Senior")).toBe("seniority");
  });
  it("routes Target Industry / Location / affinity correctly", () => {
    expect(classifyAffiliation("Target Industry")).toBe("industry");
    expect(classifyAffiliation("Target Location")).toBe("location");
    expect(classifyAffiliation("Target Firm")).toBe("affinity");
    expect(classifyAffiliation("Same School")).toBe("affinity");
    expect(classifyAffiliation("Same Greek Org")).toBe("affinity");
    expect(classifyAffiliation("Hometown Match")).toBe("affinity");
  });
});

describe("namesPlausiblyMatch", () => {
  it("matches identical names", () => {
    expect(namesPlausiblyMatch("Alice Johnson", "Alice Johnson")).toBe(true);
  });
  it("tolerates middle initials and case differences", () => {
    expect(namesPlausiblyMatch("Alice Johnson", "alice m johnson")).toBe(true);
  });
  it("rejects different people", () => {
    expect(namesPlausiblyMatch("Alice Johnson", "Bob Builder")).toBe(false);
  });
  it("rejects empty input", () => {
    expect(namesPlausiblyMatch("", "Alice")).toBe(false);
  });
});

describe("detectSignals: synthetic-meta path (no LinkedIn URL)", () => {
  it("emits firm-tier + seniority + affinity from team-page contact", async () => {
    const signals = await detectSignals(TEAM_CONTACT, PREFS);
    const labels = signals.map((s) => s.label);
    expect(labels).toContain("Bulge Bracket");
    expect(labels).toContain("Analyst");
    expect(labels).toContain("Target Firm");
    expect(labels).toContain("Target Industry");
    for (const s of signals) {
      expect(s.sourceUrl).toBe("https://gs.com/team");
      expect(s.confidence).toBe(0.85);
    }
  });

  it("returns empty array for a contact with no matching signals", async () => {
    const signals = await detectSignals(
      { ...TEAM_CONTACT, company: "Some Random LLC", title: "Designer" },
      PREFS,
    );
    expect(signals).toEqual([]);
  });
});

describe("detectSignals: LinkedIn navigation-only policy", () => {
  it("uses only candidate facts and preserves the reviewed source URL", async () => {
    const signals = await detectSignals(LINKEDIN_CONTACT, PREFS);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.sourceUrl).toBe("https://linkedin.com/in/alice-j");
      expect(signal.confidence).toBe(0.7);
    }
    expect(signals.map((signal) => signal.label)).toContain("Bulge Bracket");
  });
});
