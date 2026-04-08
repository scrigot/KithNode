/* global URL */
// DuckDuckGo HTML search → company entity discovery.
//
// Ported from backend/app/core/company_finder.py. The Python bot proved
// this exact stack (DDG HTML search + aggressive domain blocklist + title
// pattern filter) is enough to surface real companies for a student doing
// IB / VC / fintech recruiting in the Triangle. We do NOT use a paid API
// in v1 — DDG is free, no key, and adequate when the noise filters are
// strict.
//
// Stage 2 of the discover pipeline. Returns a deduped list of company
// candidates that the contact-finder (Stage 3) walks to extract people.

import * as cheerio from "cheerio";

const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface CompanyResult {
  name: string;
  domain: string;
  url: string;
  description: string;
  source: "ddg";
}

// Lifted verbatim from company_finder.py SKIP_DOMAINS. Every entry here
// represents an entire category of false-positive that the Python bot
// learned the hard way: news sites, job boards, social media, listicles,
// data brokers, government domains, and search engines themselves. Add
// to this list whenever a new noise source bleeds through.
export const SKIP_DOMAINS: ReadonlySet<string> = new Set([
  // Social
  "linkedin.com", "facebook.com", "twitter.com", "x.com",
  "instagram.com", "youtube.com", "reddit.com", "tiktok.com",
  // Job boards
  "indeed.com", "glassdoor.com", "ziprecruiter.com", "lever.co",
  "greenhouse.io", "workday.com", "simplyhired.com", "glassdoor.co.in",
  // Data brokers / startup directories
  "crunchbase.com", "wikipedia.org", "yelp.com", "wellfound.com",
  "angellist.com", "f6s.com", "pitchbook.com", "owler.com",
  "zoominfo.com", "apollo.io", "cbinsights.com",
  // News
  "techcrunch.com", "forbes.com", "bloomberg.com", "wsj.com",
  "wired.com", "theverge.com", "venturebeat.com", "techbullion.com",
  "builtin.com", "grepbeat.com", "wraltechwire.com", "bizjournals.com",
  "businessinsider.com", "axios.com", "businessnc.com",
  // Blogging platforms
  "medium.com", "substack.com",
  // Local listings / directories
  "bbb.org", "mapquest.com", "yellowpages.com",
  "visitnc.com", "city-data.com", "niche.com",
  // Search engines
  "google.com", "bing.com", "duckduckgo.com",
  // Big-tech homepages
  "amazon.com", "apple.com", "microsoft.com",
  // Government / .edu
  "nc.gov", "unc.edu", "duke.edu", "ncsu.edu", "sba.gov",
  // Triangle local orgs (false positives in Python bot's runs)
  "researchtriangle.org", "carolinafintechhub.org", "raleigh-wake.org",
]);

// Title patterns that mark a result as a listicle / article / explainer
// rather than a company entity. Lifted from company_finder.py with TS
// regex syntax.
export const SKIP_TITLE_PATTERNS: readonly RegExp[] = [
  /\bbest\s/i,
  /\btop\s/i,
  /\blist\b/i,
  /things to do/i,
  /where to live/i,
  /\bhow to\b/i,
  /guide to/i,
  /review of/i,
  /\bvs\b/i,
  /comparison/i,
  /\bwhat is\b/i,
  /definition of/i,
];

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * DDG HTML wraps every result link in a redirector:
 *   //duckduckgo.com/l/?uddg=https%3A%2F%2Ftarget.com&rut=...
 * Decode it back to the real URL. Real URLs come through unchanged.
 */
export function decodeDdgHref(href: string): string {
  if (!href) return "";
  const normalized = href.startsWith("//") ? "https:" + href : href;
  if (normalized.includes("duckduckgo.com/l/")) {
    try {
      const u = new URL(normalized);
      const real = u.searchParams.get("uddg");
      if (real) return decodeURIComponent(real);
    } catch {
      return normalized;
    }
  }
  return normalized;
}

export function isUsefulResult(url: string, title: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  for (const skip of SKIP_DOMAINS) {
    if (domain === skip || domain.endsWith("." + skip)) return false;
  }
  if (SKIP_TITLE_PATTERNS.some((p) => p.test(title))) return false;
  return true;
}

/**
 * Run a single DDG search and return parsed result rows. Hits the public
 * HTML endpoint (no key, no rate limit beyond polite throttling). Returns
 * an empty array on any failure — the caller is expected to fall back
 * to seed lists when augmentation comes up empty.
 */
export async function ddgSearch(query: string, maxResults = 10): Promise<CompanyResult[]> {
  const params = new URLSearchParams({ q: query });
  let html: string;
  try {
    const res = await fetch(`${DDG_HTML_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const out: CompanyResult[] = [];
  const seenDomains = new Set<string>();

  $(".result").each((_, el) => {
    if (out.length >= maxResults) return false;
    const $el = $(el);
    const linkEl = $el.find("a.result__a").first();
    const title = linkEl.text().trim();
    const rawHref = linkEl.attr("href") || "";
    const url = decodeDdgHref(rawHref);
    const description = $el.find(".result__snippet").first().text().trim();

    if (!url || !title) return;
    if (!isUsefulResult(url, title)) return;

    const domain = extractDomain(url);
    if (!domain || seenDomains.has(domain)) return;
    seenDomains.add(domain);

    out.push({
      name: title.split(" - ")[0].split(" | ")[0].trim().slice(0, 80),
      domain,
      url,
      description: description.slice(0, 200),
      source: "ddg",
    });
  });

  return out;
}

export interface FindCompaniesOptions {
  /** Max results per query before filtering. Default 10. */
  maxPerQuery?: number;
  /** Throttle between queries to avoid IP bans. Default 1500ms. */
  throttleMs?: number;
}

/**
 * Run a batch of DDG searches and return a deduped (by domain) list of
 * candidate companies. Throttles between queries because DDG has no
 * formal rate limit but will start serving CAPTCHAs if you hammer it.
 */
export async function findCompanies(
  queries: readonly string[],
  options: FindCompaniesOptions = {},
): Promise<CompanyResult[]> {
  const { maxPerQuery = 10, throttleMs = 1500 } = options;
  const seen = new Set<string>();
  const out: CompanyResult[] = [];

  for (let i = 0; i < queries.length; i++) {
    const results = await ddgSearch(queries[i], maxPerQuery);
    for (const r of results) {
      if (seen.has(r.domain)) continue;
      seen.add(r.domain);
      out.push(r);
    }
    if (i < queries.length - 1 && throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }

  return out;
}

/**
 * Build a set of DDG search queries for a user's recruiting profile.
 * Used by Stage 2 when seed lists alone don't yield enough variety
 * (e.g., a user targeting "early-stage fintech in Charlotte" who isn't
 * served by the canonical Bulge Bracket / Mega PE seed lists).
 */
export function buildSearchQueries(
  industries: readonly string[],
  locations: readonly string[],
): string[] {
  const queries: string[] = [];
  for (const industry of industries) {
    if (!industry) continue;
    if (locations.length === 0) {
      queries.push(`"${industry}" companies -jobs -careers`);
      continue;
    }
    for (const location of locations) {
      if (!location) continue;
      queries.push(`"${industry}" "${location}" -jobs -careers`);
    }
  }
  return queries;
}
