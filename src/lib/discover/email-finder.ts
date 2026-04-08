// Email finder — Stage 5 of the discover pipeline.
//
// Two-tier waterfall ported from backend/app/core/email_finder.py:
//
//   Tier 1  Hunter.io Email Finder API
//           Returns email + 0–100 confidence score from Hunter's database.
//           Free tier: 50 searches/month, then $34/mo. Caches the
//           per-domain email pattern (returned by Hunter's Domain Search
//           on a hit) so subsequent contacts at the same company don't
//           burn the free tier.
//
//   Tier 2  Pattern guess
//           If Hunter is exhausted or returns nothing, guess the address
//           from {firstName, lastName, domain} using either the cached
//           pattern from a prior Hunter call or the most common patterns
//           in order: first.last@, first@, flast@, firstlast@. Tagged
//           confidence 0.5 so the ranker sinks the row appropriately.
//
// Identity anchoring: this module never invents a name. It takes whatever
// the upstream contact-finder validated and only synthesizes the local
// part of the email. The waterfall result carries `source` so the UI can
// show whether an address was verified or guessed.

const HUNTER_BASE = "https://api.hunter.io/v2";

// In-memory pattern cache. Lives for the lifetime of the Lambda warm
// pool — Vercel Fluid Compute reuses instances across requests, so this
// dramatically reduces Hunter calls in practice. Cold-start safe (empty
// map). For a hard guarantee across cold starts, persist into the
// AlumniContact.enrichmentSource JSON column at write time.
const PATTERN_CACHE = new Map<string, string>();

export type EmailSource = "hunter_verified" | "pattern_cached" | "pattern_guess" | "none";

export interface EmailResult {
  email: string;
  /** 0.0 – 1.0. Hunter's 0–100 score scaled, or 0.5 for pattern guess. */
  confidence: number;
  source: EmailSource;
  /** Hunter's remaining-credits hint, when available. */
  hunterCreditsRemaining?: number;
}

const NO_EMAIL: EmailResult = { email: "", confidence: 0, source: "none" };

// ── Hunter API wrappers ───────────────────────────────────────────────

interface HunterEmailFinderResponse {
  data?: {
    email?: string;
    score?: number;
    pattern?: string;
  };
  meta?: {
    results?: number;
  };
}

interface HunterDomainSearchResponse {
  data?: {
    pattern?: string;
  };
  meta?: {
    results?: number;
  };
}

/**
 * Hunter Email Finder. Returns the verified email + score, or null on
 * any failure (network, 401, 404, throttled). Never throws — caller
 * falls through to the pattern tier on null.
 */
export async function hunterEmailFinder(
  firstName: string,
  lastName: string,
  domain: string,
  apiKey: string,
): Promise<{ email: string; score: number; pattern?: string } | null> {
  if (!firstName || !lastName || !domain || !apiKey) return null;
  const params = new URLSearchParams({
    domain,
    first_name: firstName,
    last_name: lastName,
    api_key: apiKey,
  });
  try {
    const res = await fetch(`${HUNTER_BASE}/email-finder?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as HunterEmailFinderResponse;
    const email = json.data?.email;
    const score = json.data?.score;
    if (!email || typeof score !== "number") return null;
    return { email, score, pattern: json.data?.pattern };
  } catch {
    return null;
  }
}

/**
 * Hunter Domain Search. Returns just the company-wide email pattern
 * (e.g. `{first}.{last}`) so we can cache it for cheap pattern guesses
 * on subsequent contacts at the same company. Returns null on failure.
 */
export async function hunterDomainPattern(
  domain: string,
  apiKey: string,
): Promise<string | null> {
  if (!domain || !apiKey) return null;
  const params = new URLSearchParams({ domain, api_key: apiKey, limit: "1" });
  try {
    const res = await fetch(`${HUNTER_BASE}/domain-search?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as HunterDomainSearchResponse;
    return json.data?.pattern ?? null;
  } catch {
    return null;
  }
}

// ── Pattern guesser ───────────────────────────────────────────────────

/**
 * Render a Hunter-style email pattern with a real first/last name.
 * Hunter patterns use placeholders like `{first}.{last}`, `{first}`,
 * `{f}{last}`. Lowercase, alpha-only. Returns "" if the pattern can't
 * be rendered (unknown placeholder).
 */
export function renderPattern(pattern: string, firstName: string, lastName: string): string {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "");
  if (!f || !l) return "";
  return pattern
    .replace(/\{first\}/g, f)
    .replace(/\{last\}/g, l)
    .replace(/\{f\}/g, f[0] || "")
    .replace(/\{l\}/g, l[0] || "");
}

