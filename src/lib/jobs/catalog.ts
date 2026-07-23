import type { JobProvider } from "@/lib/jobs/adapters";

export interface CuratedJobSource {
  company: string;
  aliases: string[];
  provider: JobProvider;
  boardToken: string;
  careerUrl: string;
  tags: string[];
}

export const companyKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Public ATS boards verified against their official public APIs. Keeping this
// list versioned lets common targets work without requiring a paid search key.
export const CURATED_JOB_SOURCES: readonly CuratedJobSource[] = [
  { company: "Anthropic", aliases: [], provider: "greenhouse", boardToken: "anthropic", careerUrl: "https://job-boards.greenhouse.io/anthropic", tags: ["ai", "machine learning", "research", "engineering", "policy"] },
  { company: "OpenAI", aliases: [], provider: "ashby", boardToken: "openai", careerUrl: "https://jobs.ashbyhq.com/openai", tags: ["ai", "machine learning", "research", "engineering", "product"] },
  { company: "Perplexity", aliases: ["Perplexity AI"], provider: "ashby", boardToken: "perplexity", careerUrl: "https://jobs.ashbyhq.com/perplexity", tags: ["ai", "machine learning", "search", "engineering", "product"] },
  { company: "Cohere", aliases: [], provider: "ashby", boardToken: "cohere", careerUrl: "https://jobs.ashbyhq.com/cohere", tags: ["ai", "machine learning", "enterprise", "engineering", "consulting"] },
  { company: "Cursor", aliases: ["Anysphere"], provider: "ashby", boardToken: "cursor", careerUrl: "https://jobs.ashbyhq.com/cursor", tags: ["ai", "software", "engineering", "product"] },
  { company: "Replit", aliases: [], provider: "ashby", boardToken: "replit", careerUrl: "https://jobs.ashbyhq.com/replit", tags: ["ai", "software", "engineering", "product"] },
  { company: "Scale AI", aliases: ["Scale"], provider: "greenhouse", boardToken: "scaleai", careerUrl: "https://job-boards.greenhouse.io/scaleai", tags: ["ai", "machine learning", "data", "engineering", "strategy"] },
  { company: "Databricks", aliases: [], provider: "greenhouse", boardToken: "databricks", careerUrl: "https://boards.greenhouse.io/databricks", tags: ["ai", "data", "software", "engineering", "sales"] },
  { company: "Boston Consulting Group", aliases: ["BCG"], provider: "greenhouse", boardToken: "bcg", careerUrl: "https://job-boards.greenhouse.io/bcg", tags: ["consulting", "strategy", "finance", "ai"] },
  { company: "Ramp", aliases: [], provider: "ashby", boardToken: "ramp", careerUrl: "https://jobs.ashbyhq.com/ramp", tags: ["finance", "fintech", "ai", "strategy", "product"] },
  { company: "Plaid", aliases: [], provider: "ashby", boardToken: "plaid", careerUrl: "https://jobs.ashbyhq.com/plaid", tags: ["finance", "fintech", "data", "engineering", "product"] },
  { company: "Brex", aliases: [], provider: "greenhouse", boardToken: "brex", careerUrl: "https://job-boards.greenhouse.io/brex", tags: ["finance", "fintech", "ai", "strategy", "product"] },
  { company: "Affirm", aliases: [], provider: "greenhouse", boardToken: "affirm", careerUrl: "https://job-boards.greenhouse.io/affirm", tags: ["finance", "fintech", "data", "strategy", "product"] },
  { company: "Robinhood", aliases: [], provider: "greenhouse", boardToken: "robinhood", careerUrl: "https://job-boards.greenhouse.io/robinhood", tags: ["finance", "fintech", "markets", "data", "product"] },
  { company: "Coinbase", aliases: [], provider: "greenhouse", boardToken: "coinbase", careerUrl: "https://job-boards.greenhouse.io/coinbase", tags: ["finance", "fintech", "crypto", "engineering", "strategy"] },
  { company: "Stripe", aliases: [], provider: "greenhouse", boardToken: "stripe", careerUrl: "https://job-boards.greenhouse.io/stripe", tags: ["finance", "fintech", "payments", "engineering", "strategy"] },
  { company: "Block", aliases: ["Square"], provider: "greenhouse", boardToken: "block", careerUrl: "https://job-boards.greenhouse.io/block", tags: ["finance", "fintech", "payments", "ai", "product"] },
  { company: "Chime", aliases: [], provider: "greenhouse", boardToken: "chime", careerUrl: "https://job-boards.greenhouse.io/chime", tags: ["finance", "fintech", "data", "strategy", "product"] },
] as const;

export function findCuratedJobSource(company: string) {
  const key = companyKey(company);
  return CURATED_JOB_SOURCES.find((source) =>
    [source.company, ...source.aliases].some((name) => companyKey(name) === key),
  );
}

export function canonicalCompanyKey(company: string) {
  return companyKey(findCuratedJobSource(company)?.company || company);
}

export function adjacentCuratedJobSources(evidence: string, excludedCompanies: string[], limit = 5) {
  const haystack = evidence.toLowerCase();
  const excluded = new Set(excludedCompanies.map(canonicalCompanyKey));
  return CURATED_JOB_SOURCES
    .filter((source) => !excluded.has(canonicalCompanyKey(source.company)))
    .map((source) => ({
      source,
      score: source.tags.reduce((score, tag) => score + (haystack.includes(tag) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.company.localeCompare(b.source.company))
    .slice(0, Math.max(0, limit))
    .map((item) => item.source);
}
