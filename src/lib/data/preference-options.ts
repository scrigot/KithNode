/**
 * Shared preset option lists for recruiting-preference inputs. Used by both the
 * onboarding wizard and the dashboard settings page so the two stay in sync and
 * the DB-stored "preset vs custom" split (which keys off membership in these
 * arrays) means the same thing in both places.
 */

import { ALL_ROLES } from "@/lib/data/career-tracks";

/**
 * INDUSTRY_OPTIONS is now DERIVED from the career-track taxonomy (ALL_ROLES):
 * the "industries" a user targets are the taxonomy's role names. The grouped
 * track/role pickers in Settings + onboarding store ROLE names into
 * targetIndustries, so the Target Industry matcher and resume extractor keep
 * working unchanged. This export stays for backward compat anywhere the flat
 * list is still read (e.g. resume-extract's canonical pool).
 */
export const INDUSTRY_OPTIONS = ALL_ROLES;

/**
 * Degree designations conferred at UNC (scraped from catalog.unc.edu 2026-06;
 * MBA/MAC/JD/MD confirmed via the professional schools — the Graduate School
 * catalog excludes them). Grouped for the picker UI; GRAD_DEGREES doubles as
 * the closed set behind the Same Program warmth matcher (undergrad degrees are
 * deliberately excluded there so BS-BS overlap never fires it).
 */
export const DEGREE_OPTIONS = {
  undergrad: ["BA", "BS", "BSBA", "BSPH", "BSN", "BFA", "BM", "BAEd"],
  grad: [
    "MBA", "MS", "MA", "PhD", "JD", "MD", "MPH", "MAC", "MPA", "MPP",
    "MSW", "MEd", "MAT", "MFA", "MSN", "MSIS", "MSLS", "MPS", "MHA",
    "MSPH", "DrPH", "EdD", "DNP", "PharmD", "DDS",
  ],
} as const;

/** Flat list of every valid degree token (validation pool for prefs + contact PATCH). */
export const ALL_DEGREES: string[] = [...DEGREE_OPTIONS.undergrad, ...DEGREE_OPTIONS.grad];

/** Grad/professional degrees only — the Same Program matcher's token set. */
export const GRAD_DEGREES: string[] = [...DEGREE_OPTIONS.grad];

export const FIRM_OPTIONS = [
  // AI / ML
  "Anthropic",
  "OpenAI",
  "Google DeepMind",
  "Mistral AI",
  "Cohere",
  "xAI",
  "Perplexity",
  "Hugging Face",
  "Cursor",
  "Vercel",
  "Databricks",
  "Scale AI",
  "Replit",
  "NVIDIA",
  "Meta",
  "Google",
  "Apple",
  "Amazon",
  "Microsoft",
  "Tesla",
  "SpaceX",
  // Finance / Consulting
  "Goldman Sachs",
  "JPMorgan",
  "Morgan Stanley",
  "Bank of America",
  "Evercore",
  "Lazard",
  "Centerview",
  "Moelis",
  "PJT Partners",
  "Blackstone",
  "KKR",
  "Carlyle",
  "Apollo",
  "McKinsey",
  "BCG",
  "Bain",
  "Deloitte",
];

export const LOCATION_OPTIONS = [
  "New York",
  "San Francisco",
  "Chicago",
  "Charlotte",
  "Boston",
  "Houston",
  "Dallas",
  "London",
];
