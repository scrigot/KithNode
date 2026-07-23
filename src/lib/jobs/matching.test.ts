import { describe, expect, it } from "vitest";
import { classifyInternshipListing, extractJobConcepts, inferTargetSummer, inferUndergraduateStage, isCurrentUndergraduateProfile } from "./matching";

describe("job evidence concept matching", () => {
  it("retains finance and AI skills captured from profile content", () => {
    const profile = JSON.stringify({ sections: { skills: [
      { title: "Artificial Intelligence (AI)" },
      { title: "Generative AI" },
      { title: "Financial Modeling" },
      { title: "Valuation" },
    ] } });
    expect(extractJobConcepts(profile)).toEqual(expect.arrayContaining([
      "artificial intelligence",
      "generative ai",
      "financial modeling",
      "valuation",
    ]));
  });

  it("does not mistake letters inside unrelated words for AI or ML", () => {
    expect(extractJobConcepts("detail email retail claims")).not.toContain("artificial intelligence");
    expect(extractJobConcepts("html email")).not.toContain("machine learning");
  });
});

describe("internship eligibility", () => {
  it.each([
    ["2027 Investment Banking Summer Analyst", "summer program"],
    ["Software Engineer Intern, Summer 2027", "internship"],
    ["Data Science Co-op", "co-op"],
    ["Sophomore Leadership Program", "sophomore program"],
    ["Private Equity Off-Cycle Analyst", "off-cycle program"],
  ])("recognizes student recruiting programs: %s", (title, signal) => {
    expect(classifyInternshipListing(title)).toEqual(expect.objectContaining({ eligible: true, signal }));
  });

  it("recognizes current-student eligibility without relying on it as the primary signal", () => {
    expect(classifyInternshipListing(
      "AI Research Intern",
      "Applicants must be currently enrolled in an undergraduate program.",
    ).signal).toContain("current-student eligibility found");
  });

  it.each([
    "Staff Software Engineer",
    "Finance Manager",
    "Head of AI Strategy",
    "Investment Banking Analyst",
    "Senior Associate, Private Equity",
  ])("excludes full-time or ambiguous experienced roles: %s", (title) => {
    expect(classifyInternshipListing(title).eligible).toBe(false);
  });

  it("does not treat a full-time role as an internship because its description mentions interns", () => {
    expect(classifyInternshipListing(
      "Senior Software Engineer",
      "You will mentor interns and new graduates.",
    ).eligible).toBe(false);
  });

  it.each([
    "MBA Summer Associate",
    "PhD Research Internship",
    "Postdoctoral AI Intern",
    "Senior Software Engineer Intern",
  ])("excludes experienced and graduate-only programs: %s", (title) => {
    expect(classifyInternshipListing(title).eligible).toBe(false);
  });

  it("rejects a listed graduation window that does not include the student", () => {
    expect(classifyInternshipListing(
      "2027 Investment Banking Summer Analyst",
      "Candidates must graduate between December 2027 and June 2028.",
      { graduationYear: 2029, recruitingDate: new Date("2026-07-22T00:00:00Z") },
    )).toEqual(expect.objectContaining({ eligible: false, classYearStatus: "ineligible" }));
  });

  it("marks eligibility unverified when graduation year is missing", () => {
    expect(classifyInternshipListing("2027 Investment Banking Summer Analyst", "", {
      recruitingDate: new Date("2026-07-22T00:00:00Z"),
    })).toEqual(expect.objectContaining({
      eligible: true,
      programType: "summer_analyst",
      season: "Summer 2027",
      classYearStatus: "unverified",
    }));
  });

  it("infers the recruiting summer and undergraduate stage", () => {
    const recruitingDate = new Date("2026-07-22T00:00:00Z");
    expect(inferTargetSummer(recruitingDate)).toBe(2027);
    expect(inferUndergraduateStage(2029, recruitingDate)).toBe("sophomore");
    expect(inferUndergraduateStage(2028, recruitingDate)).toBe("junior");
  });

  it("recognizes an undergraduate profile even before graduation year setup", () => {
    expect(isCurrentUndergraduateProfile({ university: "UNC Chapel Hill", major: "Data Science" }, new Date("2026-07-22T00:00:00Z"))).toBe(true);
    expect(isCurrentUndergraduateProfile({ university: "UNC Chapel Hill", degrees: "MBA" }, new Date("2026-07-22T00:00:00Z"))).toBe(false);
  });
});
