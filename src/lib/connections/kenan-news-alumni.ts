// Scraper for named alumni mentioned in Kenan-Flagler news articles.
//
// Paginates https://www.kenan-flagler.unc.edu/news/?pg=N, fetches each story,
// and runs a regex to find patterns like "Jane Smith (MBA '09)" or
// "John Doe (BSBA 2018)". If ANTHROPIC_API_KEY is set, runs an optional
// classifier pass to confirm + extract current role; otherwise best-effort.
//
// Source tag: "kenan_news_alumni".

import * as cheerio from "cheerio";
import type { AlumniSeed } from "./types";

const BASE_URL = "https://www.kenan-flagler.unc.edu";
const NEWS_BASE = `${BASE_URL}/news/`;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Matches Kenan-Flagler alumni mentions in news bodies.
//
// Real-world formats observed on /news/ pages:
//   "Lisa Yuan (MBA ’09)"           — curly apostrophe ’ (U+2019)
//   "Some Person (PhD ‘20)"         — curly apostrophe ‘ (U+2018)
//   "Some Person (MBA '09)"         — ASCII straight quote
//   "Some Person (MBA 2018)"        — full year, no apostrophe
//   "Some Person (BA ’89, MBA ’20)" — multi-degree, captures FIRST degree's year
//
// Group 1: full name (2-3 capitalized words). Group 2: 2 or 4 digit year.
// Year normalization to 4-digit happens downstream.
const ALUMNI_RE =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*\(\s*(?:BA|BSBA|BBA|EMBA|MBA|PhD|MAC)[\s'‘’]*(\d{2,4})/g;

// Matches story links on the news index page
const STORY_LINK_RE = /^https?:\/\/www\.kenan-flagler\.unc\.edu\/news\/[^?#]+\/?$/;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
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

function extractStoryUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    if (STORY_LINK_RE.test(full) && !full.endsWith("/news/")) {
      urls.push(full);
    }
  });
  return [...new Set(urls)];
}

function extractAlumniFromHtml(html: string, storyUrl: string): AlumniSeed[] {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();
  const seeds: AlumniSeed[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  // Reset lastIndex before exec loop
  ALUMNI_RE.lastIndex = 0;
  while ((match = ALUMNI_RE.exec(bodyText)) !== null) {
    const name = match[1].trim();
    const rawYear = match[2];
    // Normalise 2-digit year: '09 -> 2009, '99 -> 1999
    const year =
      rawYear.length === 2
        ? parseInt(rawYear) >= 50
          ? `19${rawYear}`
          : `20${rawYear}`
        : rawYear;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    seeds.push({
      name,
      title: "",
      firmName: "UNC Kenan-Flagler",
      email: "",
      sourceUrl: storyUrl,
      bio: `Mentioned in Kenan-Flagler news (class of ${year}).`,
      university: "UNC",
      location: "Chapel Hill, NC",
      affiliations: `graduation_year:${year}`,
      source: "kenan_news_alumni",
    });
  }

  return seeds;
}

export async function scrapeKenanNewsAlumni(
  opts: {
    throttleMs?: number;
    maxPages?: number;
    useClassifier?: boolean;
  } = {},
): Promise<AlumniSeed[]> {
  const throttleMs = opts.throttleMs ?? 1200;
  const maxPages = opts.maxPages ?? 5;
  // Classifier is opt-in and only runs if the env var is present.
  const useClassifier =
    opts.useClassifier !== false &&
    !!(process.env.ANTHROPIC_API_KEY || process.env.FASTAPI_URL);

  // Phase 1: collect story URLs across pages.
  const storyUrls: string[] = [];
  for (let pg = 1; pg <= maxPages; pg++) {
    const url = `${NEWS_BASE}?pg=${pg}`;
    const html = await fetchText(url);
    if (!html) break;
    const urls = extractStoryUrls(html);
    if (urls.length === 0) break;
    storyUrls.push(...urls);
    if (pg < maxPages && throttleMs > 0) await wait(throttleMs);
  }

  if (storyUrls.length === 0) return [];

  // Phase 2: fetch each story and extract alumni mentions.
  const all: AlumniSeed[] = [];
  const globalSeen = new Set<string>();

  for (let i = 0; i < storyUrls.length; i++) {
    if (i > 0 && throttleMs > 0) await wait(throttleMs);
    try {
      const html = await fetchText(storyUrls[i]);
      if (!html) continue;
      const seeds = extractAlumniFromHtml(html, storyUrls[i]);
      for (const s of seeds) {
        const key = s.name.toLowerCase();
        if (!globalSeen.has(key)) {
          globalSeen.add(key);
          all.push(s);
        }
      }
    } catch (err) {
      console.warn(`[kenan-news-alumni] Failed to process ${storyUrls[i]}:`, err);
    }
  }

  // Optional classifier pass -- if unavailable, silently skip.
  if (useClassifier && all.length > 0) {
    try {
      const { classifyBatch } = await import("@/lib/professors/classifier");
      const inputs = all.map((s) => ({
        name: s.name,
        title: s.title,
        bio: s.bio,
        department: s.firmName,
        researchAreas: [],
      }));
      const results = await classifyBatch(inputs, { concurrency: 5 });
      for (let i = 0; i < all.length; i++) {
        const r = results[i];
        if (r && r.confidence > 0.5) {
          all[i].affiliations = [all[i].affiliations, `proftype:${r.profType}`]
            .filter(Boolean)
            .join(",");
        }
      }
    } catch {
      // Classifier unavailable in dev -- skip silently.
    }
  }

  return all;
}

// Export helpers for unit testing.
export { extractStoryUrls, extractAlumniFromHtml };
