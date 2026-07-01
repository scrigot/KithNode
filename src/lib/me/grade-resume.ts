// Recruiter-grade resume scorer for AI Consulting / AI Engineering / AI-generalist
// roles. Pure + deterministic (no DB, no model) so it is unit-tested and produces
// the SAME score the UI shows live and the API persists.
//
// Methodology mirrors interviewstreet/hiring-agent: a declarative rubric, evidence
// (`reasons[]`) attached to every point, and explicit bonus/penalty deltas. But the
// rubric is re-targeted from software-engineering to AI roles using the same ICP
// vocabulary the contact rankers use (see rank-ai-experts.ts).
//
// Shape mirrors rank-ai-consulting.ts on purpose: a pure scoring function returning
// a transparent breakdown the UI renders dimension-by-dimension.

import { hasMetric } from "./resume-text";

export type Track = "ai-consulting" | "ai-engineering" | "ai-generalist";

export const TRACKS: { id: Track; label: string }[] = [
  { id: "ai-consulting", label: "AI Consulting" },
  { id: "ai-engineering", label: "AI Engineering" },
  { id: "ai-generalist", label: "AI Generalist" },
];

/** A single experience/project entry the model extracts from the resume. */
export interface SignalEntry {
  title: string;
  firm: string;
  start: string;
  end: string;
  bullets: string[];
  hasMetrics: boolean; // at least one bullet carries a quantified outcome
}

export interface ProjectEntry {
  name: string;
  description: string;
  bullets: string[];
  tech: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  gradYear: string;
}

/** The structured signal bundle the deterministic grader consumes. */
export interface ResumeSignals {
  header: { name: string; title: string; location: string; links: string[] };
  summary: string;
  experiences: SignalEntry[];
  projects: ProjectEntry[];
  skills: string[];
  education: EducationEntry[];
  aiKeywords: string[]; // distinct AI/ML/LLM tools or concepts mentioned anywhere
  deploymentSignals: string[]; // "production", "shipped", "deployed", "scaled", ...
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number; // 0-100, before weighting
  weight: number; // 0-1, per-track
  reasons: string[];
}

export interface GradedResume {
  overall: number; // 0-100 weighted, after bonuses/deductions
  track: Track;
  dimensions: DimensionScore[];
  bonuses: { label: string; delta: number }[];
  deductions: { label: string; delta: number }[];
}

export type DimensionKey =
  | "aiFluency"
  | "relevantExperience"
  | "impact"
  | "brandStrength"
  | "technicalDepth"
  | "education"
  | "atsParseability";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  aiFluency: "AI fluency & tooling",
  relevantExperience: "Relevant experience",
  impact: "Impact & quantification",
  brandStrength: "Brand strength",
  technicalDepth: "Technical depth",
  education: "Education & credentials",
  atsParseability: "ATS parseability",
};

// ── Rubric vocabulary (resume-tuned; same spirit as rank-ai-experts.ts) ──────────
const AI_ROLE =
  /\b(ai engineer|ml engineer|machine learning|applied ai|llm|genai|generative ai|ai consultant|ai researcher|data scientist|data engineer|mlops|forward deployed|solutions (architect|engineer))\b/i;
const CONSULTING =
  /\b(consultant|consulting|advisor|advisory|implementation|professional services|client|stakeholder|digital transformation|solutions architect|forward deployed)\b/i;
const AI_TOOLING =
  /\b(gpt|claude|llama|langchain|llamaindex|rag|vector (db|database)|pinecone|weaviate|embeddings?|fine-?tun(e|ing)|pytorch|tensorflow|hugging\s*face|transformers?|agents?|mcp|prompt engineering|openai|anthropic)\b/i;
const AI_COMPANY =
  /\b(openai|anthropic|databricks|snowflake|palantir|scale ai|hugging\s*face|cohere|mistral|nvidia|deepmind|fivetran|dbt|langchain|llamaindex)\b/i;
const STEM_FIELD =
  /\b(computer science|data science|statistics|mathematics|machine learning|electrical|software|informatics|physics|engineering|economics)\b/i;
const DEPLOYMENT =
  /\b(production|shipped|deployed|launched|scaled|live|in prod|serving|throughput|latency|uptime)\b/i;

