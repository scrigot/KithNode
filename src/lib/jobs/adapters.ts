import "server-only";
import { z } from "zod";
import { URL } from "node:url";
import { safeFetchText, textOnly } from "@/lib/jobs/fetch";

export type JobProvider = "greenhouse" | "lever" | "ashby" | "jsonld";

export interface PublicJob {
  provider: JobProvider;
  externalId: string;
  company: string;
  role: string;
  location: string;
  workMode: string;
  jobUrl: string;
  applyUrl: string;
  description: string;
  postedAt: Date | null;
}

const greenhouseSchema = z.object({ jobs: z.array(z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  absolute_url: z.url(),
  location: z.object({ name: z.string().default("") }).default({ name: "" }),
  content: z.string().default(""),
  updated_at: z.string().optional(),
})).max(5_000) });

const leverSchema = z.array(z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.url(),
  applyUrl: z.url().optional(),
  createdAt: z.number().optional(),
  categories: z.object({ location: z.string().optional(), commitment: z.string().optional() }).passthrough().default({}),
  descriptionPlain: z.string().optional(),
  additionalPlain: z.string().optional(),
})).max(5_000);

const ashbySchema = z.object({ jobs: z.array(z.object({
  id: z.string().optional(),
  title: z.string(),
  location: z.string().optional(),
  workplaceType: z.string().optional(),
  jobUrl: z.url(),
  applyUrl: z.url().optional(),
  descriptionPlain: z.string().optional(),
  publishedAt: z.string().optional(),
})).max(5_000) });

function dateOrNull(value: string | number | undefined) {
  if (value === undefined) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function detectJobSource(careerUrl: string): { provider: JobProvider; boardToken: string } {
  const url = new URL(careerUrl);
  const segment = url.pathname.split("/").filter(Boolean)[0] || "";
  if (/greenhouse\.io$/i.test(url.hostname) && segment) return { provider: "greenhouse", boardToken: segment };
  if (/lever\.co$/i.test(url.hostname) && segment) return { provider: "lever", boardToken: segment };
  if (/ashbyhq\.com$/i.test(url.hostname) && segment) return { provider: "ashby", boardToken: segment };
  return { provider: "jsonld", boardToken: "" };
}

export async function fetchPublicJobs(input: { provider: JobProvider; boardToken: string; careerUrl: string; company: string }): Promise<PublicJob[]> {
  if (input.provider === "greenhouse") {
    const raw = await safeFetchText(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(input.boardToken)}/jobs?content=true`);
    return greenhouseSchema.parse(JSON.parse(raw)).jobs.map((job) => ({
      provider: "greenhouse", externalId: String(job.id), company: input.company, role: job.title,
      location: job.location.name, workMode: /remote/i.test(job.location.name) ? "remote" : "unknown",
      jobUrl: job.absolute_url, applyUrl: job.absolute_url, description: textOnly(job.content), postedAt: dateOrNull(job.updated_at),
    }));
  }
  if (input.provider === "lever") {
    const raw = await safeFetchText(`https://api.lever.co/v0/postings/${encodeURIComponent(input.boardToken)}?mode=json`);
    return leverSchema.parse(JSON.parse(raw)).map((job) => ({
      provider: "lever", externalId: job.id, company: input.company, role: job.text,
      location: job.categories.location || "", workMode: /remote/i.test(job.categories.location || "") ? "remote" : "unknown",
      jobUrl: job.hostedUrl, applyUrl: job.applyUrl || job.hostedUrl,
      description: textOnly(`${job.descriptionPlain || ""} ${job.additionalPlain || ""}`), postedAt: dateOrNull(job.createdAt),
    }));
  }
  if (input.provider === "ashby") {
    const raw = await safeFetchText(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(input.boardToken)}`);
    return ashbySchema.parse(JSON.parse(raw)).jobs.map((job) => ({
      provider: "ashby", externalId: job.id || job.jobUrl, company: input.company, role: job.title,
      location: job.location || "", workMode: (job.workplaceType || "unknown").toLowerCase(),
      jobUrl: job.jobUrl, applyUrl: job.applyUrl || job.jobUrl,
      description: textOnly(job.descriptionPlain || ""), postedAt: dateOrNull(job.publishedAt),
    }));
  }

  const html = await safeFetchText(input.careerUrl);
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const values: unknown[] = [];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      values.push(...(Array.isArray(parsed) ? parsed : parsed?.["@graph"] || [parsed]));
    } catch { /* Ignore malformed JSON-LD blocks. */ }
  }
  return values.flatMap((value) => {
    if (!value || typeof value !== "object" || (value as Record<string, unknown>)["@type"] !== "JobPosting") return [];
    const job = value as Record<string, unknown>;
    const title = String(job.title || "").trim();
    const url = String(job.url || input.careerUrl);
    if (!title) return [];
    const location = JSON.stringify(job.jobLocation || job.jobLocationType || "").slice(0, 500);
    return [{ provider: "jsonld" as const, externalId: String(job.identifier || url), company: input.company, role: title,
      location, workMode: /remote/i.test(location) ? "remote" : "unknown", jobUrl: url, applyUrl: url,
      description: textOnly(String(job.description || "")), postedAt: dateOrNull(String(job.datePosted || "")) }];
  });
}
