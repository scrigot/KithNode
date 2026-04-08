// Contact extractor — Stage 3 of the discover pipeline.
//
// Ported from backend/app/core/contact_finder.py. For each candidate
// company, walks the well-known team / about / leadership page paths and
// scrapes person cards with cheerio. Falls back to a DDG LinkedIn dork
// (`site:linkedin.com/in "Company Name" analyst`) when the team page
// returns nothing useful. Every extracted name flows through
// isValidPersonName() before it can become a ContactCandidate.
//
// Identity anchoring: every candidate carries a `sourceUrl` that points
// to the page the name was actually found on (the team page or the
// LinkedIn search-result snippet). Stage 4 (signal-detector) refuses to
// attach signals to a contact unless the signal source mentions the
// contact's name in the same document.

import * as cheerio from "cheerio";
import { isValidPersonName } from "./name-validator";
import { decodeDdgHref } from "./entity-finder";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DDG_HTML_URL = "https://html.duckduckgo.com/html/";

// Common path conventions for company "team / about / leadership" pages.
// Lifted from contact_finder.py:TEAM_PATHS, ordered most-likely-first
// so we exit early on a hit.
export const TEAM_PATHS: readonly string[] = [
  "/team",
  "/about/team",
  "/our-team",
  "/people",
  "/leadership",
  "/about",
  "/about-us",
  "/company/team",
  "/company",
];

// Roles that mark a person as worth surfacing for student warm outreach.
// Merges contact_finder.py TARGET_ROLES (founder/CEO-heavy, geared for
// tech recruiters) with the IB-specific roles students at KithNode are
// actually trying to reach (analyst, associate, MD, partner).
//
// Matching is word-boundary regex (not substring) so "coo" doesn't match
// "coordinator" and "md" doesn't match "Madison".
export const TARGET_ROLE_PATTERN: RegExp = new RegExp(
  "\\b(?:" +
    [
      "analysts?", "associates?", "vice presidents?", "vps?",
      "managing directors?", "mds?", "principals?", "partners?", "directors?",
      "founders?", "co-?founders?", "ceos?", "ctos?", "coos?", "cfos?",
      "presidents?", "head of", "hiring managers?", "recruiters?",
      "talent", "people operations",
    ].join("|") +
    ")\\b",
  "i",
);

export interface ContactCandidate {
  name: string;
  title: string;
  company: string;
  companyDomain: string;
  linkedinUrl: string;
  source: "team_page" | "linkedin_search";
  /** The page where this person was actually found. Used by Stage 4
   *  to enforce identity anchoring on every signal. */
  sourceUrl: string;
}

export interface CompanyInput {
  name: string;
  domain: string;
  /** Base URL — `https://${domain}` works as a default. */
  website: string;
}

export interface FindContactsOptions {
  /** Cap per company to avoid runaway scraping on huge team pages. */
  maxPerCompany?: number;
  /** Throttle between companies. */
  throttleMs?: number;
  /** Skip the LinkedIn dork fallback (useful for tests / quick mode). */
  skipLinkedInFallback?: boolean;
  /** Called once per company so the caller can emit progress events. */
  onProgress?: (info: {
    index: number;
    total: number;
    company: CompanyInput;
    foundForCompany: number;
    foundTotal: number;
  }) => void | Promise<void>;
  /** Abort signal — checked between companies to exit early on cancel. */
  signal?: AbortSignal;
}

// ── Page fetching ─────────────────────────────────────────────────────

export async function fetchPage(url: string): Promise<string | null> {
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

// ── Team page extraction ──────────────────────────────────────────────

const TEAM_CARD_SELECTOR = "div, li, article";
const TEAM_CARD_CLASS_RE = /team|member|person|staff|leader|bio|card/i;

/**
 * Extract person cards from a team / about page. Mirrors the cheerio
 * equivalent of contact_finder.py:_extract_people_from_html(). Looks for
 * containers whose class name suggests a person card, then pulls the
 * name from the first heading-like child and the title from a nearby
 * paragraph or span.
 */
export function extractPeopleFromHtml(
  html: string,
  company: string,
  companyDomain: string,
  sourceUrl: string,
): ContactCandidate[] {
  const $ = cheerio.load(html);
  const out: ContactCandidate[] = [];
  const seen = new Set<string>();

  $(TEAM_CARD_SELECTOR).each((_, el) => {
    const $card = $(el);
    const className = $card.attr("class") || "";
    if (!TEAM_CARD_CLASS_RE.test(className)) return;

    const nameEl = $card.find("h2, h3, h4, strong, b").first();
    if (!nameEl.length) return;
    const name = nameEl.text().trim();
    if (!isValidPersonName(name)) return;

    // Title: first p / span / h5 / h6 nearby. Cap length so we don't
    // grab a whole bio paragraph.
    let title = "Unknown";
    const titleCandidates = [
      $card.find("p").first(),
      $card.find("span").first(),
      $card.find("h5, h6").first(),
    ];
    for (const candidate of titleCandidates) {
      if (!candidate.length) continue;
      const t = candidate.text().trim();
      if (!t) continue;
      const matchesRole = TARGET_ROLE_PATTERN.test(t);
      if (matchesRole || t.length < 60) {
        title = t;
        break;
      }
    }

    // Optional LinkedIn link inside the same card
    let linkedinUrl = "";
    const liLink = $card.find("a[href*='linkedin.com/in/']").first();
    if (liLink.length) linkedinUrl = liLink.attr("href") || "";

    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      name,
      title,
      company,
      companyDomain,
      linkedinUrl,
      source: "team_page",
      sourceUrl,
    });
  });

  // Strategy 2: any anchor pointing at a LinkedIn profile, with the link
  // text as the name. Catches cards we couldn't class-match above.
  $("a[href*='linkedin.com/in/']").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") || "";
    const text = $a.text().trim();
    if (!text || !isValidPersonName(text)) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      name: text,
      title: "Unknown",
      company,
      companyDomain,
      linkedinUrl: href,
      source: "team_page",
      sourceUrl,
    });
  });

  return out;
}

