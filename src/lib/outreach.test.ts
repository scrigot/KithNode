import { describe, it, expect } from "vitest";
import { generateOutreachDraft, OutreachContext } from "./outreach";

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
