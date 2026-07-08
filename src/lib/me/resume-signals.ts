// Resume (PDF or structured content) → ResumeSignals extraction.
//
// Holds the pure, framework-free pieces (zod output schema + prompt builder) so
// they're unit-tested without next-auth or the gateway. The route handler
// (src/app/api/me/resume/grade/route.ts) wires these into the AI Gateway, and
// gradeResume() (grade-resume.ts) consumes the result. PDF validation is reused
// wholesale from the existing extractor so the size/magic-byte guards stay in one
// place.
import { z } from "zod";
import type { ResumeSignals } from "./grade-resume";
import { hasMetric } from "./resume-text";
import { normalizeDoc } from "./resume-doc";
import type { ResumeDoc, EntriesSection, EducationSection, SkillsSection, ListSection, TextSection } from "./resume-doc";

export { validateResumePdf, MAX_RESUME_BYTES, type ResumeValidation } from "@/lib/resume-extract";

/** Output schema the model fills — shape-compatible with ResumeSignals. */
export const resumeSignalsSchema = z.object({
  header: z.object({
    name: z.string(),
    title: z.string(),
    location: z.string(),
    links: z.array(z.string()).max(6),
  }),
  summary: z.string(),
  experiences: z
    .array(
      z.object({
        title: z.string(),
        firm: z.string(),
        start: z.string(),
        end: z.string(),
        bullets: z.array(z.string()).max(8),
        hasMetrics: z.boolean(),
      }),
    )
    .max(10),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        bullets: z.array(z.string()).max(6),
        tech: z.array(z.string()).max(12),
      }),
    )
    .max(8),
  skills: z.array(z.string()).max(40),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string(),
        field: z.string(),
        gradYear: z.string(),
      }),
    )
    .max(4),
  aiKeywords: z.array(z.string()).max(30),
  deploymentSignals: z.array(z.string()).max(20),
});

export type ResumeSignalsExtract = z.infer<typeof resumeSignalsSchema>;

/** Prompt for extracting grading signals from a resume PDF. */
export function buildSignalsPrompt(): string {
  return `You are a recruiting analyst extracting STRUCTURED SIGNALS from a candidate's resume so an AI-roles rubric can score it. Extract only what is present — never invent. Use empty strings/arrays when an attribute is absent.

Return:
- header: { name, title (current/target role), location, links (LinkedIn/GitHub/portfolio URLs) }.
- summary: the candidate's summary/objective text verbatim if present, else "".
- experiences: up to 10 work entries, each { title, firm, start, end, bullets, hasMetrics }. bullets are the verbatim accomplishment lines. hasMetrics is true if ANY bullet contains a quantified outcome (%, $, counts, time saved, scale).
- projects: up to 8 personal/portfolio projects, each { name, description, bullets, tech } where tech is the libraries/frameworks/languages used.
- skills: every skill/technology listed in a skills section.
- education: up to 4 entries { school, degree, field, gradYear }.
- aiKeywords: distinct AI/ML/LLM tools or concepts mentioned ANYWHERE (e.g. LLM, RAG, agents, embeddings, fine-tuning, PyTorch, LangChain, GPT, Claude, vector DB). Deduplicate.
- deploymentSignals: phrases evidencing shipped/production work (e.g. "production", "deployed", "scaled", "serving", "launched", "live"). Deduplicate.

Return JSON matching the schema exactly.`;
}

/** Normalize raw model output into the ResumeSignals the grader consumes. */
export function toResumeSignals(raw: ResumeSignalsExtract): ResumeSignals {
  return {
    header: {
      name: raw.header.name,
      title: raw.header.title,
      location: raw.header.location,
      links: raw.header.links,
    },
    summary: raw.summary,
    experiences: raw.experiences,
    projects: raw.projects,
    skills: raw.skills,
    education: raw.education,
    aiKeywords: raw.aiKeywords,
    deploymentSignals: raw.deploymentSignals,
  };
}

/**
 * Derive ResumeSignals from the structured resume content the builder edits
 * (so live re-scoring works without a PDF). Keyword/deployment/metric signals
 * are inferred deterministically from the same text the grader scores, keeping
 * the live editor's score consistent with the rubric.
 */
