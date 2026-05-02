/* global URL */
// Professor scraper -- Stage 1 of the Professors pipeline.
//
// Mirrors the Discover pipeline structure (entity-finder -> contact-finder)
// but targets UNC department faculty pages instead of company team pages.
// Two strategies:
//   "wp-api"     -- CS and Econ expose a WordPress REST API. Fast, structured.
//   "ddg-scrape" -- Kenan and STOR do not; we find profiles via DDG then
//                   scrape each page individually.
//
// Lane B (classifier) consumes Professor[] and adds profType + recentPaper.
// Lane E (upsert) writes to AlumniContact. This file is pure I/O + parsing,
// no DB calls.

import * as cheerio from "cheerio";
import { DEPARTMENT_SEEDS, type DepartmentSeed } from "./seeds";
import { scrapeKenanFaculty } from "./kenan-directory";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DDG_HTML_URL = "https://html.duckduckgo.com/html/";

// Matches any UNC-family email address. Keep in sync with allowed domains
// if new dept subdomains appear.
const UNC_EMAIL_RE =
  /[a-z0-9._%+-]+@(?:unc\.edu|cs\.unc\.edu|econ\.unc\.edu|kenan-flagler\.unc\.edu|stor\.unc\.edu)/i;

// WP designation slugs we keep. Anything not in this set is support staff,
// a grad student, or a postdoc -- not a faculty member worth reaching out to.
const FACULTY_DESIGNATION_SLUGS = new Set([
  "faculty",
  "professor",
  "assistant-professor",
  "associate-professor",
  "adjunct",
  "adjunct-professor",
  "teaching-professor",
  "teaching-track",
  "tenure-track",
  "emeritus",
  "professor-emeritus",
  "lecturer",
  "senior-lecturer",
  "distinguished-professor",
  "joint-faculty",
  "visiting-professor",
]);

// Slugs that explicitly mark non-faculty -- excluded even if they appear
// alongside a faculty designation (defensive: some WP sites double-tag).
const NON_FACULTY_SLUGS = new Set([
  "staff",
  "phd-student",
  "phd",
  "graduate-student",
  "postdoc",
  "postdoctoral",
  "postdoctoral-researcher",
  "undergraduate",
]);

export interface Professor {
  name: string;
  /** Empty string when not found -- Lane E still upserts the row. */
  email: string;
  /** e.g. "Associate Professor of Computer Science" */
  title: string;
  /** From DepartmentSeed.firmName. */
  department: string;
  /** Raw bio text for Lane B classifier. */
  bio: string;
  profileUrl: string;
  /** Extracted from WP taxonomies or bio keywords. */
  researchAreas: string[];
}

// -- Shared helpers ----------------------------------------------------------

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T = unknown>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pull the first UNC-family email from raw HTML. Returns "" if none found. */
function extractEmail(html: string): string {
  const match = UNC_EMAIL_RE.exec(html);
  return match ? match[0].toLowerCase() : "";
}

/** Strip HTML tags, collapse whitespace, cap at maxLen chars. */
function stripHtml(html: string, maxLen = 2000): string {
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim().slice(0, maxLen);
}

// -- DDG profile URL discovery (shared by ddg-scrape strategy) ---------------

/** Decode DDG's redirect wrapper -- same logic as entity-finder.ts. */
function decodeDdgHref(href: string): string {
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

/**
 * Run a DDG HTML search and return decoded URLs from the result links.
 * Mirrors ddgSearch() in entity-finder.ts but returns raw URLs instead of
 * structured CompanyResult -- we only need the profile URL, not metadata.
 */
async function ddgSearch(query: string, maxResults = 50): Promise<string[]> {
  const params = new URLSearchParams({ q: query });
  const html = await fetchText(`${DDG_HTML_URL}?${params}`);
  if (!html) return [];

  const $ = cheerio.load(html);
  const urls: string[] = [];

  $(".result").each((_, el) => {
    if (urls.length >= maxResults) return false;
    const href = $(el).find("a.result__a").first().attr("href") || "";
    if (!href) return;
    const decoded = decodeDdgHref(href);
    if (decoded) urls.push(decoded);
  });

  return urls;
}

// -- WP taxonomy helpers -----------------------------------------------------

interface WpTerm {
  id: number;
  slug: string;
  name: string;
}

/**
 * Fetch a WP taxonomy term list and return an id->slug map.
 * Returns empty map on any failure -- caller skips filtering gracefully.
 */
async function fetchWpTermMap(
  baseUrl: string,
  taxonomy: string,
): Promise<Map<number, string>> {
  const url = `${baseUrl}/wp-json/wp/v2/${taxonomy}?per_page=100`;
  const terms = await fetchJson<WpTerm[]>(url);
  if (!terms || !Array.isArray(terms)) return new Map();
  return new Map(terms.map((t) => [t.id, t.slug]));
}

interface WpEmbeddedTerm {
  id: number;
  taxonomy: string;
  slug: string;
}

interface WpPost {
  title: { rendered: string };
  link: string;
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    "wp:term"?: WpEmbeddedTerm[][];
  };
}

