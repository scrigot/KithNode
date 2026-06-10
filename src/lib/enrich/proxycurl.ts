// Proxycurl LinkedIn enrichment provider.
//
// Returns REAL structured education + location for a contact by their LinkedIn
// URL. The LLM-only enrichment path cannot know a stranger's school from
// name+company+title, which leaves `education` empty and breaks the
// "knows who's an alum" detection. Proxycurl fills that gap with ground truth.
//
// Person Profile Endpoint (v2):
//   GET https://nubela.co/proxycurl/api/v2/linkedin?url=<encoded url>&use_cache=if-present
//   Authorization: Bearer ${PROXYCURL_API_KEY}
//
// This module NEVER throws: every failure path (missing key, non-200, network
// error, malformed body, no education) returns null so the caller can fall
// back to LLM-only behavior with no regression.

const PROXYCURL_ENDPOINT = "https://nubela.co/proxycurl/api/v2/linkedin";

// US-state name → 2-letter code, for building "City, ST" from city + state.
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

interface ProxycurlEducationEntry {
  school?: string | null;
  // Some Proxycurl responses key the school as `school_name`; read both.
  school_name?: string | null;
  degree_name?: string | null;
  field_of_study?: string | null;
  starts_at?: { year?: number | null } | null;
  ends_at?: { year?: number | null } | null;
}

interface ProxycurlProfile {
  education?: ProxycurlEducationEntry[] | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface ProxycurlResult {
  education: string;
  graduationYear: number;
  location: string;
}

// High school / pre-college markers. We prefer a real university/college over
// a high school when a profile lists both.
const PRE_COLLEGE = /\b(high\s*school|preparatory|prep\s*school|country\s*day|charter\s*school|junior\s*high|middle\s*school|secondary\s*school)\b/i;

function schoolNameOf(entry: ProxycurlEducationEntry): string {
  return String(entry.school || entry.school_name || "").trim();
}

function endYearOf(entry: ProxycurlEducationEntry): number {
  const y = entry.ends_at?.year;
  return typeof y === "number" && y > 0 ? y : 0;
}

/**
 * Pick the most relevant school: prefer a university/college over a high
 * school; among candidates, prefer the one with the most recent end year
 * (highest/latest degree). Falls back to the first entry with a name.
 */
function pickEducation(entries: ProxycurlEducationEntry[]): ProxycurlEducationEntry | null {
  const named = entries.filter((e) => schoolNameOf(e).length > 0);
  if (named.length === 0) return null;

  const collegiate = named.filter((e) => !PRE_COLLEGE.test(schoolNameOf(e)));
  const pool = collegiate.length > 0 ? collegiate : named;

  // Most recent end year wins; unknown years (0) sort last.
  return pool.reduce((best, e) =>
    endYearOf(e) > endYearOf(best) ? e : best,
  );
}

function buildLocation(profile: ProxycurlProfile): string {
  const city = String(profile.city || "").trim();
  if (!city) return "";
  const stateRaw = String(profile.state || "").trim();
  if (!stateRaw) return city;
  const abbr = STATE_ABBR[stateRaw.toLowerCase()] || (stateRaw.length === 2 ? stateRaw.toUpperCase() : stateRaw);
  return `${city}, ${abbr}`;
}

/**
 * Fetch a Proxycurl person profile and map it to the fields KithNode stores.
 * Returns null on missing API key, any non-200, any network/parse error, or
 * when the profile has no usable education entry. NEVER throws.
 */
export async function fetchProxycurlProfile(
  linkedInUrl: string,
): Promise<ProxycurlResult | null> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return null;
  if (!linkedInUrl) return null;

  try {
    const url = `${PROXYCURL_ENDPOINT}?url=${encodeURIComponent(linkedInUrl)}&use_cache=if-present`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("fetchProxycurlProfile: non-200", {
        status: res.status,
        url: linkedInUrl,
      });
      return null;
    }

    const profile = (await res.json()) as ProxycurlProfile;
    const entries = Array.isArray(profile.education) ? profile.education : [];
    const best = pickEducation(entries);
    if (!best) return null;

    return {
      education: schoolNameOf(best),
      graduationYear: endYearOf(best),
      location: buildLocation(profile),
    };
  } catch (err) {
    console.error("fetchProxycurlProfile: request failed", {
      url: linkedInUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
