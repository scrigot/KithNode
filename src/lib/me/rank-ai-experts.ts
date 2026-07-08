import type { MeProfileData } from "./profile";

export interface ExpertInput {
  id: string;
  name: string;
  firmName: string;
  title: string;
  location?: string;
  notes?: string;
  linkedInUrl?: string;
}

export interface RankedExpert extends ExpertInput {
  score: number;
  reasons: string[];
}

const AI_ENGINEERING =
  /\b(ai engineer|artificial intelligence|machine learning|ml engineer|applied ai|llm|rag|genai|generative ai|prompt engineer|ai researcher|data scientist|data engineer|analytics engineer|forward deployed engineer|solutions engineer|implementation engineer)\b/i;
const CONSULTING =
  /\b(ai consultant|consultant|consulting|advisor|advisory|implementation|solutions architect|field engineer|professional services|data services|digital transformation)\b/i;
const EXPERT =
  /\b(founder|principal|partner|director|vp|head of|lead|staff|senior|architect|cto|chief)\b/i;
const AI_COMPANY =
  /\b(openai|anthropic|databricks|snowflake|palantir|scale ai|hugging\s*face|cohere|mistral|nvidia|fivetran|dbt|langchain|llamaindex|data|analytics|ai\b|machine learning|intelligence)\b/i;

const norm = (s: string | undefined) => (s || "").toLowerCase();
const tokens = (s: string | undefined) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2);

function overlaps(profileText: string, candidateText: string): boolean {
  const p = new Set(tokens(profileText));
  return tokens(candidateText).some((t) => p.has(t));
}

export function rankAiExperts(
  experts: ExpertInput[],
  profile?: Partial<MeProfileData>,
): RankedExpert[] {
  const profileExpertise = [
    profile?.targetRoles,
    profile?.targetExpertise,
    profile?.targetCompanies,
    profile?.searchKeywords,
  ].filter(Boolean).join(" ");
  const profilePlaces = [profile?.targetLocations, profile?.location, profile?.hometown].filter(Boolean).join(" ");

  return experts
    .map((expert) => {
      const title = expert.title || "";
      const firm = expert.firmName || "";
      const notes = expert.notes || "";
      const haystack = `${title} ${firm} ${notes}`;
      const reasons: string[] = [];
      let score = 0;

      if (AI_ENGINEERING.test(haystack)) {
        score += 35;
        reasons.push("AI engineering / data expert");
      }
      if (CONSULTING.test(haystack)) {
        score += 26;
        reasons.push("consulting / implementation");
      }
      if (EXPERT.test(title)) {
        score += 18;
        reasons.push("senior practitioner");
      }
      if (AI_COMPANY.test(firm)) {
        score += 14;
        reasons.push("AI/data company");
      }
      if (profileExpertise && overlaps(profileExpertise, haystack)) {
        score += 14;
        reasons.push("matches your target expertise");
      }
      if (profilePlaces && overlaps(profilePlaces, expert.location || "")) {
        score += 8;
        reasons.push("location overlap");
      }
      if (expert.linkedInUrl) {
        score += 3;
        reasons.push("LinkedIn profile captured");
      }

      return { ...expert, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function recommendedSearches(profile?: Partial<MeProfileData>): { label: string; query: string }[] {
  const roles = profile?.targetRoles || "AI consultant OR AI engineer";
  const expertise = profile?.targetExpertise || profile?.searchKeywords || "LLM OR RAG OR data engineering";
  const companies = profile?.targetCompanies || "Databricks OR Palantir OR Scale AI OR AI consulting";
  const locations = profile?.targetLocations || profile?.location || "Raleigh OR Chapel Hill OR New York OR San Francisco";
  return [
    { label: "AI consulting mentors", query: `site:linkedin.com/in ("AI consultant" OR "applied AI" OR "data services") (${expertise})` },
    { label: "AI engineering practitioners", query: `site:linkedin.com/in (${roles}) (${expertise})` },
    { label: "Target-company experts", query: `site:linkedin.com/in (${companies}) (${expertise})` },
    { label: "Local / reachable experts", query: `site:linkedin.com/in (${roles}) (${locations})` },
  ];
}
