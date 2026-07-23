// LinkedIn meta tag scraping + affiliation detection + warmth scoring
// The scoring is now PER-USER: it reads each user's preferences (school,
// hometown, greek org, target firms/industries/locations) and boosts
// contacts that match. Universal signals (firm tier, seniority) still apply.

import type { UserPrefs } from "@/lib/user-prefs";
import { GRAD_DEGREES } from "@/lib/data/preference-options";

const LINKEDIN_URL_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/([\w-]+)\/?$/;

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
 *
 * `tags` — per-user manual labels (e.g. "Chi Phi", "Fintech Club") stored in
 * contact_tags. They feed the Same School and Same Greek Org matchers (no new
 * scoring rules) but are kept out of the K-12/pre-college detector and
 * universal quality signals.
 */
export interface ContactMeta extends LinkedInMeta {
  industry?: string;
  seniorityLevel?: string;
  tags?: string[];
  highSchool?: string;
  /** Manually-entered or high-school-deduced hometown ("City, ST"). Feeds the
   * Hometown Match matcher FIRST; the matcher falls back to `location` only when
   * this is empty. Never feeds Target Location, which reads `location` only. */
  hometown?: string;
  clubs?: string;
  /** Space-joined role titles derived from the structured clubMemberships column
   * (rolesFromMemberships). Feeds ONLY the Club Leadership matcher — never
   * title/company or any other matcher. */
  clubRoles?: string;
  passions?: string;
  greekOrg?: string;
  /** PDL-enriched or manually edited. major/minor are single values; skills is
   * a comma-joined list. They feed ONLY the Skill Match matcher below. */
  major?: string;
  minor?: string;
  /** Comma-joined area(s) of emphasis within the major (e.g. "Finance"). Feeds
   * the Same Major matcher alongside major/minor — nothing else. */
  concentration?: string;
  /** Canonical degree designations, comma-joined (e.g. "BS, MBA"). Feeds ONLY
   * the Same Program matcher below (grad/pro degrees only). Never reaches
   * schoolBlob, the K-12 detector, or any other matcher. */
  degrees?: string;
  skills?: string;
  /** The contact's PAST employers, comma-joined (PDL-enriched or manually
   * edited). Feeds ONLY the Shared Employer matcher below — never the K-12
   * detector or any other matcher. */
  pastFirms?: string;
  /**
   * Manual identity override set by the user. '' = auto (text heuristics
   * decide). 'student' | 'alum' | 'professor' force WHO this contact is and
   * always win over title/education pattern-matching (see detectAffiliations).
   */
  personType?: string;
  /**
   * The contact's graduation year (0/undefined = unknown). In AUTO mode it is
   * the authoritative student-vs-alum signal (see detectAffiliations +
   * resolveAutoPersonType).
   */
  graduationYear?: number;
  /**
   * The school this contact is associated with. For professors this is
   * where-they-teach (drives the "Teaches at Your School" chip); it is NOT
   * where-they-studied, so it never feeds the education-based Same School match.
   */
  university?: string;
  /**
   * Career-track classification (taxonomy in src/lib/data/career-tracks.ts).
   * track is a CAREER_TRACKS key, role one of its values. They feed ONLY the
   * Target Industry matcher (folded into the contact-side industry text), so a
   * prefs role like "AI Engineer" matches even when the legacy `industry` column
   * is empty. Never reach the K-12 detector or any other matcher.
   */
  track?: string;
  role?: string;
}

interface Affiliation {
  name: string;
  boost: number;
}

interface ScoreResult {
  score: number;
  tier: "hot" | "warm" | "monitor" | "cold";
}


// ── Affiliation Detection ─────────────────────────────────────────────────────

// Universal firm tier categories (objectively high-signal regardless of user).
// FIRM_TIERS order = priority, first match wins. AI tiers sit at the top
// because a frontier-lab match should win even if the company name loosely
// brushes a finance pattern.