/**
 * Default pattern fallbacks when we have no Hunter signal at all.
 * Ordered by frequency in real corporate domains (per Hunter's own
 * 2024 stats and the Python bot's empirical hit-rate).
 */
export const DEFAULT_GUESS_PATTERNS: readonly string[] = [
  "{first}.{last}",
  "{first}",
  "{f}{last}",
  "{first}{last}",
  "{last}.{first}",
];

export function guessEmail(
  firstName: string,
  lastName: string,
  domain: string,
  cachedPattern?: string,
): string {
  if (!firstName || !lastName || !domain) return "";
  if (cachedPattern) {
    const local = renderPattern(cachedPattern, firstName, lastName);
    if (local) return `${local}@${domain}`;
  }
  const local = renderPattern(DEFAULT_GUESS_PATTERNS[0], firstName, lastName);
  return local ? `${local}@${domain}` : "";
}

// ── Waterfall orchestration ───────────────────────────────────────────

export interface FindEmailOptions {
  /** Hunter API key. Pulled from process.env.HUNTER_API_KEY by callers. */
  hunterApiKey?: string;
  /** Disable Hunter even if a key is configured (e.g. quota exhausted). */
  skipHunter?: boolean;
}

function splitName(fullName: string): { first: string; last: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { first: tokens[0] || "", last: "" };
  return { first: tokens[0], last: tokens[tokens.length - 1] };
}

/**
 * Top-level email finder. Runs the Hunter → pattern waterfall and
 * caches any pattern Hunter returns so the next contact at the same
 * domain can skip the Hunter call.
 */
export async function findEmail(
  fullName: string,
  domain: string,
  options: FindEmailOptions = {},
): Promise<EmailResult> {
  if (!fullName || !domain) return NO_EMAIL;

  const { first, last } = splitName(fullName);
  if (!first || !last) return NO_EMAIL;

  const apiKey = options.hunterApiKey;
  const cached = PATTERN_CACHE.get(domain);

  // Tier 1: Hunter Email Finder (skipped if no key, no last name, or
  // explicitly disabled by quota guard).
  if (apiKey && !options.skipHunter) {
    const hit = await hunterEmailFinder(first, last, domain, apiKey);
    if (hit) {
      if (hit.pattern && !cached) PATTERN_CACHE.set(domain, hit.pattern);
      return {
        email: hit.email,
        confidence: Math.max(0, Math.min(1, hit.score / 100)),
        source: "hunter_verified",
      };
    }
  }

  // Tier 2: pattern guess from a previously-cached pattern.
  if (cached) {
    const email = guessEmail(first, last, domain, cached);
    if (email) return { email, confidence: 0.6, source: "pattern_cached" };
  }

  // Tier 2 fallback: pattern guess from the most common default pattern.
  const fallback = guessEmail(first, last, domain);
  if (fallback) return { email: fallback, confidence: 0.5, source: "pattern_guess" };

  return NO_EMAIL;
}

/** Test helper — clears the in-memory pattern cache between unit tests. */
export function _resetPatternCache(): void {
  PATTERN_CACHE.clear();
}

/** Test helper — seed the cache (used to verify cache-hit pathways). */
export function _setPatternCacheEntry(domain: string, pattern: string): void {
  PATTERN_CACHE.set(domain, pattern);
}
