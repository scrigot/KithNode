import "server-only";
import { supabase } from "@/lib/supabase";
import { CareerSkillId, getCareerSkill, parseSlashSkill } from "@/lib/assistant/skills";
import { fetchPublicJobDetails, fetchPublicJobs, type PublicJob } from "@/lib/jobs/adapters";
import { adjacentCuratedJobSources, canonicalCompanyKey, CURATED_JOB_SOURCES, findCuratedJobSource } from "@/lib/jobs/catalog";
import { listJobSources, resolveJobSources, saveJobSource, type JobSourceRecord } from "@/lib/jobs/source-service";
import { serverEnv } from "@/lib/env/server";
import { AssistantDatabaseError } from "@/lib/assistant/repository";
import { normalizeLinkedInProfile } from "@/lib/linkedin-profile/schema";
import { classifyInternshipListing, extractJobConcepts, type InternshipEligibility } from "@/lib/jobs/matching";
import { relationshipsAtCompanies } from "@/lib/relationships/repository";

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
  status?: "complete" | "partial" | "needs_setup";
  sourceStatus?: Array<{
    company: string;
    state: "ready" | "needs_setup" | "failed";
    provider?: string;
    careerUrl?: string;
    detail?: string;
  }>;
  setup?: {
    kind: "job_sources";
    unresolvedFirms: string[];
    suggestedFirms: string[];
    searchConfigured: boolean;
    parameters: Record<string, unknown>;
  };
}

const splitTerms = (value: string) => value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 2);

function parameterList(parameters: Record<string, unknown>, ...keys: string[]) {
  return keys.flatMap((key) => {
    const value = parameters[key];
    if (Array.isArray(value)) return value.map(String);
    return typeof value === "string" ? parseStoredList(value) : [];
  }).map((item) => item.trim()).filter(Boolean);
}

function uniqueCompanies(values: string[], limit = 12) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = canonicalCompanyKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}
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

export function inferCareerSkill(message: string, context: { isCurrentUndergraduate?: boolean } = {}): CareerSkillId | undefined {
  const slash = parseSlashSkill(message);
  if (slash) return slash.id;
  const text = message.toLowerCase();
  const asksAboutTrackedApplication =
    /\b(?:my|saved|tracked|existing|current)\s+(?:application|opportunity|internship|job)\b/.test(text) ||
    /\b(?:application|opportunity)\s+(?:status|deadline|next action|notes?|timeline|contacts?|resume|materials?)\b/.test(text) ||
    /\b(?:next action|status|deadline|notes?|timeline)\b/.test(text) && /\b(?:application|internship|job|opportunity)\b/.test(text);
  const asksToDiscover =
    /\b(?:find|search|discover|show|recommend|match|surface|suggest)\b/.test(text) ||
    /\bwhat\b.*\b(?:should|could|can)\b.*\b(?:pursue|apply|target)\b/.test(text);
  const mentionsStudentOpportunity =
    /\b(?:internships?|co[- ]?ops?|externships?|off[- ]cycle|summer analyst|insight weeks?|sophomore (?:leadership|program))\b/.test(text);

  // References to an existing application belong to the grounded conversational
  // planner, even when the record itself is an internship. Discovery should only
  // win when the user is actually asking KithNode to find new opportunities.
  if (!asksAboutTrackedApplication && asksToDiscover && mentionsStudentOpportunity) return "find_internships";
  if (/\b(?:full[- ]?time|fte|experienced hire)\b/.test(text) && /find|match|show|opportunit|roles?|jobs?/.test(text)) return "find_jobs";
  if (context.isCurrentUndergraduate && /find|match|show|recommend/.test(text) && /opportunit(?:y|ies)|roles?|positions?|openings?/.test(text)) return "find_internships";
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

type DiscoveryMode = "internship" | "full_time";

function discoveryCopy(mode: DiscoveryMode) {
  return mode === "internship"
    ? { skillId: "find_internships" as const, noun: "internships", title: "Find internships", resultTitle: "Top internship matches" }
    : { skillId: "find_jobs" as const, noun: "jobs", title: "Find jobs", resultTitle: "Top job matches" };
}

async function hydrateInternshipShortlist(
  jobs: PublicJob[],
  sources: JobSourceRecord[],
  onProgress?: (message: string) => void | Promise<void>,
) {
  const titleShortlist = jobs.filter((job) => classifyInternshipListing(job.role).eligible).slice(0, 40);
  const sourceByCompany = new Map(sources.map((source) => [canonicalCompanyKey(source.company), source]));
  const hydrated: PublicJob[] = [];
  const warnings: string[] = [];
  for (let index = 0; index < titleShortlist.length; index += 4) {
    const batch = titleShortlist.slice(index, index + 4);
    const results = await Promise.allSettled(batch.map(async (job) => {
      const source = sourceByCompany.get(canonicalCompanyKey(job.company));
      if (!source) return job;
      if (!job.description) await onProgress?.(`Confirming student eligibility for ${job.role} at ${job.company}…`);
      return fetchPublicJobDetails({
        provider: source.provider as Parameters<typeof fetchPublicJobs>[0]["provider"],
        boardToken: source.boardToken,
        careerUrl: source.careerUrl,
        company: source.company,
      }, job);
    }));
    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") hydrated.push(result.value);
      else {
        const job = batch[resultIndex];
        hydrated.push(job);
        warnings.push(`${job.company}: eligibility details could not be refreshed; the official student-program title was retained.`);
      }
    });
  }
  return { jobs: hydrated, warnings };
}

