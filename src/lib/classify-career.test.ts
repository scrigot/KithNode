import { describe, it, expect } from "vitest";
import { classifyCareer } from "./classify-career";
import { roleToTrack, ALL_ROLES, ALL_TRACKS } from "@/lib/data/career-tracks";

describe("classifyCareer — title precision (highest priority)", () => {
  it("software engineer -> CS/Tech / Software Engineering", () => {
    expect(classifyCareer({ title: "Senior Software Engineer" })).toEqual({
      track: "CS/Tech",
      role: "Software Engineering",
    });
  });

  it("software developer also maps to Software Engineering", () => {
    expect(classifyCareer({ title: "Full Stack Software Developer" })).toEqual({
      track: "CS/Tech",
      role: "Software Engineering",
    });
  });

  it("data scientist -> Data Science / Data Science", () => {
    expect(classifyCareer({ title: "Data Scientist II" })).toEqual({
      track: "Data Science",
      role: "Data Science",
    });
  });

  it("data engineer -> Data Science / Data Engineering", () => {
    expect(classifyCareer({ title: "Staff Data Engineer" })).toEqual({
      track: "Data Science",
      role: "Data Engineering",
    });
  });

  it("quant -> Data Science / Quant", () => {
    expect(classifyCareer({ title: "Quantitative Researcher" })).toEqual({
      track: "Data Science",
      role: "Quant",
    });
  });

  it("ml engineer -> AI / ML Engineer (beats generic engineer)", () => {
    expect(classifyCareer({ title: "ML Engineer" })).toEqual({
      track: "AI",
      role: "ML Engineer",
    });
  });

  it("ai engineer -> AI / AI Engineer", () => {
    expect(classifyCareer({ title: "AI Engineer, Applied" })).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("ai research -> AI / AI Research", () => {
    expect(classifyCareer({ title: "AI Researcher" })).toEqual({
      track: "AI",
      role: "AI Research",
    });
    expect(classifyCareer({ title: "ML Research Scientist" })).toEqual({
      track: "AI",
      role: "AI Research",
    });
  });

  it("product manager -> CS/Tech / Product Management", () => {
    expect(classifyCareer({ title: "Senior Product Manager" })).toEqual({
      track: "CS/Tech",
      role: "Product Management",
    });
  });

  it("investment banking / ib analyst -> Finance / Investment Banking", () => {
    expect(classifyCareer({ title: "Investment Banking Analyst" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
    expect(classifyCareer({ title: "IB Analyst" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
  });

  it("private equity / venture / trading / equity research / wealth / consultant", () => {
    expect(classifyCareer({ title: "Private Equity Associate" })).toEqual({
      track: "Finance",
      role: "Private Equity",
    });
    expect(classifyCareer({ title: "Venture Partner" })).toEqual({
      track: "Finance",
      role: "Venture Capital",
    });
    expect(classifyCareer({ title: "Equity Trader" })).toEqual({
      track: "Finance",
      role: "Sales & Trading",
    });
    expect(classifyCareer({ title: "Equity Research Associate" })).toEqual({
      track: "Finance",
      role: "Equity Research",
    });
    expect(classifyCareer({ title: "Wealth Advisor" })).toEqual({
      track: "Finance",
      role: "Wealth Management",
    });
    expect(classifyCareer({ title: "Management Consultant" })).toEqual({
      track: "Consulting",
      role: "Management Consulting",
    });
  });
});

describe("classifyCareer — firm tier fallback (only when title is silent)", () => {
  it("frontier AI lab -> AI track, empty role (title doesn't resolve role)", () => {
    expect(classifyCareer({ title: "Member of Technical Staff", firmName: "Anthropic" })).toEqual({
      track: "AI",
      role: "",
    });
  });

  it("title still wins over firm: AI engineer at Goldman stays AI", () => {
    expect(classifyCareer({ title: "AI Engineer", firmName: "Goldman Sachs" })).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("bulge bracket firm with vague title -> Finance / Investment Banking", () => {
    expect(classifyCareer({ title: "Analyst", firmName: "Goldman Sachs" })).toEqual({
      track: "Finance",
      role: "Investment Banking",
    });
  });

  it("mega PE firm -> Finance / Private Equity", () => {
    expect(classifyCareer({ title: "Associate", firmName: "Blackstone" })).toEqual({
      track: "Finance",
      role: "Private Equity",
    });
  });

  it("hedge fund firm -> Finance / Hedge Fund", () => {
    expect(classifyCareer({ title: "Analyst", firmName: "Citadel" })).toEqual({
      track: "Finance",
      role: "Hedge Fund",
    });
  });

  it("MBB firm -> Consulting / Management Consulting", () => {
    expect(classifyCareer({ title: "Associate", firmName: "McKinsey & Company" })).toEqual({
      track: "Consulting",
      role: "Management Consulting",
    });
  });

  it("skills can surface the AI signal when the title is vague", () => {
    expect(classifyCareer({ title: "Member of Staff", skills: "Machine Learning Engineer" })).toEqual({
      track: "AI",
      role: "ML Engineer",
    });
  });
});

describe("classifyCareer — unknown", () => {
  it("returns empty {track,role} for an unrecognized title + firm", () => {
    expect(classifyCareer({ title: "Barista", firmName: "Local Coffee Co" })).toEqual({
      track: "",
      role: "",
    });
  });

  it("returns empty for all-empty input", () => {
    expect(classifyCareer({})).toEqual({ track: "", role: "" });
  });
});

describe("career-tracks helpers", () => {
  it("roleToTrack maps every role to a valid track and unknowns to ''", () => {
    for (const role of ALL_ROLES) {
      expect(ALL_TRACKS).toContain(roleToTrack(role));
    }
    expect(roleToTrack("Not A Real Role")).toBe("");
  });

  it("every classifier-produced role belongs to its produced track", () => {
    const c = classifyCareer({ title: "Data Engineer" });
    expect(roleToTrack(c.role)).toBe(c.track);
  });
});