const CONTENT_AI_KEYWORDS = [
  "llm", "rag", "agents", "agent", "embeddings", "fine-tuning", "fine tuning", "pytorch", "tensorflow",
  "langchain", "llamaindex", "gpt", "claude", "llama", "hugging face", "transformers", "vector db",
  "vector database", "pinecone", "weaviate", "mcp", "prompt engineering", "genai", "generative ai",
  "machine learning", "deep learning", "nlp", "openai", "anthropic",
];
const CONTENT_DEPLOY = ["production", "deployed", "shipped", "launched", "scaled", "serving", "live", "in prod"];

export interface ResumeContent {
  header?: { name?: string; title?: string; location?: string; links?: string[] };
  summary?: string;
  experiences?: { title?: string; firm?: string; start?: string; end?: string; bullets?: string[] }[];
  projects?: { name?: string; description?: string; bullets?: string[]; tech?: string[] }[];
  skills?: string[];
  education?: { school?: string; degree?: string; field?: string; gradYear?: string }[];
}

// Section types that count as "roles" for relevant-experience scoring.
const ROLE_TYPES = new Set(["experience", "leadership", "volunteering"]);
// Skill categories that feed technicalDepth. interests = display-only (never scores);
// languages = spoken languages, also excluded from technical depth.
const SCORED_SKILL_CATEGORIES = new Set(["technical", "tools", "custom"]);

/**
 * Derive ResumeSignals by walking the V2 section model. This is the canonical
 * path; `signalsFromContent` normalizes any stored shape and delegates here so the
 * live editor, the API, and old rows all score identically.
 */
export function signalsFromDoc(doc: ResumeDoc): ResumeSignals {
  const experiences: ResumeSignals["experiences"] = [];
  const projects: ResumeSignals["projects"] = [];
  const education: ResumeSignals["education"] = [];
  const skills: string[] = [];
  const textBits: string[] = [];

  for (const s of doc.sections) {
    if (!s.visible) continue;
    if (s.kind === "entries" && ROLE_TYPES.has(s.type)) {
      const sec = s as EntriesSection;
      for (const e of sec.entries) {
        const bullets = e.bullets.filter(Boolean);
        experiences.push({ title: e.title, firm: e.org, start: e.start, end: e.end, bullets, hasMetrics: bullets.some(hasMetric) });
      }
    } else if (s.kind === "entries" && s.type === "projects") {
      for (const e of (s as EntriesSection).entries) {
        projects.push({ name: e.title, description: "", bullets: e.bullets.filter(Boolean), tech: (e.tech ?? []).filter(Boolean) });
      }
    } else if (s.kind === "education") {
      for (const e of (s as EducationSection).entries) {
        education.push({ school: e.school, degree: e.degree, field: [e.field, e.concentration].filter(Boolean).join(" "), gradYear: e.gradDate });
      }
    } else if (s.kind === "skills") {
      for (const g of (s as SkillsSection).groups) {
        if (SCORED_SKILL_CATEGORIES.has(g.category)) skills.push(...g.items.filter(Boolean));
        else textBits.push(...g.items); // interests/languages: text only, not scored
      }
    } else if (s.kind === "list") {
      for (const it of (s as ListSection).items) textBits.push(it.title, it.detail);
    } else if (s.kind === "text") {
      textBits.push((s as TextSection).body);
    }
  }

  const haystack = [
    ...textBits,
    ...experiences.flatMap((e) => [e.title, e.firm, ...e.bullets]),
    ...projects.flatMap((p) => [p.name, ...p.bullets, ...p.tech]),
    ...skills,
  ]
    .join(" ")
    .toLowerCase();

  return {
    header: { name: doc.header.name, title: doc.header.title, location: doc.header.location, links: doc.header.links.filter(Boolean) },
    summary: doc.sections.find((s) => s.type === "summary" && s.kind === "text") ? (doc.sections.find((s) => s.type === "summary") as TextSection).body : "",
    experiences,
    projects,
    education,
    skills,
    aiKeywords: CONTENT_AI_KEYWORDS.filter((k) => haystack.includes(k)),
    deploymentSignals: CONTENT_DEPLOY.filter((k) => haystack.includes(k)),
  };
}

/** Back-compat entry point: accepts ANY stored shape (V1 or V2) → signals. */
export function signalsFromContent(content: unknown): ResumeSignals {
  return signalsFromDoc(normalizeDoc(content));
}
