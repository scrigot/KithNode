import { describe, it, expect } from "vitest";
import { hasMetric, detectWeakOpener, hasPronoun, lintResume } from "./resume-text";
import { normalizeDoc, emptyDoc, type ResumeDocV1, type EntriesSection } from "./resume-doc";

describe("text analyzers", () => {
  it("hasMetric needs a digit + a magnitude token", () => {
    expect(hasMetric("Cut latency 40%")).toBe(true);
    expect(hasMetric("Served 2M users")).toBe(true);
    expect(hasMetric("Worked on the dashboard")).toBe(false);
    expect(hasMetric("Improved things")).toBe(false);
  });
  it("detectWeakOpener flags weak phrases", () => {
    expect(detectWeakOpener("Responsible for reporting")).toBe("responsible for");
    expect(detectWeakOpener("Helped the team ship")).toBe("helped");
    expect(detectWeakOpener("Built a RAG pipeline")).toBeNull();
  });
  it("hasPronoun flags first person", () => {
    expect(hasPronoun("I built the thing")).toBe(true);
    expect(hasPronoun("Built the thing")).toBe(false);
  });
});

describe("lintResume", () => {
  const v1: ResumeDocV1 = {
    header: { name: "", title: "", location: "", email: "", phone: "", links: [] },
    summary: "",
    experiences: [{ title: "Analyst", firm: "Acme", start: "", end: "", bullets: ["Responsible for I worked on dashboards", "Cut costs 20%"] }],
    projects: [],
    skills: [],
    education: [],
  };
  const warnings = lintResume(normalizeDoc(v1));

  it("flags missing name as an export-blocking error", () => {
    expect(warnings.some((w) => w.field === "name" && w.severity === "error")).toBe(true);
  });
  it("flags weak opener, pronoun, missing metric, and missing dates with score impact", () => {
    expect(warnings.some((w) => w.message.includes("Weak opener"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("pronoun") || w.message.includes("Drop pronouns"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("measurable outcome"))).toBe(true);
    expect(warnings.some((w) => w.field === "dates" && w.scoreImpact < 0)).toBe(true);
    expect(warnings.some((w) => w.field === "skills")).toBe(true);
  });
  it("a clean resume produces no warnings on the quantified bullet", () => {
    const w = lintResume(normalizeDoc({ ...v1, header: { ...v1.header, name: "Sam", links: ["github.com/s"] }, experiences: [{ title: "Eng", firm: "X", start: "2024", end: "Now", bullets: ["Cut latency 40% by adding caching"] }], skills: ["Python"] }));
    expect(w.some((x) => x.field === "bullet")).toBe(false);
    expect(w.some((x) => x.field === "name")).toBe(false);
  });
  it("ignores hidden sections", () => {
    const doc = emptyDoc();
    (doc.sections.find((s) => s.type === "experience") as EntriesSection).entries.push({ id: "e", title: "X", org: "Y", location: "", start: "", end: "", bullets: ["helped out"] });
    const visible = lintResume(doc).length;
    doc.sections.forEach((s) => (s.visible = false));
    expect(lintResume(doc).some((w) => w.field === "bullet")).toBe(false);
    expect(visible).toBeGreaterThan(0);
  });
});