/** Extract term IDs from a WP _embedded post's taxonomy links. */
function getTermIds(post: WpPost, taxonomy: string): number[] {
  const groups = post._embedded?.["wp:term"];
  if (!Array.isArray(groups)) return [];
  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    if (group[0]?.taxonomy === taxonomy) {
      return group.map((t) => t.id);
    }
  }
  return [];
}

// -- wp-api strategy ---------------------------------------------------------

async function scrapeWpApi(
  seed: DepartmentSeed,
  throttleMs: number,
): Promise<Professor[]> {
  const apiUrl = `${seed.baseUrl}${seed.apiEndpoint}`;
  const posts = await fetchJson<WpPost[]>(apiUrl);
  if (!posts || !Array.isArray(posts)) return [];

  // Resolve designation slugs (CS has this taxonomy; Econ may not -- we
  // attempt anyway and fall back to an empty map on 404).
  const designationMap = await fetchWpTermMap(seed.baseUrl, "designation");

  // Resolve research-field taxonomy (CS only -- Econ silently gets empty map).
  const researchFieldMap = await fetchWpTermMap(seed.baseUrl, "research-field");

  const out: Professor[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const name = stripHtml(post.title.rendered, 200);
    if (!name) continue;

    // Filter by designation when the taxonomy is available.
    if (designationMap.size > 0) {
      const designationIds = getTermIds(post, "designation");
      // No designation terms at all -- treat as non-faculty.
      if (designationIds.length === 0) continue;
      const slugs = designationIds.map((id) => designationMap.get(id) ?? "");
      if (slugs.some((s) => NON_FACULTY_SLUGS.has(s))) continue;
      if (!slugs.some((s) => FACULTY_DESIGNATION_SLUGS.has(s))) continue;
    }

    // Extract research areas from the research-field taxonomy.
    const researchAreas: string[] = [];
    if (researchFieldMap.size > 0) {
      const rfIds = getTermIds(post, "research-field");
      for (const id of rfIds) {
        const slug = researchFieldMap.get(id);
        if (slug) researchAreas.push(slug);
      }
    }

    const rawBio = post.content.rendered || post.excerpt.rendered || "";
    const bio = stripHtml(rawBio);
    const title = inferTitle(seed.firmName, designationMap, getTermIds(post, "designation"));

    // Throttle before profile page fetch (skip for first item).
    if (i > 0 && throttleMs > 0) await wait(throttleMs);

    const profileHtml = await fetchText(post.link);
    const email = profileHtml ? extractEmail(profileHtml) : "";

    out.push({
      name,
      email,
      title,
      department: seed.firmName,
      bio,
      profileUrl: post.link,
      researchAreas,
    });
  }

  return out;
}

/**
 * Build a human-readable title from designation taxonomy slugs.
 * Falls back to "Faculty, <dept>" when no recognised slug maps.
 */
