import "server-only";
import { z } from "zod";
import { safeFetchText } from "@/lib/jobs/fetch";
import { detectJobSource, JobProvider } from "@/lib/jobs/adapters";

const resultSchema = z.object({ web: z.object({ results: z.array(z.object({ url: z.url(), title: z.string().default("") })).max(20).default([]) }).optional() });

export interface ResolvedJobSource { company: string; careerUrl: string; provider: JobProvider; boardToken: string }

export async function resolveOfficialJobSource(company: string, apiKey: string): Promise<ResolvedJobSource | null> {
  const query = encodeURIComponent(`${company} careers jobs site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com`);
  const raw = await safeFetchText(`https://api.search.brave.com/res/v1/web/search?q=${query}&count=10`, {
    headers: { "X-Subscription-Token": apiKey, Accept: "application/json" },
  });
  const results = resultSchema.parse(JSON.parse(raw)).web?.results || [];
  for (const result of results) {
    const normalizedCompany = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const haystack = `${result.title} ${result.url}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!haystack.includes(normalizedCompany)) continue;
    const detected = detectJobSource(result.url);
    if (detected.provider !== "jsonld" && detected.boardToken) return { company, careerUrl: result.url, ...detected };
  }
  return null;
}
