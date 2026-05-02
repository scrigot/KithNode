// LinkedIn meta tag scraping + affiliation detection + warmth scoring
// The scoring is now PER-USER: it reads each user's preferences (school,
// hometown, greek org, target firms/industries/locations) and boosts
// contacts that match. Universal signals (firm tier, seniority) still apply.

import type { UserPrefs } from "@/lib/user-prefs";

const LINKEDIN_URL_REGEX = /https?:\/\/(www\.)?linkedin\.com\/in\/([\w-]+)\/?/;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface LinkedInMeta {
  name: string;
  education: string;
  location: string;
  experience: string;
  title: string;
}

/**
 * ContactMeta extends LinkedInMeta with optional enrichment fields.
 * Used by the enrichment route after Claude infers industry/seniority
 * from a contact's name + company + title.
 */
export interface ContactMeta extends LinkedInMeta {
  industry?: string;
  seniorityLevel?: string;
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

// Universal firm tier categories (objectively high-signal regardless of user).
// FIRM_TIERS order = priority, first match wins. AI tiers sit at the top
// because a frontier-lab match should win even if the company name loosely
// brushes a finance pattern.

// AI / ML
const FRONTIER_LAB = [/\banthropic\b/i, /\bopenai\b/i, /\bgoogle\s*deepmind\b|\bdeepmind\b/i, /\bmistral\s*ai\b/i, /\bcohere\b/i, /\bxai\b/i, /\binflection\s*ai\b/i, /\badept\s*ai\b/i, /\bcharacter\.?ai\b/i, /\bperplexity\b/i, /\bsafe\s*superintelligence\b|\bssi\s*inc\b/i];
const AI_UNICORN = [/\bhugging\s*face\b/i, /\blangchain\b/i, /\banysphere\b|\bcursor\s*ai\b/i, /\breplicate\b/i, /\bvercel\b/i, /\bmodal\s*labs\b/i, /\btogether\s*ai\b/i, /\bdatabricks\b/i, /\bscale\s*ai\b/i, /\bharvey\s*ai\b/i, /\bweights\s*(?:&|and)?\s*biases\b/i, /\breplit\b/i, /\bnotion\s*labs\b/i, /\brunway\s*ml\b/i, /\bmidjourney\b/i, /\beleven\s*labs\b/i, /\bsuno\b/i];
const BIG_TECH_AI = [/\bmeta\s*(?:ai|fair)\b|\bfacebook\s*ai\b/i, /\bapple\s*intelligence\b/i, /\bmicrosoft\s*research\b|\bmsr\b/i, /\bgoogle\s*brain\b/i, /\bnvidia\b/i, /\bsalesforce\s*research\b/i, /\bibm\s*research\b/i, /\bamazon\s*(?:agi|science)\b/i];

// Finance / Consulting
const BULGE_BRACKET = [/goldman\s*sachs/i, /jpmorgan/i, /morgan\s*stanley/i, /bank of america/i, /citi(?:group|bank)?/i, /barclays/i, /deutsche\s*bank/i, /ubs\b/i, /credit\s*suisse/i, /hsbc/i, /wells\s*fargo/i];
const ELITE_BOUTIQUE = [/evercore/i, /lazard/i, /centerview/i, /moelis/i, /perella/i, /pjt/i, /guggenheim/i, /greenhill/i, /rothschild/i, /qatalyst/i, /houlihan/i, /jefferies/i, /raymond\s*james/i, /william\s*blair/i, /piper\s*sandler/i, /robert\s*w\.?\s*baird/i];
const MEGA_PE = [/blackstone/i, /kkr\b/i, /carlyle/i, /apollo\s*(?:global)?/i, /warburg/i, /tpg\b/i, /thoma\s*bravo/i, /vista\s*equity/i, /silver\s*lake/i, /bain\s*capital/i, /general\s*atlantic/i, /advent\s*international/i, /hellman/i, /leonard\s*green/i, /ares\s*management/i, /providence\s*equity/i, /welsh\s*carson/i];
const HEDGE_FUNDS = [/citadel/i, /point72/i, /two\s*sigma/i, /bridgewater/i, /millennium/i, /de\s*shaw/i, /jane\s*street/i, /hudson\s*river/i, /jump\s*trading/i, /tower\s*research/i, /renaissance/i, /man\s*group/i, /aqr/i, /elliott/i, /baupost/i];
const MBB = [/mckinsey/i, /boston\s*consulting|bcg\b/i, /\bbain\b(?!\s*capital)/i];
const BIG4 = [/deloitte/i, /accenture/i, /pwc|pricewaterhouse/i, /ernst\s*&?\s*young|ey\b/i, /kpmg/i];

// CS-strong schools, applied as a separate affiliation chip when the contact's
// education field matches. Independent of user's "Same School" boost.
const CS_TOP_SCHOOL = [/\bMIT\b|\bMassachusetts\s+Institute\b/, /\bStanford\b/, /\bCarnegie\s*Mellon\b|\bCMU\b/, /\bUC\s+Berkeley\b|\bberkeley\b/i, /\bHarvard\b/, /\bPrinceton\b/, /\bCaltech\b/, /\bCornell\b/, /\bU(niversity)?\s*of\s*Washington\b|\buw\s*allen\b/i, /\bGeorgia\s*Tech\b|\bgatech\b/i, /\bUIUC\b|\bIllinois.*Urbana\b/i, /\b(University\s*of\s*)?Michigan\b|\bumich\b/i, /\bUT\s*Austin\b|\bTexas\s*at\s*Austin\b/i, /\bToronto\b/];

const FIRM_TIERS: { patterns: RegExp[]; label: string; boost: number }[] = [
  { patterns: FRONTIER_LAB, label: "Frontier AI Lab", boost: 22 },
  { patterns: AI_UNICORN, label: "AI Unicorn", boost: 18 },
  { patterns: BIG_TECH_AI, label: "Big Tech AI", boost: 14 },
  { patterns: MEGA_PE, label: "Mega PE", boost: 20 },
  { patterns: BULGE_BRACKET, label: "Bulge Bracket", boost: 18 },
  { patterns: HEDGE_FUNDS, label: "Hedge Fund", boost: 18 },
  { patterns: ELITE_BOUTIQUE, label: "Elite Boutique", boost: 16 },
  { patterns: MBB, label: "MBB", boost: 15 },
  { patterns: BIG4, label: "Big 4", boost: 8 },
];

function detectSeniority(title: string): { level: string; boost: number } {
  const t = title.toLowerCase();
  // Senior leadership (universal)
  if (/managing\s*director|partner|principal|founder|ceo|cfo|coo|cto/i.test(t)) return { level: "Senior", boost: 10 };
  // AI-specific roles (matter for frontier labs / startups)
  if (/research\s*scientist|staff\s*research/i.test(t)) return { level: "Research Scientist", boost: 12 };
  if (/founding\s*engineer/i.test(t)) return { level: "Founding Engineer", boost: 11 };
  if (/member\s*of\s*technical\s*staff|\bmts\b/i.test(t)) return { level: "MTS", boost: 11 };
  if (/forward\s*deployed\s*(?:engineer|eng|ai)/i.test(t)) return { level: "Forward Deployed", boost: 10 };
  if (/(?:ml|machine\s*learning|ai|applied\s*ai)\s*(?:engineer|researcher)/i.test(t)) return { level: "ML Engineer", boost: 9 };
  // Generic finance / corp seniority
  if (/vice\s*president|\bvp\b|director(?!\s*of\s*operations)/i.test(t)) return { level: "VP", boost: 7 };
  if (/\bassociate\b(?!\s*analyst)/i.test(t)) return { level: "Associate", boost: 5 };
  if (/\banalyst\b(?!.*incoming)/i.test(t)) return { level: "Analyst", boost: 3 };
  if (/incoming|intern/i.test(t)) return { level: "Incoming", boost: 1 };
  return { level: "", boost: 0 };
}

// ── Per-user matching helpers ─────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function containsAny(haystack: string, needles: string[]): boolean {
  if (!haystack || !needles.length) return false;
  const h = norm(haystack);
  return needles.some((n) => {
    const v = norm(n);
    return v.length > 1 && h.includes(v);
  });
}