// AI / ML
// These tier arrays are EXPORTED so the heuristic career classifier
// (src/lib/classify-career.ts) reuses the exact same firm lists instead of
// duplicating them — one edit here updates both warmth scoring and track
// classification.
export const FRONTIER_LAB = [/\banthropic\b/i, /\bopenai\b/i, /\bgoogle\s*deepmind\b|\bdeepmind\b/i, /\bmistral\s*ai\b/i, /\bcohere\b/i, /\bxai\b/i, /\binflection\s*ai\b/i, /\badept\s*ai\b/i, /\bcharacter\.?ai\b/i, /\bperplexity\b/i, /\bsafe\s*superintelligence\b|\bssi\s*inc\b/i];
export const AI_UNICORN = [/\bhugging\s*face\b/i, /\blangchain\b/i, /\banysphere\b|\bcursor\s*ai\b/i, /\breplicate\b/i, /\bvercel\b/i, /\bmodal\s*labs\b/i, /\btogether\s*ai\b/i, /\bdatabricks\b/i, /\bscale\s*ai\b/i, /\bharvey\s*ai\b/i, /\bweights\s*(?:&|and)?\s*biases\b/i, /\breplit\b/i, /\bnotion\s*labs\b/i, /\brunway\s*ml\b/i, /\bmidjourney\b/i, /\beleven\s*labs\b/i, /\bsuno\b/i];
export const BIG_TECH_AI = [/\bmeta\s*(?:ai|fair)\b|\bfacebook\s*ai\b/i, /\bapple\s*intelligence\b/i, /\bmicrosoft\s*research\b|\bmsr\b/i, /\bgoogle\s*brain\b/i, /\bnvidia\b/i, /\bsalesforce\s*research\b/i, /\bibm\s*research\b/i, /\bamazon\s*(?:agi|science)\b/i];

// Finance / Consulting
export const BULGE_BRACKET = [/goldman\s*sachs/i, /jpmorgan/i, /morgan\s*stanley/i, /bank of america/i, /citi(?:group|bank)?/i, /barclays/i, /deutsche\s*bank/i, /ubs\b/i, /credit\s*suisse/i, /hsbc/i, /wells\s*fargo/i];
export const ELITE_BOUTIQUE = [/evercore/i, /lazard/i, /centerview/i, /moelis/i, /perella/i, /pjt/i, /guggenheim/i, /greenhill/i, /rothschild/i, /qatalyst/i, /houlihan/i, /jefferies/i, /raymond\s*james/i, /william\s*blair/i, /piper\s*sandler/i, /robert\s*w\.?\s*baird/i];
export const MEGA_PE = [/blackstone/i, /kkr\b/i, /carlyle/i, /apollo\s*(?:global)?/i, /warburg/i, /tpg\b/i, /thoma\s*bravo/i, /vista\s*equity/i, /silver\s*lake/i, /bain\s*capital/i, /general\s*atlantic/i, /advent\s*international/i, /hellman/i, /leonard\s*green/i, /ares\s*management/i, /providence\s*equity/i, /welsh\s*carson/i];
export const HEDGE_FUNDS = [/citadel/i, /point72/i, /two\s*sigma/i, /bridgewater/i, /millennium/i, /de\s*shaw/i, /jane\s*street/i, /hudson\s*river/i, /jump\s*trading/i, /tower\s*research/i, /renaissance/i, /man\s*group/i, /aqr/i, /elliott/i, /baupost/i];
export const MBB = [/mckinsey/i, /boston\s*consulting|bcg\b/i, /\bbain\b(?!\s*capital)/i];
// Note: \bEY\b on BOTH sides — without leading boundary, /ey\b/ matches the
// trailing "ey" of any word ending that way (e.g. "Bentley", "honey").
export const BIG4 = [/deloitte/i, /accenture/i, /pwc|pricewaterhouse/i, /ernst\s*&?\s*young|\bey\b/i, /kpmg/i];

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
  // Student-org / club officer guard: a "VP of Finance Club" or "President,
  // Investment Society" is NOT professional seniority. Only strip the boost
  // when a club/student-org marker is clearly paired with an officer word —
  // "VP at Goldman Sachs" has no such marker and is left untouched. This must
  // run before the generic VP/President/Director branch below.
  const hasOfficerWord =
    /\b(?:president|vice\s*president|vp|treasurer|secretary|chair(?:man|woman|person)?)\b/i.test(
      t,
    );
  const hasStudentOrgMarker =
    /\b(?:club|society|fraternity|sorority|student\s*government|student\s*council|chapter|association)\b/i.test(
      t,
    );
  if (hasOfficerWord && hasStudentOrgMarker) {
    return { level: "Student Org Officer", boost: 0 };
  }
  // Network-multiplier roles: department heads / deans / chairs are
  // structural-hole nodes — they introduce dozens of students per year.
  if (/\bdean\s+of\b|\b(?:vice|associate)\s*dean\b/i.test(t)) return { level: "Dean", boost: 18 };
  if (/\bdepartment\s*chair\b|\bchair\s+of\s+(?:the\s+)?(?:department|division|marketing|finance|economics|computer\s*science|cs|business)/i.test(t)) return { level: "Department Chair", boost: 18 };
  if (/\bhead\s+of\s+(?:department|marketing|engineering|product|sales|research|growth|operations|finance|hr|people|design|data|analytics|partnerships)/i.test(t)) return { level: "Department Head", boost: 18 };
  // Faculty: senior professors are recruiting goldmines (every alum they ever taught)
  if (/\b(?:full\s+|tenured\s+)?professor\b/i.test(t)) return { level: "Professor", boost: 14 };
  if (/\bassoc(?:iate)?\s*professor\b/i.test(t)) return { level: "Associate Professor", boost: 13 };
  if (/\bassist(?:ant)?\s*professor\b/i.test(t)) return { level: "Assistant Professor", boost: 11 };
  if (/\blecturer\b|\bteaching\s*professor\b|\bclinical\s*professor\b|\bprofessor\s*of\s*practice\b/i.test(t)) return { level: "Lecturer", boost: 9 };
  if (/\bphd\s*candidate\b|\bdoctoral\s*candidate\b|\bphd\s*student\b/i.test(t)) return { level: "PhD Candidate", boost: 6 };
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

