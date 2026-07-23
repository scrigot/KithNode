import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { detectJobSource, fetchPublicJobs, type JobProvider } from "@/lib/jobs/adapters";
import { resolveOfficialJobSource } from "@/lib/jobs/brave";
import { assertPublicHttpUrl } from "@/lib/jobs/fetch";
import { canonicalCompanyKey, findCuratedJobSource } from "@/lib/jobs/catalog";

export interface JobSourceRecord {
  id: string;
  userId: string;
  company: string;
  companyKey: string;
  provider: JobProvider;
  boardToken: string;
  careerUrl: string;
  active: boolean;
  lastCheckedAt: string | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

const boundedCompany = z.string().trim().min(1).max(160);
export const jobSourceCreateSchema = z.object({
  company: boundedCompany,
  careerUrl: z.url().max(2_000),
});
export const jobSourcePatchSchema = z.object({
  company: boundedCompany.optional(),
  careerUrl: z.url().max(2_000).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const jobSourceResolveSchema = z.object({
  companies: z.array(boundedCompany).min(1).max(12),
});

function resultOrThrow<T>(operation: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data as T;
}

export async function listJobSources(userId: string, activeOnly = false): Promise<JobSourceRecord[]> {
  let query = supabase.from("JobSource").select("*").eq("userId", userId);
  if (activeOnly) query = query.eq("active", true);
  const result = await query.order("updatedAt", { ascending: false }).limit(100);
  return resultOrThrow<JobSourceRecord[]>("load job sources", result) || [];
}

export async function getJobSource(userId: string, id: string): Promise<JobSourceRecord | null> {
  return resultOrThrow<JobSourceRecord | null>(
    "find job source",
    await supabase.from("JobSource").select("*").eq("id", id).eq("userId", userId).maybeSingle(),
  );
}

export async function saveJobSource(
  userId: string,
  input: { company: string; careerUrl: string; provider?: JobProvider; boardToken?: string },
): Promise<JobSourceRecord> {
  const suppliedCompany = input.company.trim();
  const company = findCuratedJobSource(suppliedCompany)?.company || suppliedCompany;
  const safeUrl = await assertPublicHttpUrl(input.careerUrl.trim());
  const detected = input.provider && input.boardToken !== undefined
    ? { provider: input.provider, boardToken: input.boardToken }
    : detectJobSource(safeUrl.toString());
  const key = canonicalCompanyKey(company);
  const now = new Date().toISOString();
  const existing = resultOrThrow<JobSourceRecord | null>(
    "find job source",
    await supabase.from("JobSource").select("*").eq("userId", userId).eq("companyKey", key).eq("provider", detected.provider).maybeSingle(),
  );
  const result = await supabase.from("JobSource").upsert({
    id: existing?.id || randomUUID(),
    userId,
    company,
    companyKey: key,
    provider: detected.provider,
    boardToken: detected.boardToken,
    careerUrl: safeUrl.toString(),
    active: true,
    lastError: "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }, { onConflict: "userId,companyKey,provider" }).select("*").single();
  return resultOrThrow<JobSourceRecord>("save job source", result);
}

export async function updateJobSource(userId: string, id: string, patch: z.infer<typeof jobSourcePatchSchema>) {
  const current = resultOrThrow<JobSourceRecord | null>("find job source", await supabase.from("JobSource").select("*").eq("id", id).eq("userId", userId).maybeSingle());
  if (!current) return null;
  const company = patch.company?.trim() || current.company;
  const careerUrl = patch.careerUrl?.trim() || current.careerUrl;
  const safeUrl = await assertPublicHttpUrl(careerUrl);
  const detected = detectJobSource(safeUrl.toString());
  const result = await supabase.from("JobSource").update({
    company,
    companyKey: canonicalCompanyKey(company),
    careerUrl: safeUrl.toString(),
    provider: detected.provider,
    boardToken: detected.boardToken,
    active: patch.active ?? current.active,
    lastError: patch.careerUrl || patch.company ? "" : current.lastError,
    updatedAt: new Date().toISOString(),
  }).eq("id", id).eq("userId", userId).select("*").single();
  return resultOrThrow<JobSourceRecord>("update job source", result);
}

export async function removeJobSource(userId: string, id: string) {
  const result = await supabase.from("JobSource").delete().eq("id", id).eq("userId", userId).select("id");
  const rows = resultOrThrow<Array<{ id: string }>>("remove job source", result) || [];
  return rows.length > 0;
}

export async function testJobSource(userId: string, source: JobSourceRecord) {
  const checkedAt = new Date().toISOString();
  try {
    const jobs = await fetchPublicJobs(source);
    await supabase.from("JobSource").update({ lastCheckedAt: checkedAt, lastError: "", updatedAt: checkedAt }).eq("id", source.id).eq("userId", userId);
    return { ok: true, checkedAt, jobCount: jobs.length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Source test failed";
    await supabase.from("JobSource").update({ lastCheckedAt: checkedAt, lastError: message, updatedAt: checkedAt }).eq("id", source.id).eq("userId", userId);
    return { ok: false, checkedAt, jobCount: 0, error: message };
  }
}

export async function resolveJobSources(userId: string, companies: string[], braveApiKey?: string) {
  const existing = await listJobSources(userId);
  const byCompany = new Map(existing.map((source) => [canonicalCompanyKey(source.company), source]));
  const resolved: JobSourceRecord[] = [];
  const unresolved: string[] = [];

  for (const rawCompany of companies.slice(0, 12)) {
    const company = rawCompany.trim();
    const key = canonicalCompanyKey(company);
    if (!company || !key) continue;
    const saved = byCompany.get(key);
    if (saved) {
      if (saved.active) resolved.push(saved);
      else unresolved.push(company);
      continue;
    }
    const curated = findCuratedJobSource(company);
    if (curated) {
      const source = await saveJobSource(userId, curated);
      byCompany.set(key, source);
      resolved.push(source);
      continue;
    }
    if (braveApiKey) {
      const found = await resolveOfficialJobSource(company, braveApiKey).catch(() => null);
      if (found) {
        const source = await saveJobSource(userId, found);
        byCompany.set(key, source);
        resolved.push(source);
        continue;
      }
    }
    unresolved.push(company);
  }

  return { resolved, unresolved, searchConfigured: Boolean(braveApiKey) };
}
