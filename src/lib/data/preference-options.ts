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
