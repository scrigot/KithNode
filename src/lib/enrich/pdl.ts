// People Data Labs (PDL) LinkedIn enrichment provider.
//
// Returns REAL structured education + location for a contact by their LinkedIn
// URL. Replaces the defunct Proxycurl provider (shut down July 2025).
//
// Person Enrichment Endpoint (v5):
//   GET https://api.peopledatalabs.com/v5/person/enrich
//   X-Api-Key: ${PDL_API_KEY}
//   Query params: profile=<linkedin url>, min_likelihood=6, required=education
//
// This module NEVER throws: every failure path (missing key, non-200, network
// error, malformed body, no education) returns null so the caller can fall
// back to LLM-only behavior with no regression.

const PDL_ENDPOINT = "https://api.peopledatalabs.com/v5/person/enrich";

// US-state name → 2-letter code, for building "City, ST" from locality + region.
const STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

// PDL education entry shape from /v5/person/enrich response.
// Dates are plain strings like "2014" or "2019-05"; null when still enrolled.
interface PdlEducationEntry {
  school?: {
    name?: string | null;
    type?: string | null;
  } | null;
  start_date?: string | null;
  end_date?: string | null;
  // PDL carries majors/minors as string arrays on each education entry.
  majors?: string[] | null;
  minors?: string[] | null;
}

// Free-tier responses redact some fields to boolean true ("present but
// hidden") instead of the string value, so location fields must be
// runtime-checked as strings before use. skills is the same: the free tier
// may redact the whole array to boolean true, so Array.isArray-guard before use.
interface PdlPersonData {
  full_name?: string | null;
  education?: PdlEducationEntry[] | null;
  location_locality?: string | boolean | null;
  location_region?: string | boolean | null;
  location_name?: string | boolean | null;
  skills?: string[] | boolean | null;
}

interface PdlResponse {
  status: number;
  likelihood?: number;
  data?: PdlPersonData | null;
}

export interface PdlResult {
  education: string;
  graduationYear: number;
  location: string;
  fullName: string;
  major: string;
  minor: string;
  skills: string[];
}

// High school / pre-college markers. PDL uses school.type = "post-secondary institution"
// for colleges; anything else is suspect. We also pattern-match names as a fallback.
const PRE_COLLEGE = /\b(high\s*school|preparatory|prep\s*school|country\s*day|charter\s*school|junior\s*high|middle\s*school|secondary\s*school)\b/i;

function schoolNameOf(entry: PdlEducationEntry): string {
  return String(entry.school?.name || "").trim();
}

// First named major/minor off an education entry, title-cased. "" when absent.
function firstFieldOf(arr: string[] | null | undefined): string {
  if (!Array.isArray(arr)) return "";
  const first = arr.find((v) => typeof v === "string" && v.trim().length > 0);
  return first ? titleCase(first.trim()) : "";
}

function isPreCollege(entry: PdlEducationEntry): boolean {
  const type = String(entry.school?.type || "").toLowerCase();
  // PDL marks colleges as "post-secondary institution". Anything that is NOT
  // that AND has a type string is considered pre-college.
  if (type && type !== "post-secondary institution") return true;
  // Fallback: match name patterns for unlabeled entries.
  return PRE_COLLEGE.test(schoolNameOf(entry));
}

// Parse the year out of a PDL date string like "2014" or "2019-05". Returns 0 if absent.
function parseEndYear(entry: PdlEducationEntry): number {
  const raw = entry.end_date;
  if (!raw) return 0;
  const year = parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) && year > 0 ? year : 0;
}

/**
 * Pick the most relevant school: prefer university/college over high school;
 * among candidates, prefer the one with the most recent end year (latest
 * degree). Falls back to the first named entry if all are pre-college.
 */
function pickEducation(entries: PdlEducationEntry[]): PdlEducationEntry | null {
  const named = entries.filter((e) => schoolNameOf(e).length > 0);
  if (named.length === 0) return null;

  const collegiate = named.filter((e) => !isPreCollege(e));
  const pool = collegiate.length > 0 ? collegiate : named;

  // Most recent end year wins; unknown years (0) sort last.
  return pool.reduce((best, e) =>
    parseEndYear(e) > parseEndYear(best) ? e : best,
  );
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Profile-level skills → first 12, title-cased. Free tier may redact the whole
// array to boolean true, so Array.isArray-guard (same pattern as location). []
// when absent or redacted.
function buildSkills(data: PdlPersonData): string[] {
  if (!Array.isArray(data.skills)) return [];
  return data.skills
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .slice(0, 12)
    .map((s) => titleCase(s.trim()));
}

function buildLocation(data: PdlPersonData): string {
  const city = asString(data.location_locality);
  if (!city) return "";
  const regionRaw = asString(data.location_region);
  if (!regionRaw) return titleCase(city);
  const abbr =
    STATE_ABBR[regionRaw.toLowerCase()] ||
    (regionRaw.length === 2 ? regionRaw.toUpperCase() : regionRaw);
  return `${titleCase(city)}, ${abbr}`;
}

/**
 * True when PDL's fullName should replace the contact's current name.
 * Adopts when pdlFullName is non-empty AND currentName has no space
 * (single token = slug-derived, or empty). Multi-word names (CSV imports)
 * are considered accurate and never overwritten.
 */
export function shouldAdoptPdlName(
  currentName: string,
  pdlFullName: string,
): boolean {
  return (
    pdlFullName.trim().length > 0 && !currentName.trim().includes(" ")
  );
}

/**
 * Fetch a PDL person profile by LinkedIn URL and map it to the fields
 * KithNode stores. Returns null on missing API key, 404 (no match), any other
 * non-200, any network/parse error, or when the profile has no usable
 * education entry. NEVER throws.
 */
export async function fetchPdlProfile(
  linkedInUrl: string,
): Promise<PdlResult | null> {
  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return null;
  if (!linkedInUrl) return null;

  try {
    const params = new URLSearchParams({
      profile: linkedInUrl,
      min_likelihood: "6",
      required: "education",
    });
    const url = `${PDL_ENDPOINT}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { "X-Api-Key": apiKey },
    });

    // 404 = no match in PDL — expected, not an error.
    if (res.status === 404) return null;

    if (!res.ok) {
      console.error("fetchPdlProfile: non-200", {
        status: res.status,
        url: linkedInUrl,
      });
      return null;
    }

    const body = (await res.json()) as PdlResponse;
    const personData = body.data;
    if (!personData) return null;

    const entries = Array.isArray(personData.education)
      ? personData.education
      : [];
    const best = pickEducation(entries);
    if (!best) return null;

    const rawFullName = asString(personData.full_name);
    const fullName = rawFullName ? titleCase(rawFullName) : "";

    return {
      education: schoolNameOf(best),
      graduationYear: parseEndYear(best),
      location: buildLocation(personData),
      fullName,
      major: firstFieldOf(best.majors),
      minor: firstFieldOf(best.minors),
      skills: buildSkills(personData),
    };
  } catch (err) {
    console.error("fetchPdlProfile: request failed", {
      url: linkedInUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
