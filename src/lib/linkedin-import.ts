// LinkedIn meta tag scraping + affiliation detection + warmth scoring
// Ported from backend/app/core/affiliation_checker.py and scoring.py

const LINKEDIN_URL_REGEX = /https?:\/\/(www\.)?linkedin\.com\/in\/([\w-]+)\/?/;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface LinkedInMeta {
  name: string;
  education: string;
  location: string;
  experience: string;
  title: string;
}

interface Affiliation {
  name: string;
  boost: number;
}

interface ScoreResult {
  score: number;
  tier: "hot" | "warm" | "monitor" | "cold";
}

// ── Scraping ──────────────────────────────────────────────────────────────────

export async function scrapeLinkedInMeta(url: string): Promise<LinkedInMeta> {
  const match = url.match(LINKEDIN_URL_REGEX);
  if (!match) throw new Error("Invalid LinkedIn URL");

  const slug = match[2];
  const fallbackName = slug
    .split("-")
    .filter((p) => p.length > 0 && !/^\d+$/.test(p))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });

    if (!res.ok) {
      return { name: fallbackName, education: "", location: "", experience: "", title: "" };
    }

    const html = await res.text();

    // Extract meta description
    const metaMatch = html.match(
      /<meta\s+(?:name="description"\s+content="([^"]*?)"|content="([^"]*?)"\s+name="description")/i
    );
    const description = metaMatch?.[1] || metaMatch?.[2] || "";

    // Extract og:title for headline/title
    const ogTitleMatch = html.match(
      /<meta\s+(?:property="og:title"\s+content="([^"]*?)"|content="([^"]*?)"\s+property="og:title")/i
    );
    const ogTitle = ogTitleMatch?.[1] || ogTitleMatch?.[2] || "";

    // Parse structured fields from meta description
    // Format: "experience · education · location" or similar
    let education = "";
    let location = "";
    let experience = "";

    const eduMatch = description.match(/education:\s*([^·]+)/i);
    if (eduMatch) education = eduMatch[1].trim();

    const locMatch = description.match(/location:\s*([^·]+)/i);
    if (locMatch) location = locMatch[1].trim();

    const expMatch = description.match(/experience:\s*([^·]+)/i);
    if (expMatch) experience = expMatch[1].trim();

    // Extract name from og:title (format: "FirstName LastName - Title | LinkedIn")
    let name = fallbackName;
    if (ogTitle) {
      const namePart = ogTitle.split(" - ")[0]?.split(" | ")[0]?.trim();
      if (namePart && namePart.length > 1) name = namePart;
    }

    // Extract title from og:title
    let title = "";
    if (ogTitle.includes(" - ")) {
      const titlePart = ogTitle.split(" - ").slice(1).join(" - ").split(" | ")[0]?.trim();
      if (titlePart) title = titlePart;
    }

    return { name, education, location, experience, title };
  } catch {
    return { name: fallbackName, education: "", location: "", experience: "", title: "" };
  }
}

// ── Affiliation Detection ─────────────────────────────────────────────────────

const UNC_PATTERNS = [/unc/i, /chapel\s*hill/i, /university of north carolina/i];
const KENAN_FLAGLER = [/kenan[\s-]?flagler/i];
const CHI_PHI = [/chi\s*phi/i];
const NC_LOCATIONS = [/raleigh/i, /durham/i, /chapel hill/i, /charlotte/i, /greensboro/i, /winston[\s-]?salem/i];
const TOP_FIRMS = [
  /goldman\s*sachs/i, /jpmorgan/i, /morgan\s*stanley/i, /bank of america/i,
  /evercore/i, /lazard/i, /centerview/i, /moelis/i, /perella/i, /pjt/i,
  /blackstone/i, /kkr/i, /carlyle/i, /apollo/i, /warburg/i, /tpg/i,
  /citadel/i, /point72/i, /two sigma/i, /bridgewater/i,
];
const CONSULTING = [/mckinsey/i, /bcg|boston\s*consulting/i, /bain/i, /deloitte/i, /accenture/i];

export function detectAffiliations(meta: LinkedInMeta): Affiliation[] {
  const text = [meta.education, meta.location, meta.experience, meta.title].join(" ");
  const affiliations: Affiliation[] = [];

  const hasKenanFlagler = KENAN_FLAGLER.some((p) => p.test(text));
  const hasUNC = UNC_PATTERNS.some((p) => p.test(text));

  if (hasKenanFlagler) {
    affiliations.push({ name: "Kenan-Flagler", boost: 25 });
  } else if (hasUNC) {
    affiliations.push({ name: "UNC Alumni", boost: 20 });
  }

  if (CHI_PHI.some((p) => p.test(text))) {
    affiliations.push({ name: "Chi Phi", boost: 15 });
  }

  if (NC_LOCATIONS.some((p) => p.test(meta.location || text))) {
    affiliations.push({ name: "NC Local", boost: 10 });
  }

  if (TOP_FIRMS.some((p) => p.test(text))) {
    affiliations.push({ name: "Top Firm", boost: 15 });
  }

  if (CONSULTING.some((p) => p.test(text))) {
    affiliations.push({ name: "Consulting", boost: 12 });
  }

  return affiliations;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function computeWarmthScore(affiliations: Affiliation[]): ScoreResult {
  const base = 30;
  const total = Math.min(100, base + affiliations.reduce((sum, a) => sum + a.boost, 0));
  const tier: ScoreResult["tier"] =
    total > 80 ? "hot" : total > 60 ? "warm" : total > 40 ? "monitor" : "cold";
  return { score: total, tier };
}

// ── URL Validation ────────────────────────────────────────────────────────────

export function isValidLinkedInUrl(url: string): boolean {
  return LINKEDIN_URL_REGEX.test(url);
}
