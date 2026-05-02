// Maps raw AlumniContact.source values to user-facing Discover tabs.
//
// Add new sources here when introducing a new ingestion pipeline.
// Sources NOT in this map are excluded from Discover entirely
// (e.g. "outreach_status" is metadata, not a contact source).

export type DiscoverCategory = "professor" | "alumni" | "student";

export const SOURCE_TO_CATEGORY: Record<string, DiscoverCategory> = {
  // Professors / faculty / industry-adjunct teaching staff
  professor: "professor",
  kenan_faculty: "professor",
  industry_adjunct: "professor",

  // Alumni / past LinkedIn connections
  discover_run: "alumni",
  linkedin_csv: "alumni",
  linkedin_import: "alumni",
  kenan_news_alumni: "alumni",

  // Currently-enrolled students (Greek, finance/consulting clubs, BSBA peers)
  unc_greek_clubs: "student",
  unc_finance_clubs: "student",
  unc_student_orgs: "student",
};

export function sourcesForCategory(category: DiscoverCategory): string[] {
  return Object.entries(SOURCE_TO_CATEGORY)
    .filter(([, c]) => c === category)
    .map(([s]) => s);
}

export function categoryForSource(source: string): DiscoverCategory | null {
  return SOURCE_TO_CATEGORY[source] ?? null;
}

export const ALL_CATEGORIES: readonly DiscoverCategory[] = [
  "professor",
  "alumni",
  "student",
] as const;
