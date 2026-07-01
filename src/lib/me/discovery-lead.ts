import type { MeProfileData } from "./profile";
import { normalizeLinkedInUrl } from "./linkedin-csv";
import { rankAiExperts } from "./rank-ai-experts";

export const DISCOVERY_STATUSES = ["researching", "saved", "dismissed"] as const;
export type DiscoveryLeadStatus = (typeof DISCOVERY_STATUSES)[number];

export interface DiscoveryLeadInput {
  status?: unknown;
  name?: unknown;
  firmName?: unknown;
  title?: unknown;
  linkedInUrl?: unknown;
  email?: unknown;
  location?: unknown;
  education?: unknown;
  industry?: unknown;
  notes?: unknown;
  sourceQuery?: unknown;
  sourceUrl?: unknown;
}

export interface DiscoveryLeadData {
  status: DiscoveryLeadStatus;
  name: string;
  firmName: string | null;
  title: string | null;
  linkedInUrl: string | null;
  email: string | null;
  location: string | null;
  education: string | null;
  industry: string | null;
  notes: string;
  sourceQuery: string;
  sourceUrl: string;
  score: number;
  reasons: string[];
}

const MAX = 2000;
const clean = (value: unknown, max = MAX) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const nullable = (value: unknown, max = MAX) => {
  const v = clean(value, max);
  return v || null;
};

function fallbackName(linkedInUrl: string | null) {
  if (!linkedInUrl) return "";
  const slug = linkedInUrl.split("/in/")[1]?.replace(/[-_]+/g, " ").trim();
  return slug || linkedInUrl;
}

export function sanitizeDiscoveryLeadInput(
  input: DiscoveryLeadInput,
  profile?: Partial<MeProfileData>,
): DiscoveryLeadData {
  const linkedInUrl = normalizeLinkedInUrl(clean(input.linkedInUrl, 500)) || null;
  const name = clean(input.name, 200) || fallbackName(linkedInUrl);
  const status = DISCOVERY_STATUSES.includes(input.status as DiscoveryLeadStatus)
    ? (input.status as DiscoveryLeadStatus)
    : "researching";

  const base = {
    id: "candidate",
    name,
    firmName: clean(input.firmName, 200),
    title: clean(input.title, 250),
    location: clean(input.location, 200),
    linkedInUrl: linkedInUrl || "",
    notes: [clean(input.notes), clean(input.education), clean(input.industry)].filter(Boolean).join(" "),
  };
  const ranked = rankAiExperts([base], profile)[0];

  return {
    status,
    name,
    firmName: nullable(input.firmName, 200),
    title: nullable(input.title, 250),
    linkedInUrl,
    email: nullable(input.email, 320),
    location: nullable(input.location, 200),
    education: nullable(input.education, 500),
    industry: nullable(input.industry, 200),
    notes: clean(input.notes),
    sourceQuery: clean(input.sourceQuery, 1000),
    sourceUrl: clean(input.sourceUrl, 500),
    score: ranked?.score ?? 0,
    reasons: ranked?.reasons ?? [],
  };
}

export function validateDiscoveryLead(data: DiscoveryLeadData): string | null {
  if (!data.name && !data.linkedInUrl) return "Lead needs at least a name or LinkedIn profile URL.";
  return null;
}