function inferTitle(firmName: string, designationMap: Map<number, string>, ids: number[]): string {
  if (ids.length === 0) return `Faculty, ${firmName}`;
  const slugs = ids.map((id) => designationMap.get(id) ?? "").filter((s) => s.length > 0);
  const ranked = [
    "distinguished-professor",
    "professor-emeritus",
    "emeritus",
    "assistant-professor",
    "associate-professor",
    "professor",
    "teaching-professor",
    "teaching-track",
    "tenure-track",
    "adjunct-professor",
    "adjunct",
    "visiting-professor",
    "lecturer",
    "senior-lecturer",
    "joint-faculty",
    "faculty",
  ];
  for (const r of ranked) {
    if (slugs.includes(r)) {
      return slugToTitle(r) + `, ${firmName}`;
    }
  }
  return `Faculty, ${firmName}`;
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// -- ddg-scrape strategy -----------------------------------------------------

async function scrapeDdg(
  seed: DepartmentSeed,
  throttleMs: number,
): Promise<Professor[]> {
  let candidateUrls: string[];
  try {
    candidateUrls = await ddgSearch(seed.ddgQuery ?? "", 50);
  } catch {
    console.warn(`[professors] DDG search failed for ${seed.slug} -- returning []`);
    return [];
  }

  if (candidateUrls.length === 0) {
    console.warn(`[professors] DDG returned 0 results for ${seed.slug}`);
    return [];
  }

  const profileUrls = seed.profileUrlPattern
    ? candidateUrls.filter((u) => seed.profileUrlPattern!.test(u))
    : candidateUrls;

  if (profileUrls.length === 0) {
    console.warn(`[professors] No profile URLs matched pattern for ${seed.slug}`);
    return [];
  }

  const out: Professor[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < profileUrls.length; i++) {
    const url = profileUrls[i];

    if (i > 0 && throttleMs > 0) await wait(throttleMs);

    const html = await fetchText(url);
    if (!html) continue;

    const prof = extractProfileFromHtml(html, url, seed.firmName);
    if (!prof || !prof.name) continue;

    const key = `${prof.name.toLowerCase()}|${seed.firmName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(prof);
  }

  return out;
}

/**
 * Extract Professor fields from a faculty profile page HTML.
 * Tries og:title / h1 for name, h2 / subtitle selector for title,
 * main content paragraphs for bio.
 */
function extractProfileFromHtml(
  html: string,
  profileUrl: string,
  department: string,
): Professor | null {
  const $ = cheerio.load(html);

  // Name: og:title is most reliable on modern WP sites; h1 as fallback.
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const h1Text = $("h1").first().text().trim();
  const rawName = ogTitle || h1Text;
  if (!rawName) return null;
  // Strip site suffix patterns like " | UNC STOR" or " - Kenan-Flagler"
  const name = rawName.split(/\s*[|\u2013\-]\s*/)[0].trim();
  if (!name) return null;

  // Title: dedicated selector first, then h2.
  const subtitleText =
    $(".faculty-title, .position, .job-title, .subtitle").first().text().trim();
  const h2Text = $("h2").first().text().trim();
  const title = subtitleText || h2Text || `Faculty, ${department}`;

  const email = extractEmail(html);

  // Bio: visible paragraphs in main content area, capped at 2000 chars.
  let bio = "";
  const mainEl = $("main, article, .entry-content, .faculty-bio, #content").first();
  const paragraphSource = mainEl.length ? mainEl : $("body");
  paragraphSource.find("p").each((_, el) => {
    if (bio.length >= 2000) return false;
    const t = $(el).text().trim();
    if (t) bio += (bio ? " " : "") + t;
  });
  bio = bio.slice(0, 2000);

  // Research areas from meta keywords (best-effort).
  const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
  const researchAreas = metaKeywords
    ? metaKeywords.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  return {
    name,
    email,
    title,
    department,
    bio,
    profileUrl,
    researchAreas,
  };
}

// -- Public API --------------------------------------------------------------

/**
 * Scrape one department and return its faculty as Professor[].
 * Never throws -- returns [] on any unrecoverable failure so the caller
 * can still process the other three departments.
 */
export async function scrapeDepartment(
  seed: DepartmentSeed,
  opts: { throttleMs?: number } = {},
): Promise<Professor[]> {
  const throttleMs = opts.throttleMs ?? 1000;
  try {
    if (seed.strategy === "wp-api") {
      return await scrapeWpApi(seed, throttleMs);
    }
    if (seed.strategy === "live-directory") {
      return await scrapeKenanFaculty({ throttleMs });
    }
    return await scrapeDdg(seed, throttleMs);
  } catch (err) {
    console.warn(`[professors] scrapeDepartment failed for ${seed.slug}:`, err);
    return [];
  }
}

/**
 * Scrape all four departments and return a single deduped array.
 * Dedup key: lowercase(name) + department. Runs sequentially to avoid
 * hammering UNC servers simultaneously.
 */
export async function scrapeAllDepartments(
  opts: { throttleMs?: number } = {},
): Promise<Professor[]> {
  const all: Professor[] = [];
  const seen = new Set<string>();

  for (const seed of DEPARTMENT_SEEDS) {
    const results = await scrapeDepartment(seed, opts);
    for (const p of results) {
      const key = `${p.name.toLowerCase()}|${p.department}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
  }

  return all;
}
