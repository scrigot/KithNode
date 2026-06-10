/**
 * Lazy loaders for the onboarding typeahead datasets. The JSON files are only
 * fetched via dynamic import() the first time a combobox needs them, so they
 * never weigh on any route except onboarding. Results are memoized per session.
 */

let universitiesPromise: Promise<string[]> | null = null;
let citiesPromise: Promise<string[]> | null = null;

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
