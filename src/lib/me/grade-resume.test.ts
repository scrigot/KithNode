import { describe, it, expect } from "vitest";
import {
  gradeResume,
  emptySignals,
  TRACK_WEIGHTS,
  TRACKS,
  type ResumeSignals,
  type Track,
} from "./grade-resume";

// Builder so each test states only the signals it cares about.
const mk = (p: Partial<ResumeSignals> = {}): ResumeSignals => ({ ...emptySignals(), ...p });

const strongAiEngineer = mk({
  header: { name: "Sam R", title: "AI Engineer", location: "Raleigh, NC", links: ["github.com/sam", "sam.dev"] },
  summary: "AI engineer shipping LLM products.",
  experiences: [
    {
      title: "AI Engineer",
      firm: "Anthropic",
      start: "2024",
      end: "Present",
      bullets: ["Built a RAG pipeline that cut latency 40%", "Deployed agents to production serving 2M requests"],
      hasMetrics: true,
    },
  ],
  projects: [{ name: "Agent X", description: "LLM agent", bullets: ["Increased accuracy 18%"], tech: ["LangChain", "PyTorch", "Pinecone"] }],
  skills: ["Python", "PyTorch", "RAG", "Embeddings"],
  education: [{ school: "UNC", degree: "BS", field: "Computer Science", gradYear: "2027" }],
  aiKeywords: ["LLM", "RAG", "agents", "embeddings"],
  deploymentSignals: ["production", "deployed", "serving"],
});

describe("gradeResume", () => {
  it("every track's weights sum to 1.0", () => {
    for (const { id } of TRACKS) {
      const sum = Object.values(TRACK_WEIGHTS[id]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("a blank resume scores ~0 with diagnostic reasons", () => {
    const g = gradeResume(emptySignals(), "ai-engineering");
    expect(g.overall).toBeLessThan(15);
    const ai = g.dimensions.find((d) => d.key === "aiFluency")!;
    expect(ai.reasons).toContain("no concrete AI tools detected");
    expect(g.deductions.some((d) => d.label.includes("AI keywords"))).toBe(true);
  });

  it("a strong AI resume scores high and surfaces evidence", () => {
    const g = gradeResume(strongAiEngineer, "ai-engineering");
    expect(g.overall).toBeGreaterThan(70);
    const exp = g.dimensions.find((d) => d.key === "relevantExperience")!;
    expect(exp.reasons.some((r) => r.includes("AI/ML-relevant"))).toBe(true);
    const brand = g.dimensions.find((d) => d.key === "brandStrength")!;
    expect(brand.reasons.some((r) => r.toLowerCase().includes("anthropic"))).toBe(true);
    expect(g.bonuses.some((b) => b.label.includes("GitHub"))).toBe(true);
  });

  it("is deterministic — same input, same output", () => {
    const a = gradeResume(strongAiEngineer, "ai-consulting");
    const b = gradeResume(strongAiEngineer, "ai-consulting");
    expect(a).toEqual(b);
  });

  it("track re-weights the same resume", () => {
    const eng = gradeResume(strongAiEngineer, "ai-engineering");
    const con = gradeResume(strongAiEngineer, "ai-consulting");
    // Same per-dimension raw scores, different weights → overall differs.
    const engImpact = eng.dimensions.find((d) => d.key === "impact")!;
    const conImpact = con.dimensions.find((d) => d.key === "impact")!;
    expect(engImpact.score).toBe(conImpact.score);
    expect(engImpact.weight).not.toBe(conImpact.weight);
  });

  it("impact dimension rises when bullets gain metrics", () => {
    const base = mk({
      experiences: [{ title: "Analyst", firm: "Acme", start: "2024", end: "2025", bullets: ["Worked on dashboards", "Helped the team"], hasMetrics: false }],
    });
    const improved = mk({
      experiences: [{ title: "Analyst", firm: "Acme", start: "2024", end: "2025", bullets: ["Cut reporting time 60%", "Grew adoption to 5000 users"], hasMetrics: true }],
    });
    const b = gradeResume(base, "ai-generalist").dimensions.find((d) => d.key === "impact")!;
    const i = gradeResume(improved, "ai-generalist").dimensions.find((d) => d.key === "impact")!;
    expect(i.score).toBeGreaterThan(b.score);
  });

  it("ATS parseability deducts for missing dates and links", () => {
    const messy = mk({
      header: { name: "", title: "", location: "", links: [] },
      experiences: [{ title: "Engineer", firm: "X", start: "", end: "", bullets: ["did things"], hasMetrics: false }],
    });
    const ats = gradeResume(messy, "ai-engineering").dimensions.find((d) => d.key === "atsParseability")!;
    expect(ats.score).toBeLessThan(60);
    expect(ats.reasons.some((r) => r.includes("name"))).toBe(true);
  });

  it("overall stays within 0-100 for all tracks", () => {
    for (const { id } of TRACKS) {
      const g = gradeResume(strongAiEngineer, id as Track);
      expect(g.overall).toBeGreaterThanOrEqual(0);
      expect(g.overall).toBeLessThanOrEqual(100);
    }
  });
});