async function discoverOpportunities(mode: DiscoveryMode, userId: string, userEmail: string, parameters: Record<string, unknown>, onProgress?: (message: string) => void | Promise<void>): Promise<SkillResult> {
  const now = new Date();
  const copy = discoveryCopy(mode);
  if (serverEnv().ENABLE_JOB_DISCOVERY === "false") {
    return { skillId: copy.skillId, title: "Opportunity discovery is disabled", summary: "Opportunity discovery is currently turned off for this environment.", cards: [], warnings: ["Enable job discovery in the server configuration, then retry."], freshness: now.toISOString(), proposedActions: [], status: "needs_setup" };
  }
  const manualUrl = typeof parameters.careerUrl === "string" ? parameters.careerUrl.trim() : "";
  const manualCompany = typeof parameters.company === "string" ? parameters.company.trim() : "";
  if (manualUrl) {
    if (!manualCompany) throw new Error("Add a company name with the career URL");
    await saveJobSource(userId, { company: manualCompany, careerUrl: manualUrl });
  }

  const [userResult, profileResult, resumeResult, opportunityResult, contactResult, savedSources] = await Promise.all([
    supabase.from("User").select("*").eq("id", userId).maybeSingle(),
    supabase.from("LinkedInProfile").select("*").eq("userId", userId).order("isPrimary", { ascending: false }).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("MeResume").select("*").eq("userId", userEmail).order("updatedAt", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("Opportunity").select("company,role,status,location").eq("userId", userId).neq("status", "archived").order("updatedAt", { ascending: false }).limit(50),
    supabase.from("AlumniContact").select("id,firmName,title,skills").eq("importedByUserId", userId).order("createdAt", { ascending: false }).limit(300),
    listJobSources(userId, true),
  ]);
  const user = dataOrThrow<Record<string, any> | null>("load user profile", userResult);
  const profile = dataOrThrow<Record<string, any> | null>("load LinkedIn profile", profileResult);
  const resume = dataOrThrow<Record<string, any> | null>("load resume", resumeResult);
  const opportunities = dataOrThrow<Record<string, any>[]>("load opportunities", opportunityResult) || [];
  const networkContacts = dataOrThrow<Record<string, any>[]>("load network firms", contactResult) || [];
  const networkRelationships = await relationshipsAtCompanies(
    userId,
    uniqueCompanies(networkContacts.map((contact) => String(contact.firmName || "")), 300),
  );
  const verifiedNetworkFirms = [...networkRelationships.entries()]
    .filter(([, relationships]) => relationships.some((relationship) => relationship.state === "verified"))
    .map(([companyKey]) => networkContacts.find((contact) => canonicalCompanyKey(contact.firmName) === companyKey)?.firmName || "")
    .filter(Boolean);

  if (!profile && !resume) {
    return { skillId: copy.skillId, title: copy.title, summary: `I need a primary resume or LinkedIn profile before I can score ${copy.noun} without inventing evidence.`, cards: [],
      warnings: ["Create a resume in Resume Studio or import a LinkedIn profile, then run this skill again."], freshness: now.toISOString(), proposedActions: [] };
  }

  let linkedIn: ReturnType<typeof normalizeLinkedInProfile> | null = null;
  if (profile) {
    try { linkedIn = normalizeLinkedInProfile(profile.content); } catch { linkedIn = null; }
  }
  const evidenceText = [
    user?.skills, user?.experiences, user?.educations, user?.major, user?.targetIndustries, user?.targetFirms, user?.targetLocations,
    linkedIn ? JSON.stringify(linkedIn) : "",
    resume ? JSON.stringify(resume.content) : "",
    opportunities.map((item) => `${item.role} ${item.company} ${item.location}`).join(" "),
    networkContacts.map((item) => `${item.title} ${item.firmName} ${item.skills}`).join(" "),
  ].join(" ");
  const explicitCompanies = uniqueCompanies([manualCompany, ...parameterList(parameters, "companies")].filter(Boolean));
  const targetFirms = parseStoredList(user?.targetFirms);
  const includeAdjacent = parameters.includeAdjacent !== false && explicitCompanies.length === 0;
  const prioritizedTargets = [...targetFirms.filter((firm) => findCuratedJobSource(firm)), ...targetFirms.filter((firm) => !findCuratedJobSource(firm))];
  const baseCompanies = explicitCompanies.length
    ? explicitCompanies
    : uniqueCompanies([
        ...savedSources.map((source) => source.company),
        ...prioritizedTargets,
        ...opportunities.map((item) => String(item.company || "")),
        ...verifiedNetworkFirms,
      ], 50);
  const adjacent = includeAdjacent ? adjacentCuratedJobSources(evidenceText, baseCompanies, 5).map((source) => source.company) : [];
  const requestedCompanies = explicitCompanies.length ? explicitCompanies : uniqueCompanies([...baseCompanies.slice(0, 7), ...adjacent]);
  const fallbackSuggestions = adjacentCuratedJobSources(evidenceText, requestedCompanies, 6).map((source) => source.company);

  await onProgress?.(`Resolving official sources for ${requestedCompanies.length || "your target"} employer${requestedCompanies.length === 1 ? "" : "s"}…`);
  const resolution = requestedCompanies.length
    ? await resolveJobSources(userId, requestedCompanies, serverEnv().BRAVE_SEARCH_API_KEY)
    : { resolved: [] as JobSourceRecord[], unresolved: [] as string[], searchConfigured: Boolean(serverEnv().BRAVE_SEARCH_API_KEY) };
  const sources = resolution.resolved.filter((source) => source.active).slice(0, 12);
  const setup = resolution.unresolved.length || sources.length === 0 ? {
    kind: "job_sources" as const,
    unresolvedFirms: resolution.unresolved.length ? resolution.unresolved : uniqueCompanies([...targetFirms, ...fallbackSuggestions]).slice(0, 6),
    suggestedFirms: uniqueCompanies([...fallbackSuggestions, ...CURATED_JOB_SOURCES.slice(0, 6).map((source) => source.company)]).slice(0, 6),
    searchConfigured: resolution.searchConfigured,
    parameters: { ...parameters, companies: requestedCompanies, includeAdjacent },
  } : undefined;

  if (sources.length === 0) {
    return {
      skillId: copy.skillId, title: "Choose where to search", summary: `Select a target firm or confirm its official careers page, then KithNode will search for ${copy.noun} here.`, cards: [],
      warnings: resolution.searchConfigured ? [] : ["Automatic search is optional. Known AI and finance employers work without a search key; custom firms may need an official careers URL."],
      freshness: now.toISOString(), proposedActions: [], status: "needs_setup", setup,
      sourceStatus: setup?.unresolvedFirms.map((company) => ({ company, state: "needs_setup" as const, detail: "Official source needed" })) || [],
    };
  }

  const settled: PromiseSettledResult<Awaited<ReturnType<typeof fetchPublicJobs>>>[] = [];
  for (let index = 0; index < sources.length; index += 3) {
    const batch = sources.slice(index, index + 3);
    settled.push(...await Promise.allSettled(batch.map(async (source) => {
      await onProgress?.(`Checking ${source.company}…`);
      const jobs = await fetchPublicJobs({ provider: source.provider as Parameters<typeof fetchPublicJobs>[0]["provider"], boardToken: source.boardToken, careerUrl: source.careerUrl, company: source.company });
      dataOrThrow("update job source health", await supabase.from("JobSource").update({ lastCheckedAt: now.toISOString(), lastError: "", updatedAt: now.toISOString() }).eq("id", source.id).eq("userId", userId));
      return jobs;
    })));
  }
  const fetchedJobs = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const warnings = settled.flatMap((result, index) => result.status === "rejected" ? [`${sources[index].company}: ${result.reason instanceof Error ? result.reason.message : "source failed"}`] : []);
  await Promise.all(settled.map((result, index) => result.status === "rejected"
    ? supabase.from("JobSource").update({ lastCheckedAt: now.toISOString(), lastError: String(result.reason).slice(0, 500), updatedAt: now.toISOString() }).eq("id", sources[index].id).eq("userId", userId).then(() => undefined)
    : Promise.resolve()));

  const profileTerms = new Set(splitTerms(evidenceText));
  const profileConcepts = new Set(extractJobConcepts(evidenceText));
  const roleTerms = splitTerms([...parseStoredList(user?.targetIndustries), ...(linkedIn?.positioning.targetRoles || []), ...parameterList(parameters, "roleKeywords", "roles")].join(" "));
  const targetLocations = splitTerms([...parseStoredList(user?.targetLocations), ...parameterList(parameters, "locations")].join(" "));
  const uniqueFetchedJobs = [...new Map(fetchedJobs.map((job) => [`${job.provider}:${canonicalCompanyKey(job.company)}:${job.externalId || job.jobUrl}`, job])).values()];
  const hydrated = mode === "internship"
    ? await hydrateInternshipShortlist(uniqueFetchedJobs, sources, onProgress)
    : { jobs: uniqueFetchedJobs.filter((job) => !classifyInternshipListing(job.role).eligible), warnings: [] as string[] };
  warnings.push(...hydrated.warnings);
  const recruitingDate = user?.recruitingDate ? new Date(user.recruitingDate) : now;
  const graduationYear = Number(user?.graduationYear) || null;
  const internshipEligibility = new Map<string, InternshipEligibility>();
  const uniqueJobs = hydrated.jobs.filter((job) => {
    if (mode !== "internship") return true;
    const eligibility = classifyInternshipListing(job.role, job.description, { graduationYear, recruitingDate });
    internshipEligibility.set(`${job.provider}:${canonicalCompanyKey(job.company)}:${job.externalId || job.jobUrl}`, eligibility);
    return eligibility.eligible;
  });
  const relationshipsByCompany = await relationshipsAtCompanies(
    userId,
    uniqueJobs.map((job) => job.company),
  );
  const requestedSeasons = parameterList(parameters, "seasons").map((season) => season.toLowerCase());
  const requestedProgramTypes = new Set(parameterList(parameters, "programTypes", "program_types").map((type) => type.toLowerCase().replaceAll("-", "_")));

  const ranked = uniqueJobs.map((job) => {
    const jobKey = `${job.provider}:${canonicalCompanyKey(job.company)}:${job.externalId || job.jobUrl}`;
    const eligibility = internshipEligibility.get(jobKey);
    const jobTerms = new Set(splitTerms(`${job.role} ${job.description}`));
    const overlap = [...jobTerms].filter((term) => profileTerms.has(term)).slice(0, 12);
    const jobConcepts = extractJobConcepts(`${job.role} ${job.description}`);
    const conceptMatches = jobConcepts.filter((concept) => profileConcepts.has(concept));
    const missingConcepts = jobConcepts.filter((concept) => !profileConcepts.has(concept)).slice(0, 4);
    const roleMatches = roleTerms.filter((term) => jobTerms.has(term)).slice(0, 6);
    const fitCap = mode === "internship" ? 40 : 45;
    const fit = Math.min(fitCap, Math.round(5 + conceptMatches.length * 4 + overlap.length * 1.5 + roleMatches.length * 2));
    const companyRelationships = relationshipsByCompany.get(canonicalCompanyKey(job.company)) || [];
    const verifiedRelationships = companyRelationships.filter((relationship) => relationship.state === "verified");
    const potentialRelationships = companyRelationships.filter((relationship) => relationship.state === "potential");
    const networkCap = mode === "internship" ? 25 : 30;
    const network = Math.min(
      networkCap,
      verifiedRelationships.length * 14 + potentialRelationships.length * 3,
    );
    const locationText = `${job.location} ${job.workMode}`.toLowerCase();
    const locationCap = mode === "internship" ? 10 : 15;
    const location = targetLocations.length === 0 ? Math.round(locationCap * 0.55) : targetLocations.some((term) => locationText.includes(term)) ? locationCap : /remote/.test(locationText) ? Math.round(locationCap * 0.8) : 2;
    const age = daysSince(job.postedAt);
    const freshness = age <= 7 ? 10 : age <= 21 ? 7 : age <= 45 ? 4 : 1;
    const seasonText = `${eligibility?.season || ""} ${job.role}`.toLowerCase();
    const programTypeMatches = !requestedProgramTypes.size || Boolean(eligibility?.programType && requestedProgramTypes.has(eligibility.programType));
    const seasonMatches = !requestedSeasons.length || requestedSeasons.some((season) => seasonText.includes(season));
    const studentFit = mode === "internship"
      ? Math.max(0, Math.min(15,
          (eligibility?.classYearStatus === "verified" ? 9 : 5)
          + (seasonMatches ? 3 : 0)
          + (programTypeMatches ? 3 : 0)))
      : 0;
    const score = fit + network + studentFit + location + freshness;
    const reasons = [
      ...(mode === "internship" ? (eligibility?.evidence || []) : []),
      conceptMatches.length || overlap.length ? `${[...conceptMatches, ...overlap].slice(0, 5).join(", ")} match your recorded evidence` : "Limited direct skill overlap was found",
      missingConcepts.length ? `Missing recorded evidence: ${missingConcepts.join(", ")}` : "No additional tracked skill gap was identified",
      verifiedRelationships.length
        ? `${verifiedRelationships.length} verified relationship${verifiedRelationships.length === 1 ? "" : "s"} at ${job.company}`
        : potentialRelationships.length
          ? `${potentialRelationships.length} potential path${potentialRelationships.length === 1 ? "" : "s"} at ${job.company}; none verified`
          : `No relationship path recorded at ${job.company}`,
      age < 9_999 ? `Listing is about ${Math.round(age)} days old` : "Listing date was not supplied",
    ];
    return {
      job,
      score,
      network,
      reasons,
      companyRelationships,
      eligibility,
      programTypeMatches,
      seasonMatches,
    };
  }).filter((item) => mode !== "internship" || (item.programTypeMatches && item.seasonMatches))
    .sort((a, b) => b.score - a.score).slice(0, 5);

  return {
    skillId: copy.skillId, title: copy.resultTitle, summary: ranked.length === 5 ? `Here are your five strongest current ${mode === "internship" ? "student-opportunity" : "full-time"} matches from verified public sources.` : `I found ${ranked.length} legitimate ${mode === "internship" ? `student opportunit${ranked.length === 1 ? "y" : "ies"}` : `full-time match${ranked.length === 1 ? "" : "es"}`} from the configured official sources.`,
    cards: ranked.map(({ job, score, network, reasons, companyRelationships, eligibility }) => ({
      id: `${job.provider}:${canonicalCompanyKey(job.company)}:${job.externalId || job.jobUrl}`, title: job.role, subtitle: `${job.company}${job.location ? ` · ${job.location}` : ""}`, score, confidence: Math.min(0.95, 0.5 + score / 200),
      evidence: reasons, warning: eligibility?.warning, sourceDate: (job.postedAt || now).toISOString(), links: [{ label: "Open official listing", href: job.jobUrl }],
      data: {
        programType: eligibility?.programType,
        season: eligibility?.season,
        classYearStatus: eligibility?.classYearStatus,
        relationshipState: companyRelationships.some((relationship) => relationship.state === "verified")
          ? "verified"
          : companyRelationships.length
            ? "potential"
            : "none",
        opportunity: {
          company: job.company,
          role: job.role,
          location: job.location,
          workMode: job.workMode,
          jobUrl: job.jobUrl,
          applyUrl: job.applyUrl,
          source: job.provider,
          externalId: job.externalId,
          description: job.description,
          fitScore: score,
          networkScore: network,
          matchReasons: reasons,
          postedAt: job.postedAt?.toISOString() || null,
          opportunityType: eligibility?.programType || "job",
          season: eligibility?.season || "",
        },
        relationships: companyRelationships,
      },
    })),
    warnings: [...warnings, ...(mode === "internship" && !graduationYear ? ["Add your graduation year in Settings → Profile & Education to verify class-year eligibility."] : []), ...(ranked.length < 5 ? [`Fewer than five legitimate ${mode === "internship" ? "student opportunities" : "listings"} were available; no results were fabricated.`] : [])], freshness: now.toISOString(), proposedActions: [],
    status: warnings.length || resolution.unresolved.length || ranked.length < 5 ? "partial" : "complete",
    setup,
    sourceStatus: [
      ...sources.map((source, index) => settled[index].status === "fulfilled"
        ? { company: source.company, state: "ready" as const, provider: source.provider, careerUrl: source.careerUrl, detail: `${settled[index].value.length} open listings checked` }
        : { company: source.company, state: "failed" as const, provider: source.provider, careerUrl: source.careerUrl, detail: warnings.find((warning) => warning.startsWith(`${source.company}:`)) || "Source failed" }),
      ...resolution.unresolved.map((company) => ({ company, state: "needs_setup" as const, detail: "Official source needed" })),
    ],
  };
}

async function enrichmentGaps(userId: string): Promise<SkillResult> {
  const now = new Date();
  const user = dataOrThrow<Record<string, any> | null>("load target firms", await supabase.from("User").select("targetFirms").eq("id", userId).maybeSingle());
  const targets = parseStoredList(user?.targetFirms).map(canonicalCompanyKey);
  const contacts = await contactsWithPipeline(userId, 1_000);
  const relationships = await relationshipsAtCompanies(userId, contacts.map((contact) => String(contact.firmName || "")));
  const relationshipsByContact = new Map(
    [...relationships.values()].flat().map((relationship) => [relationship.contactId, relationship]),
  );
  const fields = ["email", "linkedInUrl", "title", "firmName", "location", "education", "skills", "seniorityLevel"] as const;
  const ranked = contacts.map((contact) => {
    const missing = fields.filter((field) => !String(contact[field] || "").trim());
    const target = targets.includes(canonicalCompanyKey(contact.firmName));
    const relationship = relationshipsByContact.get(String(contact.id));
    const staleDays = daysSince(contact.enrichedAt || contact.createdAt);
    const relationshipImpact = relationship?.state === "verified" ? 15 : relationship ? 5 : 0;
    const score = missing.length * 8 + (target ? 24 : 0) + Math.min(20, contact.pipelineEntries.length * 10) + relationshipImpact + Math.min(15, staleDays / 30);
    return { contact, missing, score, staleDays, target, relationship };
  }).filter((item) => item.missing.length > 0).sort((a, b) => b.score - a.score).slice(0, 10);
  const contactIds = ranked.map((item) => item.contact.id);
  return { skillId: "enrichment_gaps", title: "Highest-impact enrichment gaps", summary: ranked.length ? `${ranked.length} contacts would benefit most from reviewed enrichment.` : "Your saved contacts have the core fields needed for current workflows.",
    cards: ranked.map(({ contact, missing, score, staleDays, target, relationship }) => ({ id: contact.id, title: contact.name, subtitle: [contact.title, contact.firmName].filter(Boolean).join(" · "), score: Math.min(100, Math.round(score)), confidence: 0.9,
      evidence: [`Missing: ${missing.join(", ")}`, target ? "Works at a target firm" : "Not currently at a target firm", relationship?.state === "verified" ? `Verified relationship: ${relationship.evidence[0]}` : "No verified relationship evidence", `Last verified ${staleDays > 9_000 ? "never" : `${Math.round(staleDays)} days ago`}`],
      sourceDate: new Date(contact.enrichedAt || contact.createdAt).toISOString(), warning: !contact.linkedInUrl ? "Add a LinkedIn URL before using the extension capture flow." : undefined,
      links: contact.linkedInUrl ? [{ label: "Open LinkedIn for reviewed capture", href: contact.linkedInUrl }] : undefined, data: { contactId: contact.id, missingFields: missing, estimatedCredits: 1, relationshipState: relationship?.state || "potential" } })),
    warnings: ["Provider data and extension captures remain labeled separately from manual edits and model inference."], freshness: now.toISOString(),
    proposedActions: contactIds.length ? [{ toolName: "enrich_contacts", label: `Enrich ${contactIds.length} selected contacts (estimated ${contactIds.length} credits)`, input: { contactIds, estimatedCredits: contactIds.length } }] : [] };
}

async function firmCoverage(userId: string): Promise<SkillResult> {
  const now = new Date();
  const user = dataOrThrow<Record<string, any> | null>("load target firms", await supabase.from("User").select("targetFirms").eq("id", userId).maybeSingle());
  const targetFirms = parseStoredList(user?.targetFirms);
  const contacts = await contactsWithPipeline(userId, 2_000);
  const relationships = await relationshipsAtCompanies(userId, targetFirms);
  const cards = targetFirms.map((firm) => {
    const matches = contacts.filter((contact) => canonicalCompanyKey(contact.firmName) === canonicalCompanyKey(firm));
    const firmRelationships = relationships.get(canonicalCompanyKey(firm)) || [];
    const verified = firmRelationships.filter((relationship) => relationship.state === "verified");
    const potential = firmRelationships.filter((relationship) => relationship.state === "potential");
    const verifiedIds = new Set(verified.map((relationship) => relationship.contactId));
    const senior = matches.filter((contact) => verifiedIds.has(String(contact.id)) && /director|partner|vp|vice president|head|recruit|talent|manager/i.test(`${contact.title} ${contact.seniorityLevel}`));
    const functions = new Set(matches.map((contact) => contact.role || contact.title).filter(Boolean).map((value) => value.toLowerCase().split(/\s+/).slice(-2).join(" ")));
    const recent = matches.filter((contact) => verifiedIds.has(String(contact.id)) && daysSince(contact.lastSpokenAt) <= 90);
    const active = matches.filter((contact) => contact.pipelineEntries.length > 0);
    const score = Math.min(100, verified.length * 22 + potential.length * 5 + senior.length * 12 + functions.size * 5 + active.length * 5 + recent.length * 8);
    const gap = matches.length === 0 ? "No saved contacts" : verified.length === 0 ? "Potential paths only—none verified" : senior.length === 0 ? "No verified senior or recruiting contact" : recent.length === 0 ? "Verified relationships are stale" : functions.size < 2 ? "Low functional diversity" : "Coverage is healthy";
    const firmQuery = encodeURIComponent(firm);
    return { id: canonicalCompanyKey(firm), title: firm, subtitle: gap, score, confidence: 0.9, evidence: [`${verified.length} verified relationship${verified.length === 1 ? "" : "s"} · ${potential.length} potential path${potential.length === 1 ? "" : "s"}`, `${senior.length} verified senior/recruiting · ${functions.size} represented functions`, `${active.length} active in pipeline · ${recent.length} verified contacts touched in 90 days`], sourceDate: now.toISOString(),
      links: [
        { label: "Discover contacts", href: `/dashboard/discover?company=${firmQuery}` },
        ...(matches.length ? [{ label: "Review contacts", href: `/dashboard/contacts?company=${firmQuery}` }] : []),
      ],
      data: { contactCount: matches.length, verifiedCount: verified.length, potentialCount: potential.length, seniorCount: senior.length, functionalDiversity: functions.size, gap } };
  }).sort((a, b) => a.score - b.score);
  return { skillId: "firm_coverage", title: "Target-firm coverage", summary: cards.length ? "Firms with the largest relationship gaps are ranked first." : "Add target firms to your profile to calculate coverage.", cards, warnings: [], freshness: now.toISOString(), proposedActions: [] };
}

async function whoToContact(userId: string, overdueOnly = false): Promise<SkillResult> {
  const now = new Date();
  const contacts = await contactsWithPipeline(userId, 1_000);
  const relationships = await relationshipsAtCompanies(userId, contacts.map((contact) => String(contact.firmName || "")));
  const relationshipsByContact = new Map(
    [...relationships.values()].flat().map((relationship) => [relationship.contactId, relationship]),
  );
  const ranked = contacts.map((contact) => {
    const relationship = relationshipsByContact.get(String(contact.id));
    const age = daysSince(contact.lastSpokenAt);
    const score = Math.min(100, Number(relationship?.confidence || 0) * 55 + Math.min(30, age / 4) + contact.pipelineEntries.length * 12);
    return { contact, relationship, score, age };
  }).filter((item) => item.relationship?.state === "verified" && (!overdueOnly || item.age >= 30)).sort((a, b) => b.score - a.score).slice(0, 8);
  const potentialCount = [...relationships.values()].flat().filter((relationship) => relationship.state === "potential").length;
  return { skillId: overdueOnly ? "follow_ups" : "who_to_contact", title: overdueOnly ? "Follow-ups to make" : "Who to contact today", summary: ranked.length ? "Ranked only from user-confirmed relationships and recorded interactions." : "No verified relationship is ready for contact yet.",
    cards: ranked.map(({ contact, relationship, score, age }) => ({ id: contact.id, title: contact.name, subtitle: [contact.title, contact.firmName].filter(Boolean).join(" · "), score: Math.round(score), confidence: relationship?.confidence || 0.8,
      evidence: [`Verified ${relationship?.relationshipType}: ${relationship?.evidence[0] || "recorded interaction"}`, `${contact.pipelineEntries.length} active pipeline placement${contact.pipelineEntries.length === 1 ? "" : "s"}`, age > 9_000 ? "No interaction date recorded" : `Last interaction about ${Math.round(age)} days ago`], sourceDate: new Date(contact.lastSpokenAt || relationship?.effectiveAt || contact.createdAt).toISOString(), links: contact.linkedInUrl ? [{ label: "Open LinkedIn", href: contact.linkedInUrl }] : undefined, data: { relationshipState: "verified", contactId: contact.id } })),
    warnings: potentialCount ? [`${potentialCount} imported or inferred path${potentialCount === 1 ? " is" : "s are"} excluded until you verify the relationship.`] : [], freshness: now.toISOString(), proposedActions: [] };
}

export async function executeCareerSkill(input: { skillId: CareerSkillId; userId: string; userEmail: string; parameters?: Record<string, unknown>; onProgress?: (message: string) => void | Promise<void> }): Promise<SkillResult> {
  const parameters = cleanParameters(input.parameters || {});
  switch (input.skillId) {
    case "find_internships": return discoverOpportunities("internship", input.userId, input.userEmail, parameters, input.onProgress);
    case "find_jobs": return discoverOpportunities("full_time", input.userId, input.userEmail, parameters, input.onProgress);
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
