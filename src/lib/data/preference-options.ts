/**
 * Shared preset option lists for recruiting-preference inputs. Used by both the
 * onboarding wizard and the dashboard settings page so the two stay in sync and
 * the DB-stored "preset vs custom" split (which keys off membership in these
 * arrays) means the same thing in both places.
 */

export const INDUSTRY_OPTIONS = [
  "AI/ML",
  "Investment Banking",
  "Private Equity",
  "Consulting",
  "Venture Capital",
  "Corporate Finance",
  "Asset Management",
];

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
