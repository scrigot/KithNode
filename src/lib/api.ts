/**
 * Centralized API client for the FastAPI backend.
 *
 * All backend communication goes through this module.
 * Called from Next.js API routes (server-side proxy pattern).
 */

const FASTAPI_URL =
  process.env.FASTAPI_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${FASTAPI_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || res.statusText, res.status);
  }

  return res.json();
}

// ─── Contacts ────────────────────────────────────────────────────────

export interface RankedContact {
  id: number;
  name: string;
  title: string;
  email: string;
  email_status: string;
  linkedin_url: string;
  education: string;
  linkedin_location: string;
  why_now: string;
  warm_path: string;
  company: {
    name: string;
    domain: string;
    website: string;
    location: string;
    industry_tags: string[];
    description: string;
  };
  score: {
    fit_score: number;
    signal_score: number;
    engagement_score: number;
    total_score: number;
    tier: string;
    scored_at: string;
  };
}

export interface ContactDetail extends RankedContact {
  email_confidence: string;
  education: string;
  linkedin_location: string;
  source: string;
  affiliations: { id: number; name: string; boost: number }[];
  outreach_history: {
    id: number;
    email_subject: string;
    email_body: string;
    status: string;
    sent_at: string | null;
    replied_at: string | null;
    created_at: string;
  }[];
  signals: {
    id: number;
    signal_type: string;
    description: string;
    strength: number;
    source_url: string;
    detected_at: string;
  }[];
}

export function getContactsRanked(
  minScore = 0,
  limit = 100,
  curated = false,
): Promise<RankedContact[]> {
  return request(`/api/contacts/ranked?min_score=${minScore}&limit=${limit}&curated=${curated}`);
}

// ─── Pipeline ────────────────────────────────────────────────────────

export interface PipelineContact {
  id: number;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  education: string;
  company_name: string;
  company_location: string;
  total_score: number;
  tier: string;
  stage: string;
  notes: string;
  added_at: string;
  affiliations: string[];
}

export interface PipelineResponse {
  stages: string[];
  contacts: Record<string, PipelineContact[]>;
  total: number;
}

export function getPipeline(): Promise<PipelineResponse> {
  return request("/api/pipeline");
}

export function addToPipeline(
  contactId: number,
  stage = "researched",
): Promise<{ contact_id: number; pipeline_id: number; stage: string }> {
  return request(`/api/pipeline/${contactId}`, {
    method: "POST",
    body: JSON.stringify({ stage }),
  });
}

export function updatePipelineStage(
  contactId: number,
  stage: string,
  notes?: string,
): Promise<{ contact_id: number; stage: string }> {
  return request(`/api/pipeline/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ stage, notes }),
  });
}

export function getContactDetail(id: number): Promise<ContactDetail> {
  return request(`/api/contacts/${id}`);
}

// ─── Signals ─────────────────────────────────────────────────────────

export interface CompanySignals {
  company_name: string;
  domain: string;
  signals: {
    id: number;
    signal_type: string;
    description: string;
    strength: number;
    source_url: string;
    detected_at: string;
  }[];
  signal_stack: {
    should_outreach: boolean;
    reason: string;
    combined_strength: number;
  };
}

export function getSignals(domain: string): Promise<CompanySignals> {
  return request(`/api/signals/${domain}`);
}

// ─── Outreach ────────────────────────────────────────────────────────

export interface DraftResult {
  contact_id: number;
  subject: string;
  body: string;
  outreach_id: number;
}

export function draftOutreach(contactId: number): Promise<DraftResult> {
  return request("/api/outreach/draft", {
    method: "POST",
    body: JSON.stringify({ contact_id: contactId }),
  });
}

export function updateOutreachStatus(
  outreachId: number,
  status: string,
): Promise<{ outreach_id: number; status: string; message: string }> {
  return request(`/api/outreach/${outreachId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// ─── Stats ───────────────────────────────────────────────────────────

export interface Stats {
  companies: number;
  contacts: number;
  signals: number;
  scored: number;
  affiliations: number;
  emails_verified: number;
  outreach_drafted: number;
}

export function getStats(): Promise<Stats> {
  return request("/api/stats");
}

// ─── Discover / Training ─────────────────────────────────────────────

export interface DiscoverContact {
  id: number;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  education: string;
  linkedin_location: string;
  company_name: string;
  company_domain: string;
  company_location: string;
  company_industry_tags: string[];
  affiliations: string[];
  total_score: number;
  fit_score: number;
  signal_score: number;
  engagement_score: number;
  tier: string;
  signals: { type: string; description: string }[];
}

export interface RatingsProgress {
  total_ratings: number;
  high_value_count: number;
  skip_count: number;
  not_interested_count: number;
  learning_active: boolean;
  ratings_needed: number;
}

export interface DiscoverResponse {
  contacts: DiscoverContact[];
  total_unrated: number;
  ratings_progress: RatingsProgress;
}

export function getDiscover(limit = 10): Promise<DiscoverResponse> {
  return request(`/api/discover?limit=${limit}`);
}

export function rateContact(
  contactId: number,
  rating: "high_value" | "skip" | "not_interested",
): Promise<{
  contact_id: number;
  rating: string;
  total_ratings: number;
  learning_active: boolean;
  message: string;
}> {
  return request(`/api/contacts/${contactId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}

// ─── Import ──────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  failed: number;
  contacts: {
    id: number;
    name: string;
    title: string;
    linkedin_url: string;
    company_name: string;
    company_domain: string;
    affiliations: string[];
    total_score: number;
    tier: string;
    error: string | null;
  }[];
}

export function importLinkedIn(urls: string[]): Promise<ImportResult> {
  return request("/api/import/linkedin", {
    method: "POST",
    body: JSON.stringify({ urls }),
  });
}

// ─── Preferences ─────────────────────────────────────────────────────

export interface Preferences {
  ratings_summary: RatingsProgress;
  learned_weights: {
    dimension: string;
    feature: string;
    lift_factor: number;
    sample_count: number;
  }[];
  learning_active: boolean;
}

export function getPreferences(): Promise<Preferences> {
  return request("/api/preferences");
}

export function recalculatePreferences(): Promise<{
  learning_active: boolean;
  weights_updated: number;
  contacts_rescored: number;
  message: string;
}> {
  return request("/api/preferences/recalculate", { method: "POST" });
}
