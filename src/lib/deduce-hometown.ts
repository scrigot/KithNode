// Deduce a contact's hometown ("City, ST") from their high-school name.
//
// The US high-schools dataset (~23k entries of {n: name, c: city, s: state}) is
// lazily imported server-side and indexed ONCE into a normalized-name → places
// map. A name resolves to a hometown ONLY when it matches exactly one school
// after normalization; ambiguous names (e.g. "Millbrook High", which exists in
// NC, NY, and VA) and unknown names both return "" so we never guess a city.
//
// Server-only: the dataset is a static import (same module the typeahead loads),
// so this must not be pulled into a client bundle.

interface HighSchool {
  n: string;
  c: string;
  s: string;
}

interface Place {
  c: string;
  s: string;
}

// Normalize a school name for matching: lowercase, collapse whitespace, drop a
// trailing "high school" / "high" / "senior high school" / "senior high" suffix.
// Returns BOTH the raw-normalized form and the suffix-stripped form so a query
// like "Millbrook High" can match a stored "Millbrook High School" and vice
// versa. The two forms are equal when the name has no such suffix.
function normalizedKeys(name: string): string[] {
  const raw = name.toLowerCase().replace(/\s+/g, " ").trim();
  const stripped = raw.replace(/ (senior high school|senior high|high school|high)$/, "").trim();
  return stripped === raw ? [raw] : [raw, stripped];
}

// A place is the same hometown when both city and state match (case-insensitive).
function placeKey(p: Place): string {
  return `${p.c.toLowerCase()}|${p.s.toLowerCase()}`;
}

// Lazily-built index: each normalized key (raw + suffix-stripped) maps to every
// distinct place that key resolves to. Built once on first deduceHometown call.
let indexPromise: Promise<Map<string, Place[]>> | null = null;

function buildIndex(): Promise<Map<string, Place[]>> {
  if (!indexPromise) {
    indexPromise = import("./data/us-high-schools.json").then((m) => {
      const schools = m.default as HighSchool[];
      const map = new Map<string, Place[]>();
      for (const school of schools) {
        const place: Place = { c: school.c, s: school.s };
        const pk = placeKey(place);
        for (const key of normalizedKeys(school.n)) {
          const places = map.get(key);
          if (!places) {
            map.set(key, [place]);
          } else if (!places.some((p) => placeKey(p) === pk)) {
            places.push(place);
          }
        }
      }
      return map;
    });
  }
  return indexPromise;
}

/**
 * Resolve a high-school name to a hometown string "City, ST".
 *
 * Returns "" when the name is empty, matches no school, or matches more than one
 * distinct city/state after normalization (ambiguous). The query is matched on
 * BOTH its raw-normalized and suffix-stripped forms, with the union of places
 * deduped before the uniqueness check, so a single physical school never reads
 * as ambiguous just because the dataset stores it with and without a suffix.
 */
export async function deduceHometown(highSchool: string): Promise<string> {
  if (!highSchool || !highSchool.trim()) return "";
  const index = await buildIndex();

  const seen = new Set<string>();
  const matches: Place[] = [];
  for (const key of normalizedKeys(highSchool)) {
    for (const place of index.get(key) ?? []) {
      const pk = placeKey(place);
      if (seen.has(pk)) continue;
      seen.add(pk);
      matches.push(place);
    }
  }

  if (matches.length !== 1) return "";
  return `${matches[0].c}, ${matches[0].s}`;
}
