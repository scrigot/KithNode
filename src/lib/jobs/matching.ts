const CONCEPT_ALIASES: Record<string, string[]> = {
  "artificial intelligence": ["artificial intelligence", "ai"],
  "generative ai": ["generative ai", "gen ai", "genai", "llm", "large language model"],
  "agentic ai": ["agentic ai", "ai agent", "ai agents", "agent orchestration"],
  "machine learning": ["machine learning", "ml"],
  "data science": ["data science", "data scientist"],
  "investment banking": ["investment banking", "investment banker", "m&a", "mergers and acquisitions"],
  valuation: ["valuation", "dcf", "discounted cash flow", "comps", "comparable companies"],
  "financial modeling": ["financial modeling", "financial model", "three statement model"],
  "private equity": ["private equity", "buyout", "lbo", "leveraged buyout"],
  consulting: ["consulting", "consultant", "strategy consulting"],
  strategy: ["strategy", "strategic planning"],
  python: ["python"],
  sql: ["sql", "postgres", "postgresql"],
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function containsAlias(haystack: string, alias: string) {
  if (/^[a-z0-9+#.]{1,3}$/.test(alias)) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(alias)}(?:$|[^a-z0-9])`, "i").test(haystack);
  }
  return haystack.includes(alias);
}

export function extractJobConcepts(value: string) {
  const normalized = value.toLowerCase().replace(/[–—]/g, "-");
  return Object.entries(CONCEPT_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => containsAlias(normalized, alias)))
    .map(([concept]) => concept);
}

export const INTERNSHIP_PROGRAM_TYPES = [
  "internship",
  "co_op",
  "externship",
  "off_cycle",
  "summer_analyst",
  "insight_program",
  "leadership_program",
] as const;

export type InternshipProgramType = (typeof INTERNSHIP_PROGRAM_TYPES)[number];

const INTERNSHIP_TITLE_SIGNALS: Array<[RegExp, string, InternshipProgramType]> = [
  [/\bsophomore\s+(?:leadership|program|programme|summit)\b/i, "sophomore program", "leadership_program"],
  [/\b(?:spring|early)\s+(?:insight|week|program|programme)\b/i, "student insight program", "insight_program"],
  [/\bsummer\s+(?:analyst|associate|program|programme)\b/i, "summer program", "summer_analyst"],
  [/\boff[- ]cycle\b/i, "off-cycle program", "off_cycle"],
  [/\bco[- ]?op\b/i, "co-op", "co_op"],
  [/\bextern(?:ship)?\b/i, "externship", "externship"],
  [/\bintern(?:ship)?\b/i, "internship", "internship"],
];

const EXPERIENCED_TITLE = /\b(?:senior|staff|principal|director|vice president|vp|head of|lead|manager|experienced hire)\b/i;
const GRADUATE_ONLY = /\b(?:mba|j\.?d\.?|ph\.?d\.?|doctoral|doctorate|postdoc(?:toral)?|graduate students? only|masters? students? only)\b/i;

export interface InternshipEligibility {
  eligible: boolean;
  signal?: string;
  warning?: string;
  programType?: InternshipProgramType;
  season?: string;
  classYearStatus?: "verified" | "unverified" | "ineligible";
  classStage?: "first_year" | "sophomore" | "junior" | "senior" | "unknown";
  evidence?: string[];
}

export function inferTargetSummer(recruitingDate: Date = new Date()) {
  return recruitingDate.getUTCMonth() >= 6 ? recruitingDate.getUTCFullYear() + 1 : recruitingDate.getUTCFullYear();
}

export function inferUndergraduateStage(graduationYear: number | null | undefined, recruitingDate: Date = new Date()): InternshipEligibility["classStage"] {
  if (!graduationYear) return "unknown";
  const yearsAfterTargetSummer = graduationYear - inferTargetSummer(recruitingDate);
  if (yearsAfterTargetSummer >= 3) return "first_year";
  if (yearsAfterTargetSummer === 2) return "sophomore";
  if (yearsAfterTargetSummer === 1) return "junior";
  if (yearsAfterTargetSummer <= 0) return "senior";
  return "unknown";
}

export function isCurrentUndergraduateProfile(input: {
  graduationYear?: number | null;
  university?: unknown;
  major?: unknown;
  degrees?: unknown;
  educations?: unknown;
}, currentDate: Date = new Date()) {
  const graduationYear = Number(input.graduationYear || 0);
  const currentYear = currentDate.getUTCFullYear();
  if (graduationYear >= currentYear && graduationYear <= currentYear + 6) return true;

  const educationText = [input.university, input.major, input.degrees, input.educations].map(String).join(" ").toLowerCase();
  const graduateOnly = /\b(?:mba|j\.?d\.?|ph\.?d\.?|doctorate|postdoc|master(?:'s|s)?|m\.s\.|m\.a\.)\b/i.test(educationText);
  const undergraduateEvidence = /\b(?:undergraduate|bachelor(?:'s|s)?|b\.s\.|b\.a\.|college student)\b/i.test(educationText)
    || (Boolean(String(input.university || "").trim()) && Boolean(String(input.major || "").trim()));
  return undergraduateEvidence && !graduateOnly;
}

function graduationYearsFromDescription(description: string) {
  const years = new Set<number>();
  const patterns = [
    /graduat(?:e|es|ing|ion)[^.!?\n]{0,70}?\b(20\d{2})\b(?:\s*(?:-|–|—|to|through|and)\s*\b(20\d{2})\b)?/gi,
    /class of\s+(20\d{2})\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of description.matchAll(pattern)) {
      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end - start > 6) continue;
      for (let year = Math.min(start, end); year <= Math.max(start, end); year++) years.add(year);
    }
  }
  return [...years].sort();
}

function seasonFromTitle(title: string, targetSummer: number) {
  const explicitYear = title.match(/\b(20\d{2})\b/)?.[1];
  if (/\bsummer\b/i.test(title)) return `Summer ${explicitYear || targetSummer}`;
  if (/\bspring\b/i.test(title)) return `Spring ${explicitYear || targetSummer}`;
  if (/\bfall\b/i.test(title)) return `Fall ${explicitYear || targetSummer - 1}`;
  if (/\bwinter\b/i.test(title)) return `Winter ${explicitYear || targetSummer}`;
  if (/\boff[- ]cycle\b/i.test(title)) return explicitYear ? `Off-cycle ${explicitYear}` : "Off-cycle";
  return explicitYear || "";
}

/**
 * Deliberately title-first: an experienced job description can mention interns,
 * so description-only matching would leak FTE roles into a student search.
 */
export function classifyInternshipListing(
  title: string,
  description = "",
  context: { graduationYear?: number | null; recruitingDate?: Date } = {},
): InternshipEligibility {
  const normalizedTitle = title.replace(/[–—]/g, "-").trim();
  const match = INTERNSHIP_TITLE_SIGNALS.find(([pattern]) => pattern.test(normalizedTitle));
  if (!match) return { eligible: false };

  if (EXPERIENCED_TITLE.test(normalizedTitle) || GRADUATE_ONLY.test(normalizedTitle)) {
    return { eligible: false, programType: match[2], classYearStatus: "ineligible" };
  }

  const descriptionText = description.toLowerCase();
  if (GRADUATE_ONLY.test(descriptionText) && !/\b(?:undergraduate|bachelor|college student)\b/i.test(descriptionText)) {
    return { eligible: false, programType: match[2], classYearStatus: "ineligible" };
  }
  const studentEvidence = /\b(?:currently enrolled|pursuing (?:a |an )?(?:bachelor|undergraduate)|undergraduate student|graduat(?:e|ing) (?:between|in)|returning to (?:school|university)|sophomore|junior)\b/i.test(descriptionText);
  const targetSummer = inferTargetSummer(context.recruitingDate);
  const classStage = inferUndergraduateStage(context.graduationYear, context.recruitingDate);
  const acceptedYears = graduationYearsFromDescription(description);
  const graduationVerified = Boolean(context.graduationYear);
  const graduationMatches = !graduationVerified || acceptedYears.length === 0 || acceptedYears.includes(context.graduationYear!);
  if (!graduationMatches) {
    return {
      eligible: false,
      programType: match[2],
      season: seasonFromTitle(normalizedTitle, targetSummer),
      classYearStatus: "ineligible",
      classStage,
      evidence: [`Official description limits eligibility to graduation year${acceptedYears.length === 1 ? "" : "s"} ${acceptedYears.join(", ")}.`],
    };
  }

  const classYearStatus = graduationVerified ? "verified" : "unverified";
  const evidence = [
    `Title identifies ${match[1] === "internship" ? "an" : "a"} ${match[1]}.`,
    studentEvidence ? "Official description contains current-student eligibility language." : "Student eligibility is established by the official program title.",
    graduationVerified
      ? acceptedYears.length ? `Graduation year ${context.graduationYear} matches the listed eligibility window.` : `Class stage inferred as ${classStage?.replace("_", " ")}.`
      : "Graduation year is missing; class-year eligibility remains unverified.",
  ];

  return {
    eligible: true,
    signal: studentEvidence ? `${match[1]} · current-student eligibility found` : match[1],
    warning: graduationVerified ? undefined : "Add your graduation year to verify class-year eligibility.",
    programType: match[2],
    season: seasonFromTitle(normalizedTitle, targetSummer),
    classYearStatus,
    classStage,
    evidence,
  };
}