/**
 * Maps a university name to a list of search aliases. Matches the school
 * by full name, common abbreviations, and known sub-units.
 */
function universityAliases(name: string): string[] {
  const n = norm(name);
  if (!n) return [];
  const out = new Set<string>([n]);
  if (n.includes("north carolina") || n.includes("chapel hill")) {
    out.add("unc"); out.add("chapel hill"); out.add("kenan flagler");
  }
  if (n.includes("pennsylvania") || n.includes("upenn")) {
    out.add("upenn"); out.add("wharton"); out.add("pennsylvania");
  }
  if (n.includes("virginia") && !n.includes("west virginia")) {
    out.add("uva"); out.add("mcintire");
  }
  if (n.includes("michigan")) { out.add("ross"); out.add("umich"); }
  if (n.includes("california, berkeley") || n.includes("uc berkeley")) {
    out.add("berkeley"); out.add("haas");
  }
  if (n.includes("new york university") || n.includes("nyu")) {
    out.add("nyu"); out.add("stern");
  }
  if (n.includes("massachusetts institute")) { out.add("mit"); out.add("sloan"); }
  if (n.includes("stanford")) { out.add("stanford"); out.add("gsb"); }
  if (n.includes("harvard")) { out.add("harvard"); out.add("hbs"); }
  if (n.includes("dartmouth")) { out.add("tuck"); }
  if (n.includes("duke")) { out.add("fuqua"); }
  if (n.includes("notre dame")) { out.add("mendoza"); }
  if (n.includes("texas") && n.includes("austin")) { out.add("ut austin"); out.add("mccombs"); }
  if (n.includes("columbia")) { out.add("cbs"); }
  return Array.from(out).filter((a) => a.length > 1);
}

