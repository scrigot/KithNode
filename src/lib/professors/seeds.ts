// Department config for the Professors scrape pipeline.
//
// Each entry declares which scraping strategy to use and the
// parameters that strategy needs. Strategy is picked by scraper.ts
// at runtime — this file is pure config, no I/O.

export interface DepartmentSeed {
  slug: "cs" | "econ" | "kenan" | "stats";
  name: string;
  /** Goes into Professor.department (mirrors AlumniContact.firmName). */
  firmName: string;
  strategy: "wp-api" | "ddg-scrape";
  baseUrl: string;
  /** WP REST API path — only required for "wp-api" strategy. */
  apiEndpoint?: string;
  /** DDG query string — only required for "ddg-scrape" strategy. */
  ddgQuery?: string;
  /** Validates profile URLs surfaced by DDG. */
  profileUrlPattern?: RegExp;
}

export const DEPARTMENT_SEEDS: readonly DepartmentSeed[] = [
  {
    slug: "cs",
    name: "UNC Computer Science",
    firmName: "UNC CS",
    strategy: "wp-api",
    baseUrl: "https://cs.unc.edu",
    apiEndpoint: "/wp-json/wp/v2/person?per_page=100&_embed",
  },
  {
    slug: "econ",
    name: "UNC Economics",
    firmName: "UNC Econ",
    strategy: "wp-api",
    baseUrl: "https://econ.unc.edu",
    apiEndpoint: "/wp-json/wp/v2/people?per_page=100&_embed",
  },
  {
    slug: "kenan",
    name: "UNC Kenan-Flagler Business School",
    firmName: "UNC Kenan-Flagler",
    strategy: "ddg-scrape",
    baseUrl: "https://www.kenan-flagler.unc.edu",
    ddgQuery: "site:kenan-flagler.unc.edu/faculty/",
    profileUrlPattern: /kenan-flagler\.unc\.edu\/faculty\/[a-z-]+\/?$/,
  },
  {
    slug: "stats",
    name: "UNC Statistics & Operations Research",
    firmName: "UNC STOR",
    strategy: "ddg-scrape",
    baseUrl: "https://stor.unc.edu",
    ddgQuery: "site:stor.unc.edu/people/",
    profileUrlPattern: /stor\.unc\.edu\/people\/[a-z-]+\/?$/,
  },
];
