import { describe, it, expect } from "vitest";
import {
  resumeSignalsSchema,
  toResumeSignals,
  signalsFromContent,
  signalsFromDoc,
  validateResumePdf,
} from "./resume-signals";
import { gradeResume } from "./grade-resume";
import { emptyDoc, emptySection, type EntriesSection, type SkillsSection } from "./resume-doc";

describe("signalsFromDoc — section model", () => {
  it("counts leadership entries as experience and excludes interests from scored skills", () => {
    const doc = emptyDoc();
    const exp = doc.sections.find((s) => s.type === "experience") as EntriesSection;
    exp.entries.push({ id: "e1", title: "AI Consultant", org: "Acme", location: "", start: "2024", end: "Now", bullets: ["Deployed an LLM agent, cut handle time 30%"] });
    const lead = emptySection("leadership", "lead-0") as EntriesSection;
    lead.entries.push({ id: "l1", title: "President", org: "AI Club", location: "", start: "2023", end: "Now", bullets: ["Grew membership 4x"] });
    doc.sections.push(lead);
    const skills = doc.sections.find((s) => s.type === "skills") as SkillsSection;
    skills.groups = [
      { category: "technical", label: "Technical", items: ["Python", "RAG"] },
      { category: "interests", label: "Interests", items: ["climbing", "chess"] },
    ];

    const sig = signalsFromDoc(doc);
    expect(sig.experiences.map((e) => e.title)).toContain("President"); // leadership counts
    expect(sig.skills).toEqual(["Python", "RAG"]); // interests excluded
    expect(sig.skills).not.toContain("climbing");
    expect(sig.aiKeywords).toContain("rag");
  });

  it("interests do not raise technicalDepth", () => {
    const base = emptyDoc();
    (base.sections.find((s) => s.type === "skills") as SkillsSection).groups = [{ category: "technical", label: "Technical", items: ["Python"] }];
    const withInterests = emptyDoc();
    (withInterests.sections.find((s) => s.type === "skills") as SkillsSection).groups = [
      { category: "technical", label: "Technical", items: ["Python"] },
      { category: "interests", label: "Interests", items: ["a", "b", "c", "d", "e"] },
    ];
    const a = gradeResume(signalsFromDoc(base), "ai-engineering").dimensions.find((d) => d.key === "technicalDepth")!;
    const b = gradeResume(signalsFromDoc(withInterests), "ai-engineering").dimensions.find((d) => d.key === "technicalDepth")!;
    expect(b.score).toBe(a.score);
  });
});

describe("validateResumePdf (re-exported)", () => {
  it("rejects a non-PDF and accepts %PDF magic bytes", () => {
    expect(validateResumePdf("").ok).toBe(false);
    const notPdf = Buffer.from("hello").toString("base64");
    expect(validateResumePdf(notPdf).ok).toBe(false);
    const pdf = Buffer.from("%PDF-1.7\n...").toString("base64");
    expect(validateResumePdf(pdf).ok).toBe(true);
  });
});

describe("resumeSignalsSchema", () => {
  it("parses a minimal valid object", () => {
    const parsed = resumeSignalsSchema.safeParse({
      header: { name: "A", title: "AI Engineer", location: "NC", links: [] },
      summary: "",
      experiences: [],
      projects: [],
      skills: [],
      education: [],
      aiKeywords: [],
      deploymentSignals: [],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("signalsFromContent", () => {
  it("infers AI keywords and deployment signals from edited content", () => {
    const s = signalsFromContent({
      header: { name: "Sam", title: "AI Engineer", links: ["github.com/sam"] },
      experiences: [
        { title: "AI Engineer", firm: "Anthropic", start: "2024", end: "Present", bullets: ["Deployed a RAG agent to production, cut latency 40%"] },
      ],
      skills: ["Python", "PyTorch"],
    });
    expect(s.aiKeywords).toContain("rag");
    expect(s.aiKeywords).toContain("pytorch");
    expect(s.deploymentSignals).toContain("production");
    expect(s.deploymentSignals).toContain("deployed");
    expect(s.experiences[0].hasMetrics).toBe(true);
  });

  it("produces signals the grader can score consistently", () => {
    const s = signalsFromContent({
      header: { name: "Sam", title: "AI Engineer", links: ["github.com/sam"] },
      experiences: [{ title: "AI Engineer", firm: "OpenAI", start: "2024", end: "Now", bullets: ["Shipped LLM features used by 1M users"] }],
      skills: ["Python", "LangChain", "RAG"],
      education: [{ school: "UNC", degree: "BS", field: "Computer Science", gradYear: "2027" }],
    });
    const g = gradeResume(s, "ai-engineering");
    expect(g.overall).toBeGreaterThan(40);
    expect(g.dimensions.find((d) => d.key === "brandStrength")!.score).toBeGreaterThan(0);
  });

  it("a blank content object yields the deterministic floor", () => {
    const s = signalsFromContent({});
    expect(s.experiences).toEqual([]);
    expect(s.aiKeywords).toEqual([]);
    expect(gradeResume(s, "ai-generalist").overall).toBeLessThan(15);
  });
});

describe("toResumeSignals", () => {
  it("passes structured model output straight through", () => {
    const raw = {
      header: { name: "A", title: "B", location: "C", links: ["x"] },
      summary: "s",
      experiences: [{ title: "t", firm: "f", start: "1", end: "2", bullets: ["b"], hasMetrics: true }],
      projects: [],
      skills: ["Python"],
      education: [],
      aiKeywords: ["LLM"],
      deploymentSignals: ["production"],
    };
    expect(toResumeSignals(raw).skills).toEqual(["Python"]);
    expect(toResumeSignals(raw).experiences[0].hasMetrics).toBe(true);
  });
});