/**
 * Maps a firm tier label back to a canonical industry name.
 * Used when a contact's company matches a firm tier. We infer the
 * industry from the tier instead of asking the user to set it manually.
 */
function inferIndustryFromAffiliations(affiliations: Affiliation[]): string {
  for (const a of affiliations) {
    if (a.name.startsWith("Frontier AI Lab")) return "AI/ML";
    if (a.name.startsWith("AI Unicorn")) return "AI/ML";
    if (a.name.startsWith("Big Tech AI")) return "AI/ML";
    if (a.name.startsWith("Bulge Bracket")) return "Investment Banking";
    if (a.name.startsWith("Elite Boutique")) return "Investment Banking";
    if (a.name.startsWith("Mega PE")) return "Private Equity";
    if (a.name.startsWith("Hedge Fund")) return "Hedge Fund";
    if (a.name.startsWith("MBB")) return "Consulting";
    if (a.name.startsWith("Big 4")) return "Consulting";
  }
  return "";
}

// ── Main scoring entry point ──────────────────────────────────────────────────

/**
 * Detect affiliations between a contact and a user's preferences.
 *
 * Universal layer (always applied): firm tier + seniority. These reflect
 * objective signal that any user would value.
 *
 * Per-user layer (only when prefs supplied): target firm match (+25),
 * same school (+15), same greek org (+12), target industry (+10),
 * target location (+8), same hometown (+8). These let two different users
 * see two different scores for the same contact.
 */
export function detectAffiliations(meta: ContactMeta, prefs?: UserPrefs): Affiliation[] {
  const affiliations: Affiliation[] = [];

  const companyText = (meta.experience || "").toLowerCase();
  const titleText = (meta.title || "").toLowerCase();
  const educationText = meta.education || "";
  const locationText = meta.location || "";

  // Detect "current student / incoming" so we don't credit them as full-time
  const isCurrentStudent =
    /\buniversity\b/i.test(companyText) ||
    /\bstudent\b/i.test(titleText) ||
    /\bincoming\b/i.test(titleText) ||
    /\bintern\b/i.test(titleText) ||
    /\b20\d{2}\s*(summer|winter|spring)\b/i.test(titleText);

  // ── Universal firm tier ──
  for (const tier of FIRM_TIERS) {
    if (tier.patterns.some((p) => p.test(companyText))) {
      const boost = isCurrentStudent ? Math.round(tier.boost / 2) : tier.boost;
      const label = isCurrentStudent ? `${tier.label} (Incoming)` : tier.label;
      affiliations.push({ name: label, boost });
      break;
    }
  }

  // ── Universal seniority ──
  const seniority = detectSeniority(meta.title || "");
  if (seniority.boost > 0 && !isCurrentStudent) {
    affiliations.push({ name: seniority.level, boost: seniority.boost });
  }

  // ── CS-strong school (universal, independent of user's school) ──
  if (educationText && CS_TOP_SCHOOL.some((p) => p.test(educationText))) {
    affiliations.push({ name: "CS Top School", boost: 5 });
  }

  // ── Per-user match layer ──
  if (prefs) {
    // Target firm, biggest single boost since it's the user's actual recruiting target
    if (prefs.targetFirms.length && containsAny(companyText, prefs.targetFirms)) {
      affiliations.push({ name: "Target Firm", boost: 25 });
    }

    // Same school, alias-aware fuzzy match against education + experience text
    if (prefs.university) {
      const aliases = universityAliases(prefs.university);
      const schoolBlob = norm(`${educationText} ${companyText}`);
      if (aliases.some((a) => schoolBlob.includes(a))) {
        affiliations.push({ name: "Same School", boost: 15 });
      }
    }

    // Same greek org
    if (prefs.greekOrg) {
      const allText = `${educationText} ${locationText} ${companyText} ${titleText}`;
      if (norm(allText).includes(norm(prefs.greekOrg))) {
        affiliations.push({ name: "Same Greek Org", boost: 12 });
      }
    }

    // Target industry, prefer explicit enrichment field, fall back to firm tier inference
    const contactIndustry = meta.industry || inferIndustryFromAffiliations(affiliations);
    if (contactIndustry && prefs.targetIndustries.some((i) => norm(i) === norm(contactIndustry))) {
      affiliations.push({ name: "Target Industry", boost: 10 });
    }

    // Target location
    if (prefs.targetLocations.length && containsAny(locationText, prefs.targetLocations)) {
      affiliations.push({ name: "Target Location", boost: 8 });
    }

    // Hometown match, split city/state and look for either token in contact's location
    if (prefs.hometown) {
      const tokens = prefs.hometown.split(",").map((t) => norm(t)).filter((t) => t.length > 1);
      if (tokens.some((t) => norm(locationText).includes(t))) {
        affiliations.push({ name: "Hometown Match", boost: 8 });
      }
    }
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
