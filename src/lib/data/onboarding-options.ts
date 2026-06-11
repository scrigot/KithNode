/**
 * Lazy loaders for the onboarding typeahead datasets. The JSON files are only
 * fetched via dynamic import() the first time a combobox needs them, so they
 * never weigh on any route except onboarding. Results are memoized per session.
 */

let universitiesPromise: Promise<string[]> | null = null;
let citiesPromise: Promise<string[]> | null = null;
let highSchoolsPromise: Promise<string[]> | null = null;
let greekOrgsPromise: Promise<string[]> | null = null;
let clubsPromise: Promise<string[]> | null = null;

export function loadUniversities(): Promise<string[]> {
  if (!universitiesPromise) {
    universitiesPromise = import("./us-universities.json").then(
      (m) => m.default as string[],
    );
  }
  return universitiesPromise;
}

export function loadCities(): Promise<string[]> {
  if (!citiesPromise) {
    citiesPromise = import("./us-cities.json").then((m) =>
      (m.default as { city: string; state: string }[]).map(
        (c) => `${c.city}, ${c.state}`,
      ),
    );
  }
  return citiesPromise;
}

export function loadHighSchools(): Promise<string[]> {
  if (!highSchoolsPromise) {
    highSchoolsPromise = import("./us-high-schools.json").then((m) =>
      (m.default as { n: string; c: string; s: string }[]).map(
        (hs) => `${hs.n} — ${hs.c}, ${hs.s}`,
      ),
    );
  }
  return highSchoolsPromise;
}

export function loadGreekOrgs(): Promise<string[]> {
  if (!greekOrgsPromise) {
    greekOrgsPromise = import("./greek-orgs.json").then(
      (m) => m.default as string[],
    );
  }
  return greekOrgsPromise;
}

export function loadClubs(): Promise<string[]> {
  if (!clubsPromise) {
    clubsPromise = import("./college-clubs.json").then(
      (m) => m.default as string[],
    );
  }
  return clubsPromise;
}