const norm = (s: string | undefined) => (s || "").toLowerCase();
const allText = (s: ResumeSignals) =>
  [
    s.summary,
    ...s.experiences.flatMap((e) => [e.title, e.firm, ...e.bullets]),
    ...s.projects.flatMap((p) => [p.name, p.description, ...p.bullets, ...p.tech]),
    ...s.skills,
  ]
    .join(" ")
    .toLowerCase();

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ── Per-track weights — THE key business-logic decision ──────────────────────────
// How much each dimension matters to a recruiter screening for that track. Each
// row must sum to 1.0. AI Engineering prizes hands-on building + technical depth;
// AI Consulting prizes client/implementation experience + measurable impact;
// AI Generalist sits between. Tune these as you learn what real recruiters weight.
export const TRACK_WEIGHTS: Record<Track, Record<DimensionKey, number>> = {
  "ai-consulting": {
    aiFluency: 0.18,
    relevantExperience: 0.24,
    impact: 0.22,
    brandStrength: 0.12,
    technicalDepth: 0.1,
    education: 0.08,
    atsParseability: 0.06,
  },
  "ai-engineering": {
    aiFluency: 0.24,
    relevantExperience: 0.2,
    impact: 0.16,
    brandStrength: 0.1,
    technicalDepth: 0.2,
    education: 0.04,
    atsParseability: 0.06,
  },
  "ai-generalist": {
    aiFluency: 0.2,
    relevantExperience: 0.2,
    impact: 0.18,
    brandStrength: 0.12,
    technicalDepth: 0.14,
    education: 0.1,
    atsParseability: 0.06,
  },
};

// ── Per-dimension deterministic scorers ──────────────────────────────────────────
function scoreAiFluency(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const text = allText(s);
  const distinctTools = new Set(s.aiKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean));
  let score = distinctTools.size * 12;
  if (distinctTools.size) reasons.push(`${distinctTools.size} AI tool${distinctTools.size > 1 ? "s" : ""} named`);
  if (AI_TOOLING.test(text)) {
    score += 24;
    reasons.push("hands-on AI tooling (LLM/RAG/agents)");
  }
  if (!distinctTools.size && !AI_TOOLING.test(text)) reasons.push("no concrete AI tools detected");
  return { score: clamp(score), reasons };
}

function scoreRelevantExperience(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  let aiRoles = 0;
  for (const e of s.experiences) {
    const hay = `${e.title} ${e.firm} ${e.bullets.join(" ")}`;
    if (AI_ROLE.test(hay)) {
      aiRoles += 1;
      score += 28;
    } else if (CONSULTING.test(hay)) {
      score += 16;
    }
  }
  if (aiRoles) reasons.push(`${aiRoles} AI/ML-relevant role${aiRoles > 1 ? "s" : ""}`);
  if (s.deploymentSignals.length) {
    score += 18;
    reasons.push("shipped/production work");
  }
  if (!score) reasons.push("no clearly AI-relevant experience");
  return { score: clamp(score), reasons };
}

function scoreImpact(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const bullets = [
    ...s.experiences.flatMap((e) => e.bullets),
    ...s.projects.flatMap((p) => p.bullets),
  ];
  const total = bullets.length;
  const withMetric = bullets.filter((b) => hasMetric(b)).length;
  if (total === 0) {
    reasons.push("no bullet points to quantify");
    return { score: 0, reasons };
  }
  const pct = withMetric / total;
  reasons.push(`${withMetric}/${total} bullets quantified`);
  if (pct < 0.3) reasons.push("most bullets lack measurable outcomes");
  return { score: clamp(pct * 100), reasons };
}

function scoreBrandStrength(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const named = new Set<string>();
  for (const e of s.experiences) {
    const m = norm(e.firm).match(AI_COMPANY);
    if (m && !named.has(m[0])) {
      named.add(m[0]);
      score += 32;
    }
  }
  if (named.size) reasons.push(`recognized AI firm: ${[...named].join(", ")}`);
  else reasons.push("no marquee AI employers");
  return { score: clamp(score), reasons };
}