/**
 * Resolve what a contact IS when personType is AUTO (''), used for both scoring
 * and the contact-page "Auto-detected" hint. Graduation year wins: a grad year
 * in the future (or this year) means a current student; a past grad year means
 * an alum. With no grad year we fall back to title/education text, which can
 * only confidently say "student" (you cannot infer alum from a title alone).
 * Returns "" when there is no signal either way.
 */
export function resolveAutoPersonType(meta: {
  graduationYear?: number;
  title?: string;
  experience?: string;
  education?: string;
}): "" | "student" | "alum" {
  const gradYear = meta.graduationYear || 0;
  const currentYear = new Date().getFullYear();
  if (gradYear > 0) return gradYear >= currentYear ? "student" : "alum";
  const titleText = (meta.title || "").toLowerCase();
  const companyText = (meta.experience || "").toLowerCase();
  if (
    /\bstudent\b/i.test(titleText) ||
    /\bincoming\b/i.test(titleText) ||
    /\bintern\b/i.test(titleText) ||
    /\b20\d{2}\s*(summer|winter|spring)\b/i.test(titleText) ||
    /\buniversity\b/i.test(companyText)
  ) {
    return "student";
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
 * target location (+8), same hometown (+8), same major (+8), same program
 * (+6, grad degrees only). These let two different users see two different
 * scores for the same contact.
 */
export function detectAffiliations(meta: ContactMeta, prefs?: UserPrefs): Affiliation[] {
  const affiliations: Affiliation[] = [];

  // Tags + clubs + passions feed the per-user relationship matchers (Same
  // School, Same Greek Org) but NEVER the K-12/pre-college detector or
  // universal quality signals — a "high school friend" tag must not flag a
  // college contact as Pre-College. highSchool is deliberately kept out of
  // this blob: it drives only the dedicated Same High School matcher below
  // (see per-user layer), so e.g. "Chapel Hill High School" can't false-fire
  // Same School via the "chapel hill" alias.
  const tagsText = [(meta.tags ?? []).join(" "), meta.clubs, meta.passions]
    .filter(Boolean)
    .join(" ");
  const companyText = (meta.experience || "").toLowerCase();
  const titleText = (meta.title || "").toLowerCase();
  const educationText = meta.education || "";
  const locationText = meta.location || "";

  // Manual personType (set by the user on the contact page) ALWAYS wins over
  // the title/education text heuristics below. '' = auto (no override, behave
  // exactly as before). 'student' | 'alum' | 'professor' force WHO the contact
  // is regardless of what their title/education pattern-matches.
  const personType = meta.personType || "";
  const isProfessor = personType === "professor";

  // Detect K-12 students from the education field. We never want a high
  // schooler whose self-reported title is "Founder" of a teen project to
  // get the same +10 leadership boost as a Goldman MD. An 'alum' override
  // forces this off: a confirmed alum gets full credit no matter what their
  // education text reads as.
  const isPreCollege =
    personType !== "alum" &&
    (/\bhigh\s*school\b/i.test(educationText) ||
      /\bcountry\s*day(\s*school)?\b/i.test(educationText) ||
      /\bpreparatory(\s*school)?\b/i.test(educationText) ||
      /\bprep\s*school\b/i.test(educationText) ||
      /\bcharter\s*school\b/i.test(educationText) ||
      /\bjunior\s*high\b/i.test(educationText) ||
      /\bmiddle\s*school\b/i.test(educationText));

  // Detect "current student / incoming" so we don't credit them as full-time.
  // 'student' forces this true (keeps the halved firm boost + "(Incoming)"
  // label + seniority suppression); 'alum' forces it false (full firm-tier +
  // seniority credit even if the title says "Incoming Summer Analyst"). In AUTO
  // ('') we defer to resolveAutoPersonType, which is grad-year-authoritative: a
  // PAST grad year resolves "alum" and short-circuits the title text, so a
  // past-grad whose title still reads "intern" is NOT flagged a current student.
  // isPreCollege still feeds in independently (K-12 always counts as current).
  const isCurrentStudent =
    personType === "student" ||
    (personType !== "alum" &&
      (isPreCollege ||
        resolveAutoPersonType({
          graduationYear: meta.graduationYear,
          title: titleText,
          experience: companyText,
          education: educationText,
        }) === "student"));

  // Surface the pre-college signal so the user sees it instead of guessing
  // why a fancy-sounding founder-titled contact is rated low.
  if (isPreCollege) {
    affiliations.push({ name: "Pre-College", boost: 0 });
  }

  // ── Universal firm tier ──
  // A professor is suppressed entirely: someone at "Bain & Company executive
  // education" who teaches must NOT read as MBB. They get a Professor chip below
  // instead.
  if (!isProfessor) {
    for (const tier of FIRM_TIERS) {
      if (tier.patterns.some((p) => p.test(companyText))) {
        const boost = isCurrentStudent ? Math.round(tier.boost / 2) : tier.boost;
        const label = isCurrentStudent ? `${tier.label} (Incoming)` : tier.label;
        affiliations.push({ name: label, boost });
        break;
      }
    }
  }

  // ── Universal seniority ──
  // Suppressed for a professor (their seniority is "Professor", pushed below)
  // and for any current student.
  const seniority = detectSeniority(meta.title || "");
  if (seniority.boost > 0 && !isCurrentStudent && !isProfessor) {
    affiliations.push({ name: seniority.level, boost: seniority.boost });
  }

  // ── Manual professor override ──
  // A confirmed professor gets a flat Professor chip in place of firm-tier +
  // seniority. If we know where they teach (meta.university) and it matches the
  // user's school, add a "Teaches at Your School" chip. Where-they-teach is NOT
  // where-they-studied, so in that case we deliberately skip the Same School
  // match that the same university text would otherwise trigger — Same School
  // can still fire below off their EDUCATION field.
  let suppressSameSchoolFromUniversity = false;
  if (isProfessor) {
    affiliations.push({ name: "Professor", boost: 8 });
    if (prefs?.university && meta.university) {
      const aliases = universityAliases(prefs.university);
      const teachesBlob = norm(`${meta.university} ${educationText}`);
      if (aliases.some((a) => teachesBlob.includes(a))) {
        affiliations.push({ name: "Teaches at Your School", boost: 12 });
        suppressSameSchoolFromUniversity = true;
      }
    }
  }

  // ── Universal Club Leadership boost ──
  // Reads clubRoles + clubs + tags ONLY (never title/company/education): a
  // Goldman Sachs "Vice President" job title is a professional rank, not club
  // leadership — reading those fields causes false fires on every finance VP.
  // clubRoles carries the structured-membership roles (rolesFromMemberships);
  // meta.clubs covers legacy "Role — Club" strings that predate the structured
  // column.
  {
    const clubLeadBlob = norm(`${meta.clubRoles ?? ""} ${meta.clubs ?? ""} ${tagsText}`);
    const CLUB_LEAD_RE =
      /\b(president|vice\s*president|vp|founder|co.?founder|cofounder|captain|chair(?:man|woman)?|treasurer|e.?board|eboard|exec(?:utive)?\s*board|director)\b/;
    if (CLUB_LEAD_RE.test(clubLeadBlob)) {
      affiliations.push({ name: "Club Leadership", boost: 6 });
    }
  }

  // ── Per-user match layer ──
  if (prefs) {
    // CS-strong school: only meaningful when the user targets AI/ML/tech —
    // "their school is elite in your target field" is signal; bare prestige is
    // not warmth for a finance-focused user (Sam's call, 2026-06-12).
    if (
      prefs.targetIndustries.some((i) => /\bai\b|\bml\b|machine\s*learning|tech/i.test(i)) &&
      educationText &&
      CS_TOP_SCHOOL.some((p) => p.test(educationText))
    ) {
      affiliations.push({ name: "CS Top School", boost: 5 });
    }

    // Target firm, biggest single boost since it's the user's actual recruiting target
    if (prefs.targetFirms.length && containsAny(companyText, prefs.targetFirms)) {
      affiliations.push({ name: "Target Firm", boost: 25 });
    }

    // Same school, alias-aware fuzzy match against education + experience text.
    // When "Teaches at Your School" already fired for a professor, the school
    // came from where-they-teach (meta.university, surfaced via companyText for
    // a teaching institution), which is NOT where-they-studied — so we narrow
    // this match to EDUCATION only. Same School still fires off their education.
    if (prefs.university) {
      const aliases = universityAliases(prefs.university);
      const schoolBlob = suppressSameSchoolFromUniversity
        ? norm(`${educationText} ${tagsText}`)
        : norm(`${educationText} ${companyText} ${tagsText}`);
      if (aliases.some((a) => schoolBlob.includes(a))) {
        affiliations.push({ name: "Same School", boost: 15 });
      }
    }

    // Same high school. Kept fully separate from Same School (above): a contact
    // listing "Chapel Hill High School" must not light up the UNC alias, and a
    // listed high school must never imply current-high-schooler. Matches when
    // either normalized string contains the other (partial overlap, so
    // "East Chapel Hill" matches "East Chapel Hill High School").
    if (prefs.highSchool && meta.highSchool) {
      const a = norm(prefs.highSchool);
      const b = norm(meta.highSchool);
      if (a && b && (a.includes(b) || b.includes(a))) {
        affiliations.push({ name: "Same High School", boost: 10 });
      }
    }

    // Same greek org. The contact's own greekOrg field is folded into this
    // matcher's text ONLY — it must never reach the K-12 detector, schoolBlob,
    // or any other matcher (a Greek org name is not a school or a club).
    if (prefs.greekOrg) {
      const allText = `${educationText} ${locationText} ${companyText} ${titleText} ${tagsText} ${meta.greekOrg ?? ""}`;
      if (norm(allText).includes(norm(prefs.greekOrg))) {
        affiliations.push({ name: "Same Greek Org", boost: 30 });
      }
    }

    // Target industry. The contact-side text is now industry + track + role, so a
    // prefs entry (which stores taxonomy ROLE names like "AI Engineer", plus any
    // legacy industry strings) fires when it equals the legacy industry OR the
    // classified role OR the classified track — letting role-based targeting work
    // even when the legacy `industry` column is empty. Each comparison is exact
    // (normalized) to avoid loose substring false-fires. Fires at most once.
    const contactIndustry = meta.industry || inferIndustryFromAffiliations(affiliations);
    const contactTargets = [contactIndustry, meta.track, meta.role]
      .map((v) => norm(v || ""))
      .filter((v) => v.length > 0);
    if (
      contactTargets.length &&
      prefs.targetIndustries.some((i) => contactTargets.includes(norm(i)))
    ) {
      affiliations.push({ name: "Target Industry", boost: 10 });
    }

    // Target location
    if (prefs.targetLocations.length && containsAny(locationText, prefs.targetLocations)) {
      affiliations.push({ name: "Target Location", boost: 8 });
    }

    // Hometown match: split the user's hometown into city/state tokens and look
    // for either in the contact's hometown FIRST. Only fall back to the
    // contact's (current) location when the contact has no hometown on file —
    // this preserves the prior behavior for hometown-less contacts while letting
    // a real hometown win when present. Target Location (above) is unaffected: it
    // keeps reading locationText only, so a contact's hometown never lights it.
    if (prefs.hometown) {
      const tokens = prefs.hometown.split(",").map((t) => norm(t)).filter((t) => t.length > 1);
      const hometownText = norm(meta.hometown ?? "");
      const haystack = hometownText || norm(locationText);
      if (tokens.some((t) => haystack.includes(t))) {
        affiliations.push({ name: "Hometown Match", boost: 8 });
      }
    }

    // Same Club: match contact's clubs field + tags against prefs.clubs.
    // Deliberately excludes education/experience/location to avoid false fires.
    if (prefs.clubs.length) {
      const clubBlob = norm(`${meta.clubs ?? ""} ${tagsText}`);
      if (containsAny(clubBlob, prefs.clubs)) {
        affiliations.push({ name: "Same Club", boost: 8 });
      }
    }

    // Skill Match: the contact's skills/major/minor + tags overlapping EITHER the
    // user's skills OR their target industries (a major like "Computer Science"
    // or a skill like "Machine Learning" can map to an industry interest). Built
    // ONLY from skills + tags + major + minor — never schoolBlob or the K-12
    // detector. Fires at most once.
    // prefs.skills is nullish-guarded: a prefs object built before this field
    // existed must not crash the matcher (containsAny treats [] as no-match).
    const prefSkills = prefs.skills ?? [];
    if (prefSkills.length || prefs.targetIndustries.length) {
      const skillBlob = norm(
        `${meta.skills ?? ""} ${tagsText} ${meta.major ?? ""} ${meta.minor ?? ""}`,
      );
      if (
        containsAny(skillBlob, prefSkills) ||
        containsAny(skillBlob, prefs.targetIndustries)
      ) {
        affiliations.push({ name: "Skill Match", boost: 8 });
      }
    }

    // Same Major: the user's major/minor/concentration (comma-joined strings)
    // overlapping the contact's major/minor/concentration ONLY — never
    // schoolBlob, the K-12 detector, or any other matcher. Each user entry is
    // matched against each contact entry by either-direction containment (so
    // "Economics" matches "Business Economics"). Fires at most once. All fields
    // are nullish-guarded so a UserPrefs built before they existed never crashes
    // the matcher.
    const userMajorList = `${prefs.major ?? ""},${prefs.minor ?? ""},${prefs.concentration ?? ""}`
      .split(",")
      .map((m) => norm(m))
      .filter((m) => m.length > 1);
    if (userMajorList.length) {
      const contactMajorList = `${meta.major ?? ""},${meta.minor ?? ""},${meta.concentration ?? ""}`
        .split(",")
        .map((m) => norm(m))
        .filter((m) => m.length > 1);
      const overlaps = userMajorList.some((u) =>
        contactMajorList.some((c) => u.includes(c) || c.includes(u)),
      );
      if (overlaps) {
        affiliations.push({ name: "Same Major", boost: 8 });
      }
    }

    // Same Program: the user's degrees overlapping the contact's degrees, but
    // counting ONLY grad/professional degrees (GRAD_DEGREES) — a shared BS/BA
    // is too common to be warmth, so undergrad tokens NEVER fire this. Both
    // sides are comma-split, trimmed, and compared case-insensitively against
    // the grad set. Built ONLY from the degrees fields — never schoolBlob, the
    // K-12 detector, or any other matcher. Fires at most once. degrees is
    // nullish-guarded so a UserPrefs built before this field existed never
    // crashes the matcher.
    const gradSet = new Set(GRAD_DEGREES.map((d) => d.toUpperCase()));
    const splitGradDegrees = (s: string): string[] =>
      s
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter((d) => gradSet.has(d));
    const userDegrees = new Set(splitGradDegrees(prefs.degrees ?? ""));
    if (userDegrees.size) {
      const contactDegrees = splitGradDegrees(meta.degrees ?? "");
      if (contactDegrees.some((d) => userDegrees.has(d))) {
        affiliations.push({ name: "Same Program", boost: 6 });
      }
    }

    // Shared Employer: the user's OWN past employers (prefs.pastFirms)
    // overlapping the contact's employers — both their PAST firms (meta.pastFirms,
    // comma-joined) AND their CURRENT firm (companyText): you may have worked
    // where they work now. Each user firm is matched against each contact firm by
    // either-direction containment (so "Goldman" matches "Goldman Sachs"). Built
    // ONLY from pastFirms + the current-firm text — never schoolBlob, the K-12
    // detector, or any other matcher. Fires at most once. prefs.pastFirms is
    // nullish-guarded so a UserPrefs built before this field existed never
    // crashes the matcher.
    const userPastFirms = (prefs.pastFirms ?? [])
      .map((f) => norm(f))
      .filter((f) => f.length > 1);
    if (userPastFirms.length) {
      const contactFirms = `${meta.pastFirms ?? ""},${companyText}`
        .split(",")
        .map((f) => norm(f))
        .filter((f) => f.length > 1);
      const overlaps = userPastFirms.some((u) =>
        contactFirms.some((c) => u.includes(c) || c.includes(u)),
      );
      if (overlaps) {
        affiliations.push({ name: "Shared Employer", boost: 10 });
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
