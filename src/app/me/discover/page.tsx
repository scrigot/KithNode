import { prisma, meUserEmail } from "@/lib/me/db";
import { ensurePipelines } from "@/lib/me/pipelines";
import { sanitizeProfileInput } from "@/lib/me/profile";
import { recommendedSearches } from "@/lib/me/rank-ai-experts";
import DiscoveryClient, { type DiscoveryLeadView, type DiscoveryPipelineView, type DiscoverySearchView } from "./discovery-client";

function linkedInPeopleSearch(query: string) {
  const cleaned = query.replace(/site:linkedin\.com\/in/gi, "").replace(/[()"]/g, " ").replace(/\s+/g, " ").trim();
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(cleaned)}`;
}

function googleSearch(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function asReasons(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export default async function MeDiscover() {
  const userId = meUserEmail();
  await ensurePipelines(userId);
  const [profileRow, leadsRaw, pipelinesRaw] = await Promise.all([
    prisma.meProfile.findUnique({ where: { userId } }),
    prisma.meDiscoveryLead.findMany({
      where: { userId, status: { not: "dismissed" } },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      include: { savedContact: { select: { id: true, name: true } } },
      take: 200,
    }),
    prisma.mePipeline.findMany({ where: { userId }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  const profile = profileRow ? sanitizeProfileInput(profileRow) : undefined;
  const searches: DiscoverySearchView[] = recommendedSearches(profile).map((s) => ({
    ...s,
    googleUrl: googleSearch(s.query),
    linkedInUrl: linkedInPeopleSearch(s.query),
  }));
  const leads: DiscoveryLeadView[] = leadsRaw.map((lead) => ({
    id: lead.id,
    status: lead.status,
    name: lead.name,
    firmName: lead.firmName || "",
    title: lead.title || "",
    linkedInUrl: lead.linkedInUrl || "",
    email: lead.email || "",
    location: lead.location || "",
    education: lead.education || "",
    industry: lead.industry || "",
    notes: lead.notes,
    sourceQuery: lead.sourceQuery,
    sourceUrl: lead.sourceUrl,
    score: lead.score,
    reasons: asReasons(lead.reasons),
    savedContactId: lead.savedContactId || "",
    savedContactName: lead.savedContact?.name || "",
  }));
  const pipelines: DiscoveryPipelineView[] = pipelinesRaw.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="px-8 py-10">
      <div className="max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">research cockpit</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Discover AI experts and mentors</h1>
        <p className="mt-2 max-w-3xl text-[14px] text-[#B7AFA7]">
          Find practitioners in AI consulting, AI engineering, data services, and target companies for coffee chats.
          Searches open outside KithNode; capture the useful people here, then save them into contacts and pipelines.
        </p>
      </div>

      <DiscoveryClient searches={searches} leads={leads} pipelines={pipelines} />
    </div>
  );
}