function scoreTechnicalDepth(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const skills = new Set(s.skills.map((k) => k.toLowerCase().trim()).filter(Boolean));
  const tech = new Set(s.projects.flatMap((p) => p.tech.map((t) => t.toLowerCase().trim())).filter(Boolean));
  const breadth = skills.size + tech.size;
  let score = Math.min(70, breadth * 8);
  if (breadth) reasons.push(`${breadth} distinct skill${breadth > 1 ? "s" : ""}/technologies`);
  if (s.projects.length) {
    score += Math.min(30, s.projects.length * 12);
    reasons.push(`${s.projects.length} project${s.projects.length > 1 ? "s" : ""} shown`);
  }
  if (!breadth && !s.projects.length) reasons.push("thin technical signal");
  return { score: clamp(score), reasons };
}

function scoreEducation(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const ed = s.education[0];
  if (ed && ed.degree) {
    score += 45;
    reasons.push("degree listed");
    if (STEM_FIELD.test(`${ed.field} ${ed.degree}`)) {
      score += 35;
      reasons.push("STEM/quant field");
    }
    if (ed.gradYear) {
      score += 15;
      reasons.push("graduation date present");
    }
  } else {
    reasons.push("no education section parsed");
  }
  return { score: clamp(score), reasons };
}

function scoreAtsParseability(s: ResumeSignals): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;
  if (!s.header.name) {
    score -= 25;
    reasons.push("missing candidate name");
  }
  if (!s.header.links.length) {
    score -= 15;
    reasons.push("no contact links (LinkedIn/GitHub/portfolio)");
  }
  const datedRoles = s.experiences.filter((e) => e.start || e.end).length;
  if (s.experiences.length && datedRoles < s.experiences.length) {
    score -= 20;
    reasons.push("some roles missing dates");
  }
  if (!s.skills.length) {
    score -= 15;
    reasons.push("no parseable skills section");
  }
  if (score === 100) reasons.push("clean, machine-readable structure");
  return { score: clamp(score), reasons };
}

const SCORERS: Record<DimensionKey, (s: ResumeSignals) => { score: number; reasons: string[] }> = {
  aiFluency: scoreAiFluency,
  relevantExperience: scoreRelevantExperience,
  impact: scoreImpact,
  brandStrength: scoreBrandStrength,
  technicalDepth: scoreTechnicalDepth,
  education: scoreEducation,
  atsParseability: scoreAtsParseability,
};

const DIMENSION_ORDER: DimensionKey[] = [
  "aiFluency",
  "relevantExperience",
  "impact",
  "brandStrength",
  "technicalDepth",
  "education",
  "atsParseability",
];

/**
 * Score a resume's structured signals the way a recruiter for `track` would.
 * Pure + deterministic: same input → same GradedResume, every time.
 */
export function gradeResume(signals: ResumeSignals, track: Track): GradedResume {
  const weights = TRACK_WEIGHTS[track];
  const dimensions: DimensionScore[] = DIMENSION_ORDER.map((key) => {
    const { score, reasons } = SCORERS[key](signals);
    return { key, label: DIMENSION_LABELS[key], score, weight: weights[key], reasons };
  });

  let weighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

  // Bonus/penalty deltas — evidence-based, applied to the overall (capped 0-100).
  const bonuses: { label: string; delta: number }[] = [];
  const deductions: { label: string; delta: number }[] = [];

  const links = signals.header.links.map(norm).join(" ");
  if (/github\.com/.test(links)) bonuses.push({ label: "GitHub profile linked", delta: 4 });
  if (/(portfolio|personal site|\.dev|\.io)/.test(links)) bonuses.push({ label: "Portfolio linked", delta: 3 });
  if (signals.deploymentSignals.length >= 2) bonuses.push({ label: "Multiple shipped projects", delta: 3 });

  const totalBullets = signals.experiences.flatMap((e) => e.bullets).length + signals.projects.flatMap((p) => p.bullets).length;
  if (totalBullets === 0) deductions.push({ label: "No accomplishment bullets", delta: -10 });
  if (!signals.aiKeywords.length) deductions.push({ label: "No AI keywords for an AI role", delta: -8 });

  const delta = [...bonuses, ...deductions].reduce((sum, b) => sum + b.delta, 0);
  weighted = clamp(weighted + delta);

  return { overall: weighted, track, dimensions, bonuses, deductions };
}

/** Empty signal bundle — the deterministic floor for a blank/new resume. */
export function emptySignals(): ResumeSignals {
  return {
    header: { name: "", title: "", location: "", links: [] },
    summary: "",
    experiences: [],
    projects: [],
    skills: [],
    education: [],
    aiKeywords: [],
    deploymentSignals: [],
  };
}
