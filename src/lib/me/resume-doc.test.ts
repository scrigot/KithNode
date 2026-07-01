import { describe, it, expect } from "vitest";
import { normalizeDoc, emptyDoc, emptySection, type ResumeDocV1, type ResumeDoc, type EntriesSection, type SkillsSection, type EducationSection } from "./resume-doc";

// The real persisted V1 shape (mirrors the row saved by the original builder).
const v1: ResumeDocV1 = {
  header: { name: "Sam Rigot", title: "AI Engineer", location: "Chapel Hill, NC", email: "sam@x.com", phone: "", links: ["github.com/sam"] },
  summary: "AI engineer shipping LLM products.",
  experiences: [{ title: "AI Engineer", firm: "Anthropic", start: "2024", end: "Present", bullets: ["Built a RAG pipeline", "Deployed agents"] }],
  projects: [{ name: "Agent X", description: "LLM agent", bullets: ["Increased accuracy 18%"], tech: ["LangChain", "PyTorch"] }],
  skills: ["Python", "PyTorch", "RAG"],
  education: [{ school: "UNC", degree: "BS", field: "Computer Science", gradYear: "2027" }],
};

describe("normalizeDoc — V1 → V2 migration", () => {
  const doc = normalizeDoc(v1);

  it("produces a valid V2 doc", () => {
    expect(doc.version).toBe(2);
    expect(Array.isArray(doc.sections)).toBe(true);
    expect(doc.header.name).toBe("Sam Rigot");
    expect(doc.header.links).toEqual(["github.com/sam"]);
  });

  it("is lossless — every V1 field survives", () => {
    const summary = doc.sections.find((s) => s.type === "summary");
    expect(summary && summary.kind === "text" && summary.body).toBe("AI engineer shipping LLM products.");

    const exp = doc.sections.find((s) => s.type === "experience") as EntriesSection;
    expect(exp.entries[0].title).toBe("AI Engineer");
    expect(exp.entries[0].org).toBe("Anthropic");
    expect(exp.entries[0].bullets).toEqual(["Built a RAG pipeline", "Deployed agents"]);

    const proj = doc.sections.find((s) => s.type === "projects") as EntriesSection;
    expect(proj.entries[0].title).toBe("Agent X");
    expect(proj.entries[0].tech).toEqual(["LangChain", "PyTorch"]);

    const edu = doc.sections.find((s) => s.type === "education") as EducationSection;
    expect(edu.entries[0].school).toBe("UNC");
    expect(edu.entries[0].gradDate).toBe("2027");

    const skills = doc.sections.find((s) => s.type === "skills") as SkillsSection;
    expect(skills.groups[0].category).toBe("technical");
    expect(skills.groups[0].items).toEqual(["Python", "PyTorch", "RAG"]);
  });

  it("orders sections early-career canonical: summary → experience → projects → education → skills", () => {
    expect(doc.sections.map((s) => s.type)).toEqual(["summary", "experience", "projects", "education", "skills"]);
  });

  it("omits an empty summary section but always keeps experience/education/skills", () => {
    const d = normalizeDoc({ ...v1, summary: "" });
    expect(d.sections.some((s) => s.type === "summary")).toBe(false);
    expect(d.sections.some((s) => s.type === "experience")).toBe(true);
  });
});

describe("normalizeDoc — robustness", () => {
  it("idempotent on a V2 doc", () => {
    const once = normalizeDoc(v1);
    const twice = normalizeDoc(once);
    expect(twice).toEqual(once);
  });

  it("empty/garbage input → a usable empty doc, never throws", () => {
    expect(normalizeDoc(null).version).toBe(2);
    expect(normalizeDoc({}).version).toBe(2);
    expect(normalizeDoc("nonsense").version).toBe(2);
    expect(normalizeDoc(42).sections.length).toBeGreaterThan(0);
  });

  it("repairs a partial/hand-edited V2 doc without crashing", () => {
    const broken = { version: 2, sections: [{ id: "", type: "experience", kind: "entries", entries: [{ title: "X" }] }] } as unknown as ResumeDoc;
    const fixed = normalizeDoc(broken);
    const exp = fixed.sections[0] as EntriesSection;
    expect(exp.entries[0].bullets).toEqual([]);
    expect(exp.entries[0].id).toBeTruthy();
  });
});

describe("emptyDoc / emptySection", () => {
  it("emptyDoc seeds the four core sections", () => {
    expect(emptyDoc().sections.map((s) => s.type)).toEqual(["summary", "experience", "education", "skills"]);
  });

  it("emptySection builds the right kind per type", () => {
    expect(emptySection("awards", "a").kind).toBe("list");
    expect(emptySection("leadership", "l").kind).toBe("entries");
    expect(emptySection("custom", "c").kind).toBe("text");
    expect(emptySection("skills", "s").kind).toBe("skills");
  });
});
