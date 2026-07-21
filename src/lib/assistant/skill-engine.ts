import "server-only";
import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { CareerSkillId, getCareerSkill, parseSlashSkill } from "@/lib/assistant/skills";
import { detectJobSource, fetchPublicJobs } from "@/lib/jobs/adapters";
import { resolveOfficialJobSource } from "@/lib/jobs/brave";
import { serverEnv } from "@/lib/env/server";
import { AssistantDatabaseError } from "@/lib/assistant/repository";

type LooseRow = Record<string, any>;

export interface SkillAction {
  toolName: "enrich_contacts" | "save_opportunity" | "tailor_resume";
  label: string;
  input: Record<string, unknown>;
}

export interface SkillCard {
  id: string;
  title: string;
  subtitle?: string;
  score?: number;
  confidence: number;
  evidence: string[];
  sourceDate: string;
  warning?: string;
  links?: Array<{ label: string; href: string }>;
  data?: Record<string, unknown>;
}

export interface SkillResult {
  skillId: CareerSkillId;
  title: string;
  summary: string;
  cards: SkillCard[];
  warnings: string[];
  freshness: string;
  proposedActions: SkillAction[];
}

const splitTerms = (value: string) => value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2);
const companyKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
function parseStoredList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch { /* Legacy comma-separated value. */ }
  return raw.split(/[,;\n]+/).map((item) => item.replace(/^[\s"'\u005b]+|[\s"'\u005d]+$/g, "").trim()).filter(Boolean);
}
const daysSince = (value: Date | string | null | undefined) => {
  if (!value) return 9_999;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 9_999 : Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
};

function dataOrThrow<T>(operation: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new AssistantDatabaseError(operation, result.error.message);
  return result.data as T;
}

async function contactsWithPipeline(userId: string, limit: number): Promise<Array<LooseRow & { pipelineEntries: LooseRow[] }>> {
  const contacts: LooseRow[] = dataOrThrow<LooseRow[]>("load contacts", await supabase.from("AlumniContact").select("*").eq("importedByUserId", userId).limit(limit)) || [];
  const entries = contacts.length ? dataOrThrow<LooseRow[]>("load contact pipeline", await supabase.from("PipelineEntry").select("*").eq("userId", userId).limit(5_000)) || [] : [];
  const grouped = new Map<string, LooseRow[]>();
  for (const entry of entries) grouped.set(String(entry.contactId), [...(grouped.get(String(entry.contactId)) || []), entry]);
  return contacts.map((contact) => ({ ...contact, pipelineEntries: grouped.get(String(contact.id)) || [] }));
}

async function upsertJobSource(userId: string, source: { company: string; provider: string; boardToken: string; careerUrl: string }) {
  const now = new Date().toISOString();
  const key = companyKey(source.company);
  const existing = dataOrThrow<Record<string, any> | null>("find job source", await supabase.from("JobSource").select("id,createdAt").eq("userId", userId).eq("companyKey", key).eq("provider", source.provider).maybeSingle());
  const result = await supabase.from("JobSource").upsert({ id: existing?.id || randomUUID(), userId, company: source.company, companyKey: key, provider: source.provider, boardToken: source.boardToken, careerUrl: source.careerUrl, active: true, lastError: "", createdAt: existing?.createdAt || now, updatedAt: now }, { onConflict: "userId,companyKey,provider" });
  dataOrThrow("save job source", result);
}

export function inferCareerSkill(message: string): CareerSkillId | undefined {
  const slash = parseSlashSkill(message);
  if (slash) return slash.id;
  const text = message.toLowerCase();
  if (/find|match|show/.test(text) && /jobs?|roles?|offers?/.test(text)) return "find_jobs";
  if (/enrich|missing (data|info|fields)|needs? more info/.test(text)) return "enrichment_gaps";
  if (/firm|compan/.test(text) && /coverage|meet more|network gap|know more/.test(text)) return "firm_coverage";
  if (/who.*contact|contact.*today|reach out.*today/.test(text)) return "who_to_contact";
  if (/follow.?up|overdue/.test(text)) return "follow_ups";
  return undefined;
}

function cleanParameters(parameters: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(parameters).filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)));
}

