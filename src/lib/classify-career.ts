// Heuristic career-track classifier. Maps a contact's title (highest precision)
// and, failing that, their firm name (tier fallback) onto the taxonomy's
// {track, role}. Pure + zero-config — no LLM, no network. Used at import time,
// by the backfill script, and as the lowest-precedence fallback in the
// enrichment route.
//
// Title regexes win because a title states what someone DOES; a firm only hints
// at the field. The firm fallback reuses the EXACT tier arrays exported from
// linkedin-import.ts (FRONTIER_LAB, BULGE_BRACKET, ...) so the warmth scorer and
// this classifier can never drift on which firms count.

import {
  FRONTIER_LAB,
  AI_UNICORN,
  BIG_TECH_AI,
  BULGE_BRACKET,
  ELITE_BOUTIQUE,
  MEGA_PE,
  HEDGE_FUNDS,
  MBB,
  BIG4,
} from "@/lib/linkedin-import";

export interface CareerClassification {
  track: string;
  role: string;
}

const EMPTY: CareerClassification = { track: "", role: "" };

// Ordered title rules — FIRST match wins, so the most specific patterns sit on
// top (e.g. "ml engineer" before a bare "engineer" would, and "ai research"
// before generic AI). Each entry maps a title regex to a taxonomy {track, role}.
const TITLE_RULES: { re: RegExp; track: string; role: string }[] = [
  // Startups (before everything — "Founding Engineer" must beat the generic
  // SWE rule, and "Founder & CEO at X" must not fall through to finance/firm rules)
  { re: /\bfounding\s*engineer\b/i, track: "Startups", role: "Founding Engineer" },
  { re: /\b(?:co[\s-]*)?founder\b/i, track: "Startups", role: "Founder" },
  // AI (most specific first — these must beat the generic SWE rule below)
  { re: /\bml\s*engineer\b|\bmachine\s*learning\s*engineer\b/i, track: "AI", role: "ML Engineer" },
  { re: /\bai\s*engineer\b/i, track: "AI", role: "AI Engineer" },
  { re: /\b(?:ai|ml)\s*research(?:er)?\b/i, track: "AI", role: "AI Research" },
  // Data Science
  { re: /\bdata\s*scientist\b/i, track: "Data Science", role: "Data Science" },
  { re: /\bdata\s*engineer\b/i, track: "Data Science", role: "Data Engineering" },
  { re: /\bquant(?:itative)?\b/i, track: "Data Science", role: "Quant" },
  // CS/Tech
  { re: /\bsoftware\s*(?:engineer|developer)\b|\bsoftware\s*dev\b|\bswe\b/i, track: "CS/Tech", role: "Software Engineering" },
  { re: /\bproduct\s*manager\b|\bproduct\s*management\b/i, track: "CS/Tech", role: "Product Management" },
  // Finance
  { re: /\binvestment\s*banking\b|\bib\s*analyst\b/i, track: "Finance", role: "Investment Banking" },
  { re: /\bprivate\s*equity\b/i, track: "Finance", role: "Private Equity" },
  { re: /\bventure\b/i, track: "Finance", role: "Venture Capital" },
  { re: /\btrader\b|\btrading\b/i, track: "Finance", role: "Sales & Trading" },
  { re: /\bequity\s*research\b/i, track: "Finance", role: "Equity Research" },
  { re: /\bwealth\b/i, track: "Finance", role: "Wealth Management" },
  // Consulting
  { re: /\bconsultant\b|\bconsulting\b/i, track: "Consulting", role: "Management Consulting" },
];

// Firm tier fallback — only consulted when no title rule fired. Reuses the
// exported tier arrays. AI labs map to the AI track with NO role (a frontier lab
// alone doesn't tell us engineer vs research vs product), so role stays "" unless
// the title resolved it above. Finance/consulting tiers carry their canonical role.
const FIRM_RULES: { tiers: RegExp[]; track: string; role: string }[] = [
  { tiers: FRONTIER_LAB, track: "AI", role: "" },
  { tiers: AI_UNICORN, track: "AI", role: "" },
  { tiers: BIG_TECH_AI, track: "AI", role: "" },
  { tiers: MEGA_PE, track: "Finance", role: "Private Equity" },
  { tiers: BULGE_BRACKET, track: "Finance", role: "Investment Banking" },
  { tiers: ELITE_BOUTIQUE, track: "Finance", role: "Investment Banking" },
  { tiers: HEDGE_FUNDS, track: "Finance", role: "Hedge Fund" },
  { tiers: MBB, track: "Consulting", role: "Management Consulting" },
  { tiers: BIG4, track: "Consulting", role: "Management Consulting" },
];

/**
 * Classify a contact into {track, role} from their title + firm (+ skills, which
 * only top up the title tier). Both fields are "" when nothing matches — the
 * caller treats that as "unknown, leave alone".
 *
 * Precedence: title rules (precise) -> firm tier (field hint). When a firm tier
 * resolves the track but not the role (AI labs), the role stays "".
 */
export function classifyCareer(input: {
  title?: string | null;
  firmName?: string | null;
  skills?: string | null;
}): CareerClassification {
  // Title + skills share the precise tier: a profile listing "Machine Learning"
  // in skills but a vague title should still surface the AI signal. Firm is kept
  // out of this blob so it can act as a strictly lower-precedence fallback.
  const titleBlob = `${input.title ?? ""} ${input.skills ?? ""}`;
  for (const rule of TITLE_RULES) {
    if (rule.re.test(titleBlob)) {
      return { track: rule.track, role: rule.role };
    }
  }

  const firm = input.firmName ?? "";
  if (firm) {
    for (const rule of FIRM_RULES) {
      if (rule.tiers.some((p) => p.test(firm))) {
        return { track: rule.track, role: rule.role };
      }
    }
  }

  return { ...EMPTY };
}
