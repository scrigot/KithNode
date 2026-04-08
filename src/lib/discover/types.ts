// Shared types for the Discover pipeline.
//
// The pipeline ports the Python cold-outreach bot (backend/app/core/*.py)
// into TypeScript so KithNode Discover can find and qualify NEW contacts
// (not just reshuffle the shared CSV pool). Every signal carries a source
// URL and a confidence so we can enforce identity anchoring (the v1 → v2
// fix that killed false attribution in the Python bot).

export type Tier = "hot" | "warm" | "monitor" | "cold";

export type SignalType =
  | "firm-tier"
  | "seniority"
  | "affinity"
  | "industry"
  | "location"
  | "intent"
  | "email";

/**
 * One piece of evidence about a contact. Anchored to a single source
 * document (sourceUrl) — never pooled across results.
 */
export interface Signal {
  type: SignalType;
  label: string;
  boost: number;
  sourceUrl: string;
  /** 0.0 – 1.0. Penalises uncertain identity anchoring. */
  confidence: number;
}

export interface DiscoveredContactMeta {
  education?: string;
  location?: string;
  industry?: string;
  seniorityLevel?: string;
}

export interface DiscoveredContact {
  name: string;
  company: string;
  companyDomain: string;
  title: string;
  email: string;
  /** 0.0 – 1.0. Hunter score, or 0.5 for pattern guess. */
  emailConfidence: number;
  linkedinUrl: string;
  signals: Signal[];
  meta: DiscoveredContactMeta;
  /** Pipeline stage that produced this row: "team_page" | "linkedin_search" | "ddg_seed" | ... */
  source: string;
}

export interface RankBreakdown {
  fit: number;          // 0–100, firm tier + seniority + industry
  affinity: number;     // 0–100, school + greek + hometown + employer
  reachability: number; // 0–100, email confidence × role accessibility
  intent: number;       // 0–100, recent job change / funding (v2)
  confidence: number;   // 0.0–1.0, weighted average of signal confidences
}

export interface RankResult extends RankBreakdown {
  /** Final composite, 0–100, after confidence multiplier. */
  score: number;
  tier: Tier;
}