async function findJobs(userId: string, userEmail: string, parameters: Record<string, unknown>): Promise<SkillResult> {
  const now = new Date();
  const manualUrl = typeof parameters.careerUrl === "string" ? parameters.careerUrl.trim() : "";
  const manualCompany = typeof parameters.company === "string" ? parameters.company.trim() : "";
  if (manualUrl) {
    const detected = detectJobSource(manualUrl);
    if (!manualCompany) throw new Error("Add a company name with the career URL");
    await upsertJobSource(userId, { company: manualCompany, ...detected, careerUrl: manualUrl });
  }

  const [sourceResult, userResult, profileResult, resumeResult] = await Promise.all([
    supabase.from("JobSource").select("*").eq("userId", userId).eq("active", true).order("updatedAt", { ascending: false }).limit(20),
    supabase.from("User").select("*").eq("id", userId).maybeSingle(),
    supabase.from("LinkedInProfile").select("*").eq("userId", userId).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("MeResume").select("*").eq("userId", userEmail).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
  ]);
  let sources = dataOrThrow<Record<string, any>[]>("load job sources", sourceResult) || [];
  const user = dataOrThrow<Record<string, any> | null>("load user profile", userResult);
  const profile = dataOrThrow<Record<string, any> | null>("load LinkedIn profile", profileResult);
  const resume = dataOrThrow<Record<string, any> | null>("load resume", resumeResult);

  if (sources.length === 0 && serverEnv().BRAVE_SEARCH_API_KEY && user?.targetFirms) {
    const firms = parseStoredList(user.targetFirms).slice(0, 8);
    const resolved = (await Promise.all(firms.map((firm) => resolveOfficialJobSource(firm, serverEnv().BRAVE_SEARCH_API_KEY!).catch(() => null)))).filter((item) => item !== null);
    await Promise.all(resolved.map((source) => upsertJobSource(userId, source)));
    sources = dataOrThrow<Record<string, any>[]>("reload job sources", await supabase.from("JobSource").select("*").eq("userId", userId).eq("active", true).order("updatedAt", { ascending: false }).limit(20)) || [];
  }

  if (!profile && !resume) {
    return { skillId: "find_jobs", title: "Find jobs", summary: "I need a primary resume or LinkedIn profile before I can score jobs without inventing evidence.", cards: [],
      warnings: ["Create a resume in Resume Studio or import a LinkedIn profile, then run this skill again."], freshness: now.toISOString(), proposedActions: [] };
  }
  if (sources.length === 0) {
    return { skillId: "find_jobs", title: "Find jobs", summary: "No verified official career sources are configured yet.", cards: [],
      warnings: ["Run /find-jobs with a company and its official careers URL. Search-based source discovery becomes available when BRAVE_SEARCH_API_KEY is configured."], freshness: now.toISOString(), proposedActions: [] };
  }

  const settled = await Promise.allSettled(sources.map(async (source) => {
    const jobs = await fetchPublicJobs({ provider: source.provider as Parameters<typeof fetchPublicJobs>[0]["provider"], boardToken: source.boardToken, careerUrl: source.careerUrl, company: source.company });
    dataOrThrow("update job source health", await supabase.from("JobSource").update({ lastCheckedAt: now.toISOString(), lastError: "", updatedAt: now.toISOString() }).eq("id", source.id).eq("userId", userId));
    return jobs;
  }));
  const jobs = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const warnings = settled.flatMap((result, index) => result.status === "rejected" ? [`${sources[index].company}: ${result.reason instanceof Error ? result.reason.message : "source failed"}`] : []);
  await Promise.all(settled.map((result, index) => result.status === "rejected"
    ? supabase.from("JobSource").update({ lastCheckedAt: now.toISOString(), lastError: String(result.reason).slice(0, 500), updatedAt: now.toISOString() }).eq("id", sources[index].id).eq("userId", userId).then(() => undefined)
    : Promise.resolve()));

  const profileText = [user?.skills, user?.experiences, user?.major, user?.targetIndustries, user?.targetFirms, user?.targetLocations,
    profile ? JSON.stringify(profile) : "", resume ? JSON.stringify(resume.content) : ""].join(" ");
  const profileTerms = new Set(splitTerms(profileText));
  const targetLocations = splitTerms(user?.targetLocations || "");
  const uniqueJobs = [...new Map(jobs.map((job) => [job.externalId || job.jobUrl, job])).values()];
  const contacts = (await contactsWithPipeline(userId, 2_000)).filter((contact) => uniqueJobs.some((job) => companyKey(contact.firmName || "") === companyKey(job.company)));

  const ranked = uniqueJobs.map((job) => {
    const jobTerms = new Set(splitTerms(`${job.role} ${job.description}`));
    const overlap = [...jobTerms].filter((term) => profileTerms.has(term)).slice(0, 12);
    const fit = Math.min(45, Math.round(12 + overlap.length * 3));
    const companyContacts = contacts.filter((contact) => companyKey(contact.firmName) === companyKey(job.company));
    const strongest = Math.max(0, ...companyContacts.map((contact) => Math.max(contact.warmthScore, contact.tier === "warm" ? 70 : 0)));
    const network = Math.min(30, Math.round(companyContacts.length * 5 + strongest * 0.15));
    const locationText = `${job.location} ${job.workMode}`.toLowerCase();
    const location = targetLocations.length === 0 ? 8 : targetLocations.some((term) => locationText.includes(term)) ? 15 : /remote/.test(locationText) ? 12 : 3;
    const age = daysSince(job.postedAt);
    const freshness = age <= 7 ? 10 : age <= 21 ? 7 : age <= 45 ? 4 : 1;
    const score = fit + network + location + freshness;
    const reasons = [
      overlap.length ? `${overlap.slice(0, 4).join(", ")} match your recorded evidence` : "Limited direct skill overlap was found",
      companyContacts.length ? `${companyContacts.length} saved contact${companyContacts.length === 1 ? "" : "s"} at ${job.company}` : `No saved contacts at ${job.company}`,
      age < 9_999 ? `Listing is about ${Math.round(age)} days old` : "Listing date was not supplied",
    ];
    return { job, score, network, reasons, companyContacts };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  return {
    skillId: "find_jobs", title: "Top job matches", summary: ranked.length === 5 ? "Here are your five strongest current matches from verified public sources." : `I found ${ranked.length} current match${ranked.length === 1 ? "" : "es"} from the configured official sources.`,
    cards: ranked.map(({ job, score, network, reasons, companyContacts }) => ({
      id: job.externalId || job.jobUrl, title: job.role, subtitle: `${job.company}${job.location ? ` · ${job.location}` : ""}`, score, confidence: Math.min(0.95, 0.5 + score / 200),
      evidence: reasons, sourceDate: (job.postedAt || now).toISOString(), links: [{ label: "Open official listing", href: job.jobUrl }],
      data: { opportunity: { company: job.company, role: job.role, location: job.location, workMode: job.workMode, jobUrl: job.jobUrl, applyUrl: job.applyUrl, source: job.provider, externalId: job.externalId, description: job.description, fitScore: score, networkScore: network, matchReasons: reasons, postedAt: job.postedAt?.toISOString() || null }, contacts: companyContacts },
    })),
    warnings: [...warnings, ...(ranked.length < 5 ? ["Fewer than five valid listings were available; no results were fabricated."] : [])], freshness: now.toISOString(), proposedActions: [],
  };
}

async function enrichmentGaps(userId: string): Promise<SkillResult> {
  const now = new Date();
  const user = dataOrThrow<Record<string, any> | null>("load target firms", await supabase.from("User").select("targetFirms").eq("id", userId).maybeSingle());
  const targets = splitTerms(user?.targetFirms || "");
  const contacts = await contactsWithPipeline(userId, 1_000);
  const fields = ["email", "linkedInUrl", "title", "firmName", "location", "education", "skills", "seniorityLevel"] as const;
  const ranked = contacts.map((contact) => {
    const missing = fields.filter((field) => !String(contact[field] || "").trim());
    const target = targets.some((term) => contact.firmName.toLowerCase().includes(term));
    const staleDays = daysSince(contact.enrichedAt || contact.createdAt);
    const score = missing.length * 8 + (target ? 24 : 0) + Math.min(20, contact.pipelineEntries.length * 10) + Math.min(15, contact.warmthScore / 7) + Math.min(15, staleDays / 30);
    return { contact, missing, score, staleDays, target };
  }).filter((item) => item.missing.length > 0).sort((a, b) => b.score - a.score).slice(0, 10);
  const contactIds = ranked.map((item) => item.contact.id);
  return { skillId: "enrichment_gaps", title: "Highest-impact enrichment gaps", summary: ranked.length ? `${ranked.length} contacts would benefit most from reviewed enrichment.` : "Your saved contacts have the core fields needed for current workflows.",
    cards: ranked.map(({ contact, missing, score, staleDays, target }) => ({ id: contact.id, title: contact.name, subtitle: [contact.title, contact.firmName].filter(Boolean).join(" · "), score: Math.min(100, Math.round(score)), confidence: 0.9,
      evidence: [`Missing: ${missing.join(", ")}`, target ? "Works at a target firm" : "Not currently at a target firm", `Last verified ${staleDays > 9_000 ? "never" : `${Math.round(staleDays)} days ago`}`],
      sourceDate: new Date(contact.enrichedAt || contact.createdAt).toISOString(), warning: !contact.linkedInUrl ? "Add a LinkedIn URL before using the extension capture flow." : undefined,
      links: contact.linkedInUrl ? [{ label: "Open LinkedIn for reviewed capture", href: contact.linkedInUrl }] : undefined, data: { contactId: contact.id, missingFields: missing, estimatedCredits: 1 } })),
    warnings: ["Provider data and extension captures remain labeled separately from manual edits and model inference."], freshness: now.toISOString(),
    proposedActions: contactIds.length ? [{ toolName: "enrich_contacts", label: `Enrich ${contactIds.length} selected contacts (estimated ${contactIds.length} credits)`, input: { contactIds, estimatedCredits: contactIds.length } }] : [] };
}

async function firmCoverage(userId: string): Promise<SkillResult> {
  const now = new Date();
  const user = dataOrThrow<Record<string, any> | null>("load target firms", await supabase.from("User").select("targetFirms").eq("id", userId).maybeSingle());
  const targetFirms = parseStoredList(user?.targetFirms);
  const contacts = await contactsWithPipeline(userId, 2_000);
  const cards = targetFirms.map((firm) => {
    const matches = contacts.filter((contact) => companyKey(contact.firmName) === companyKey(firm));
    const warm = matches.filter((contact) => contact.tier === "warm" || contact.warmthScore >= 60);
    const senior = matches.filter((contact) => /director|partner|vp|vice president|head|recruit|talent|manager/i.test(`${contact.title} ${contact.seniorityLevel}`));
    const functions = new Set(matches.map((contact) => contact.role || contact.title).filter(Boolean).map((value) => value.toLowerCase().split(/\s+/).slice(-2).join(" ")));
    const recent = matches.filter((contact) => daysSince(contact.lastSpokenAt) <= 90);
    const active = matches.filter((contact) => contact.pipelineEntries.length > 0);
    const score = Math.min(100, matches.length * 12 + warm.length * 12 + senior.length * 12 + functions.size * 5 + active.length * 5 + recent.length * 8);
    const gap = matches.length === 0 ? "No saved contacts" : warm.length === 0 ? "Only cold contacts" : senior.length === 0 ? "No senior or recruiting contact" : recent.length === 0 ? "Relationships are stale" : functions.size < 2 ? "Low functional diversity" : "Coverage is healthy";
    const firmQuery = encodeURIComponent(firm);
    return { id: companyKey(firm), title: firm, subtitle: gap, score, confidence: 0.9, evidence: [`${matches.length} contacts · ${warm.length} warm · ${senior.length} senior/recruiting`, `${functions.size} represented functions`, `${active.length} active in pipeline · ${recent.length} touched in 90 days`], sourceDate: now.toISOString(),
      links: [
        { label: "Discover contacts", href: `/dashboard/discover?company=${firmQuery}` },
        ...(matches.length ? [{ label: "Review contacts", href: `/dashboard/contacts?company=${firmQuery}` }] : []),
      ],
      data: { contactCount: matches.length, warmCount: warm.length, seniorCount: senior.length, functionalDiversity: functions.size, gap } };
  }).sort((a, b) => a.score - b.score);
  return { skillId: "firm_coverage", title: "Target-firm coverage", summary: cards.length ? "Firms with the largest relationship gaps are ranked first." : "Add target firms to your profile to calculate coverage.", cards, warnings: [], freshness: now.toISOString(), proposedActions: [] };
}

async function whoToContact(userId: string, overdueOnly = false): Promise<SkillResult> {
  const now = new Date();
  const contacts = await contactsWithPipeline(userId, 1_000);
  const ranked = contacts.map((contact) => {
    const age = daysSince(contact.lastSpokenAt);
    const score = Math.min(100, contact.warmthScore * 0.45 + Math.min(35, age / 4) + contact.pipelineEntries.length * 12);
    return { contact, score, age };
  }).filter((item) => !overdueOnly || item.age >= 30).sort((a, b) => b.score - a.score).slice(0, 8);
  return { skillId: overdueOnly ? "follow_ups" : "who_to_contact", title: overdueOnly ? "Follow-ups to make" : "Who to contact today", summary: ranked.length ? "Ranked from your saved relationship and pipeline evidence." : "No eligible saved contacts were found.",
    cards: ranked.map(({ contact, score, age }) => ({ id: contact.id, title: contact.name, subtitle: [contact.title, contact.firmName].filter(Boolean).join(" · "), score: Math.round(score), confidence: 0.82,
      evidence: [`Warmth score ${Math.round(contact.warmthScore)}`, `${contact.pipelineEntries.length} active pipeline placement${contact.pipelineEntries.length === 1 ? "" : "s"}`, age > 9_000 ? "No interaction date recorded" : `Last interaction about ${Math.round(age)} days ago`], sourceDate: new Date(contact.lastSpokenAt || contact.createdAt).toISOString(), links: contact.linkedInUrl ? [{ label: "Open LinkedIn", href: contact.linkedInUrl }] : undefined })), warnings: [], freshness: now.toISOString(), proposedActions: [] };
}

export async function executeCareerSkill(input: { skillId: CareerSkillId; userId: string; userEmail: string; parameters?: Record<string, unknown> }): Promise<SkillResult> {
  const parameters = cleanParameters(input.parameters || {});
  switch (input.skillId) {
    case "find_jobs": return findJobs(input.userId, input.userEmail, parameters);
    case "enrichment_gaps": return enrichmentGaps(input.userId);
    case "firm_coverage": return firmCoverage(input.userId);
    case "who_to_contact": return whoToContact(input.userId);
    case "follow_ups": return whoToContact(input.userId, true);
    default:
      return { skillId: input.skillId, title: getCareerSkill(input.skillId).label, summary: "This command is available through the conversational planner. Any write or external action will be proposed for approval first.", cards: [], warnings: [], freshness: new Date().toISOString(), proposedActions: [] };
  }
}

export function skillResultJson(result: SkillResult) {
  return JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
}
