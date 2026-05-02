// Live-directory scraper for UNC Kenan-Flagler faculty.
//
// Strategy: paginate https://www.kenan-flagler.unc.edu/faculty/?pg=N (pages 1-5,
// page 6+ returns no profile links). Extract all faculty profile slugs from static
// HTML, dedup, then fetch each profile to extract name/title/email/bio.
//
// Returns Professor[] -- same shape as the wp-api and ddg-scrape strategies so
// scraper.ts / route.ts don't need a new code path downstream.
//
// Called by scrapeDepartment() when seed.strategy === "live-directory".

import * as cheerio from "cheerio";
import type { Professor } from "./scraper";

const BASE_URL = "https://www.kenan-flagler.unc.edu";
const DIRECTORY_BASE = `${BASE_URL}/faculty/`;
const TOTAL_PAGES = 5;
const DEPARTMENT = "UNC Kenan-Flagler";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Matches faculty profile URLs under /faculty/directory/<slug>
const PROFILE_URL_RE =
  /^https:\/\/www\.kenan-flagler\.unc\.edu\/faculty\/directory\/[a-z][a-z0-9-]*\/?$/;

// Matches UNC-family email addresses (same pattern as scraper.ts)
const UNC_EMAIL_RE =
  /[a-z0-9._%+-]+@(?:unc\.edu|cs\.unc\.edu|econ\.unc\.edu|kenan-flagler\.unc\.edu|stor\.unc\.edu)/i;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractEmail(html: string): string {
  const match = UNC_EMAIL_RE.exec(html);
  return match ? match[0].toLowerCase() : "";
}

/** Extract all faculty profile URLs from a directory page. */
export function extractProfileUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Resolve relative URLs
    let full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    full = full.replace(/\/?$/, "/");
    if (PROFILE_URL_RE.test(full)) {
      urls.push(full);
    }
  });

  return urls;
}

/** Extract Professor fields from a Kenan faculty profile page. */
export function extractProfile(html: string, profileUrl: string): Professor | null {
  const $ = cheerio.load(html);

  // Name: og:title is most reliable; strip " | UNC Kenan-Flagler..." suffix.
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const h1Text = $("h1.post-title, h1").first().text().trim();
  const rawName = ogTitle || h1Text;
  if (!rawName) return null;
  const name = rawName.split(/\s*\|\s*/)[0].trim();
  if (!name) return null;

  // Title: .job-title div.
  const title =
    $(".job-title").first().text().trim() || `Faculty, ${DEPARTMENT}`;

  const email = extractEmail(html);

  // Bio: .faculty-single-blocks inner text, fallback to og:description.
  let bio = "";
  const blocksEl = $(".faculty-single-blocks");
  if (blocksEl.length) {
    bio = blocksEl.text().replace(/\s+/g, " ").trim().slice(0, 2000);
  }
  if (!bio) {
    bio = ($('meta[property="og:description"]').attr("content") || "").slice(0, 2000);
  }

  // Research areas from meta keywords (best-effort, often empty on Kenan pages).
  const metaKeywords = $('meta[name="keywords"]').attr("content") || "";
  const researchAreas = metaKeywords
    ? metaKeywords
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return {
    name,
    email,
    title,
    department: DEPARTMENT,
    bio,
    profileUrl,
    researchAreas,
  };
}

/**
 * Scrape the full Kenan-Flagler faculty directory (pages 1-5) and return
 * Professor[] with all reachable profiles.
 *
 * Per-profile errors are caught and logged -- never throws.
 */
export async function scrapeKenanFaculty(
  opts: { throttleMs?: number } = {},
): Promise<Professor[]> {
  const throttleMs = opts.throttleMs ?? 1200;

  // Phase 1: collect all profile URLs across pages 1-5.
  const slugSet = new Set<string>();

  for (let pg = 1; pg <= TOTAL_PAGES; pg++) {
    const url = `${DIRECTORY_BASE}?pg=${pg}`;
    const html = await fetchText(url);
    if (!html) {
      console.warn(`[kenan-directory] Failed to fetch page ${pg}: ${url}`);
      continue;
    }
    const urls = extractProfileUrls(html);
    if (urls.length === 0) {
      // Page returned no profile links -- stop early.
      break;
    }
    for (const u of urls) slugSet.add(u);
  }

  if (slugSet.size === 0) {
    console.warn("[kenan-directory] No profile URLs found across all pages");
    return [];
  }

  // Phase 2: fetch each profile, throttled.
  const profileUrls = Array.from(slugSet);
  const out: Professor[] = [];

  for (let i = 0; i < profileUrls.length; i++) {
    if (i > 0 && throttleMs > 0) await wait(throttleMs);

    const url = profileUrls[i];
    try {
      const html = await fetchText(url);
      if (!html) {
        console.warn(`[kenan-directory] No HTML for profile: ${url}`);
        continue;
      }
      const prof = extractProfile(html, url);
      if (!prof || !prof.name) {
        console.warn(`[kenan-directory] Could not extract name from: ${url}`);
        continue;
      }
      out.push(prof);
    } catch (err) {
      console.warn(`[kenan-directory] Profile fetch failed for ${url}:`, err);
    }
  }

  return out;
}
