// Signal detector — Stage 4 of the discover pipeline.
//
// Turns a ContactCandidate (from Stage 3) into an anchored Signal[] that
// the ranker can score. Reuses the existing detectAffiliations() helper so we
// don't fork the affiliation logic — there is one source of truth for
// "what does it mean to be an alum / a target firm / a Bulge Bracket
// employee", and it lives in linkedin-import.ts.
//
// Identity anchoring (the v1 → v2 fix from the Python bot):
//   1. Every emitted Signal carries the sourceUrl that produced it.
//   2. KithNode never fetches LinkedIn pages. LinkedIn URLs are navigation
//      targets only; every signal is derived from the approved public source
//      that emitted the candidate.

import { detectAffiliations, type ContactMeta } from "@/lib/linkedin-import";
import type { UserPrefs } from "@/lib/user-prefs";
import type { ContactCandidate } from "./contact-finder";
import type { Signal, SignalType } from "./types";

const FIRM_TIER_LABELS = new Set([
  "Bulge Bracket",
  "Elite Boutique",
  "Mega PE",
  "Hedge Fund",
  "MBB",
  "Big 4",
]);

const SENIORITY_LABELS = new Set(["Senior", "VP", "Associate", "Analyst", "Incoming"]);

const CONFIDENCE_TEAM_PAGE = 0.85;
const CONFIDENCE_LINKEDIN_SEARCH = 0.7;

/**
 * Map an affiliation label produced by linkedin-import.ts:detectAffiliations
 * onto our SignalType taxonomy. Firm tiers and seniority labels are
 * universal; per-user matches all collapse to "affinity" except for
 * Target Industry / Target Location which have their own categories so
 * the ranker can weight them separately.
 */
export function classifyAffiliation(label: string): SignalType {
  const stripped = label.replace(/\s*\(Incoming\)\s*$/i, "").trim();
  if (FIRM_TIER_LABELS.has(stripped)) return "firm-tier";
  if (SENIORITY_LABELS.has(stripped)) return "seniority";
  if (stripped === "Target Industry") return "industry";
  if (stripped === "Target Location") return "location";
  return "affinity";
}

/**
 * Build a ContactMeta from candidate row data alone. Used as the
 * fallback path when there's no LinkedIn URL or the scraped profile is
 * for the wrong person. Lets detectAffiliations() still pick up firm
 * tier + seniority + per-user matches against the title/company strings.
 */
export function syntheticMeta(contact: ContactCandidate): ContactMeta {
  return {
    name: contact.name,
    title: contact.title,
    experience: contact.company,
    education: "",
    location: "",
  };
}

/**
 * Identity-anchor check: do the scraped LinkedIn name and the candidate
 * name plausibly refer to the same person?
 *
 * Compares the first and last alphabetic tokens of each name. This
 * tolerates middle initials, suffixes, and case differences ("Alice
 * Johnson" matches "alice m johnson") but rejects unrelated people
 * ("Alice Johnson" vs "Bob Builder").
 */
export function namesPlausiblyMatch(a: string, b: string): boolean {
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z]/g, ""))
      .filter((t) => t.length > 0);
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  return ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
}

/**
 * Detect signals for a single discovered contact, anchored to a
 * verifiable source URL. Async because the LinkedIn meta-tag fetch is.
 */
export async function detectSignals(
  contact: ContactCandidate,
  prefs: UserPrefs,
): Promise<Signal[]> {
  const meta: ContactMeta = syntheticMeta(contact);
  const sourceUrl = contact.sourceUrl;
  const confidence =
    contact.source === "team_page" ? CONFIDENCE_TEAM_PAGE : CONFIDENCE_LINKEDIN_SEARCH;

  const affiliations = detectAffiliations(meta, prefs);
  return affiliations.map((a) => ({
    type: classifyAffiliation(a.name),
    label: a.name,
    boost: a.boost,
    sourceUrl,
    confidence,
  }));
}
