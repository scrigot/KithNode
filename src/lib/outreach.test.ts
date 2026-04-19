import { describe, it, expect } from "vitest";
import { generateOutreachDraft, getLastName, OutreachContext } from "./outreach";

const baseContext: OutreachContext = {
  userName: "John Smith",
  userUniversity: "UNC Chapel Hill",
  userTargetIndustry: "Investment Banking",
  alumniName: "Jane Doe",
  alumniTitle: "Vice President",
  alumniFirm: "Goldman Sachs",
  alumniUniversity: "Duke University",
  strengthScore: 65,
};

describe("generateOutreachDraft", () => {
  it("returns a non-empty string", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft.length).toBeGreaterThan(0);
  });

  it("includes the alumni first name", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("Jane");
  });

  it("includes the user name", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("John Smith");
  });

  it("mentions the firm when available", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("Goldman Sachs");
  });

  it("mentions the alumni title", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("Vice President");
  });

  it("uses shared university opener when universities match", () => {
    const ctx = { ...baseContext, alumniUniversity: "UNC Chapel Hill" };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("fellow UNC Chapel Hill alum");
  });

  it("uses generic opener when universities differ", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).not.toContain("fellow");
    expect(draft).toContain("student at UNC Chapel Hill");
  });

  it("includes a call-to-action ask", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("15-minute call");
  });

  it("includes a closing with user name", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("Best,");
    expect(draft).toContain("John Smith");
  });

  it("mentions the target industry", () => {
    const draft = generateOutreachDraft(baseContext);
    expect(draft).toContain("Investment Banking");
  });

  it("handles missing firm gracefully", () => {
    const ctx = { ...baseContext, alumniFirm: "" };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("Vice President");
    expect(draft.length).toBeGreaterThan(0);
  });

  it("handles missing university gracefully", () => {
    const ctx = { ...baseContext, userUniversity: "" };
    const draft = generateOutreachDraft(ctx);
    expect(draft.length).toBeGreaterThan(0);
  });
});

const baseProfCtx: OutreachContext = {
  userName: "John Smith",
  userUniversity: "UNC Chapel Hill",
  userTargetIndustry: "Finance",
  alumniName: "Eric Ghysels",
  alumniTitle: "Professor",
  alumniFirm: "",
  alumniUniversity: "UNC Chapel Hill",
  strengthScore: 70,
  alumniSource: "professor",
  researchAreas: ["financial econometrics", "machine learning", "high-frequency data"],
  department: "UNC Finance",
};

describe("getLastName", () => {
  it("extracts last name from full name", () => {
    expect(getLastName("Eric Ghysels")).toBe("Ghysels");
  });

  it("ignores Jr. suffix and returns preceding name", () => {
    expect(getLastName("Elena Ramirez Jr.")).toBe("Ramirez");
  });

  it("returns empty string for empty input", () => {
    expect(getLastName("")).toBe("");
  });

  it("returns the only word for a single-word name", () => {
    expect(getLastName("Madonna")).toBe("Madonna");
  });
});

describe("generateOutreachDraft — professor templates", () => {
  it("research-heavy: opener, ask, and closing appear", () => {
    const ctx: OutreachContext = { ...baseProfCtx, profType: "research-heavy" };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("Hi Professor Ghysels");
    expect(draft).toContain("deeply interested in financial econometrics");
    expect(draft).toContain("20-minute conversation");
    expect(draft).toContain("Best,\nJohn Smith");
  });

  it("research-heavy: cites recentPaper when provided", () => {
    const ctx: OutreachContext = {
      ...baseProfCtx,
      profType: "research-heavy",
      recentPaper: "MIDAS Regressions",
    };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("MIDAS Regressions");
  });

  it("teaching-heavy: opener, ask, and closing appear", () => {
    const ctx: OutreachContext = { ...baseProfCtx, profType: "teaching-heavy" };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("Hi Professor Ghysels");
    expect(draft).toContain("considering enrolling in your course");
    expect(draft).toContain("15 minutes");
    expect(draft).toContain("Best,\nJohn Smith");
  });

  it("mixed (explicit): opener, ask, and closing appear", () => {
    const ctx: OutreachContext = { ...baseProfCtx, profType: "mixed" };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("Hi Professor Ghysels");
    expect(draft).toContain("strong interest in financial econometrics");
    expect(draft).toContain("15 minutes");
    expect(draft).toContain("Best,\nJohn Smith");
  });

  it("profType undefined defaults to mixed template", () => {
    const ctx: OutreachContext = { ...baseProfCtx, profType: undefined };
    const draft = generateOutreachDraft(ctx);
    expect(draft).toContain("strong interest in");
    expect(draft).toContain("15 minutes");
  });

  it("alumniSource omitted defaults to alumni path (backward compat)", () => {
    const ctx: OutreachContext = { ...baseContext };
    const draft = generateOutreachDraft(ctx);
    // Alumni path uses first name, not "Professor"
    expect(draft).toContain("Jane");
    expect(draft).not.toContain("Professor");
    expect(draft).toContain("15-minute call");
  });
});