// ── DDG LinkedIn dork fallback ────────────────────────────────────────

/**
 * Last-resort person discovery: a `site:linkedin.com/in` Google-dork
 * against DDG. We deliberately bypass entity-finder.ts's blocklist here
 * because LinkedIn is exactly what we want this time.
 *
 * Note: requires identity anchoring downstream. The company name MUST
 * appear in the result snippet, otherwise we drop the row — this is the
 * fix for the Python bot's v1 false-attribution bug.
 */
export async function searchLinkedInContacts(
  companyName: string,
  companyDomain: string,
): Promise<ContactCandidate[]> {
  const query = `site:linkedin.com/in "${companyName}" analyst OR associate OR founder OR CEO OR "managing director"`;
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
  const out: ContactCandidate[] = [];
  const seen = new Set<string>();
  const companyLower = companyName.toLowerCase();
  const domainStem = companyDomain.split(".")[0]?.toLowerCase() || "";

  $(".result").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a.result__a").first();
    const titleText = linkEl.text().trim();
    const url = decodeDdgHref(linkEl.attr("href") || "");
    if (!url.includes("linkedin.com/in/")) return;

    // LinkedIn result titles look like: "Name - Title - Company | LinkedIn"
    const cleaned = titleText.replace(" | LinkedIn", "").trim();
    const parts = cleaned.split(" - ").map((p) => p.trim());
    const name = parts[0] || "";
    const role = parts[1] || "Unknown";

    // Identity anchoring: the company name must appear in the LinkedIn
    // title's company segment(s) — not anywhere in the snippet. The
    // snippet is summary text and frequently says "...has nothing to do
    // with Acme..." which would false-positive a substring check.
    const companySegments = parts.slice(2).map((p) => p.toLowerCase()).join(" ");
    const anchored =
      companySegments.includes(companyLower) ||
      (!!domainStem && companySegments.includes(domainStem));
    if (!anchored) return;

    if (!isValidPersonName(name)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      name,
      title: role,
      company: companyName,
      companyDomain,
      linkedinUrl: url,
      source: "linkedin_search",
      sourceUrl: url,
    });
  });

  return out;
}

// ── Orchestration ─────────────────────────────────────────────────────

export async function findContacts(
  companies: readonly CompanyInput[],
  options: FindContactsOptions = {},
): Promise<ContactCandidate[]> {
  const {
    maxPerCompany = 3,
    throttleMs = 1000,
    skipLinkedInFallback = false,
    onProgress,
    signal,
  } = options;
  const all: ContactCandidate[] = [];
  const seenGlobal = new Set<string>();

  for (let i = 0; i < companies.length; i++) {
    if (signal?.aborted) break;
    const company = companies[i];
    const found: ContactCandidate[] = [];

    // Try team / about / leadership pages first.
    for (const path of TEAM_PATHS) {
      const url = `${company.website.replace(/\/$/, "")}${path}`;
      const html = await fetchPage(url);
      if (!html) continue;
      const people = extractPeopleFromHtml(html, company.name, company.domain, url);
      if (people.length) {
        found.push(...people);
        break;
      }
    }

    // Fallback: DDG LinkedIn dork — only if team scrape gave us <2.
    if (found.length < 2 && !skipLinkedInFallback) {
      const linkedinPeople = await searchLinkedInContacts(company.name, company.domain);
      const localSeen = new Set(found.map((p) => p.name.toLowerCase()));
      for (const p of linkedinPeople) {
        if (!localSeen.has(p.name.toLowerCase())) found.push(p);
      }
    }

    // Filter to roles we care about, then take top N.
    const ranked = rankByRole(found);
    let acceptedForCompany = 0;
    for (const c of ranked.slice(0, maxPerCompany)) {
      const key = `${c.name.toLowerCase()}|${company.domain}`;
      if (seenGlobal.has(key)) continue;
      seenGlobal.add(key);
      all.push(c);
      acceptedForCompany++;
    }

    if (onProgress) {
      await onProgress({
        index: i,
        total: companies.length,
        company,
        foundForCompany: acceptedForCompany,
        foundTotal: all.length,
      });
    }

    if (i < companies.length - 1 && throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }

  return all;
}

/**
 * Re-orders candidates so that ones with a TARGET_ROLES title float to
 * the top, preserving the original order within each bucket. Lets the
 * `maxPerCompany` slice keep the relevant rows even on a dense team page.
 */
export function rankByRole(candidates: ContactCandidate[]): ContactCandidate[] {
  const relevant: ContactCandidate[] = [];
  const other: ContactCandidate[] = [];
  for (const c of candidates) {
    if (TARGET_ROLE_PATTERN.test(c.title)) relevant.push(c);
    else other.push(c);
  }
  return [...relevant, ...other];
}
