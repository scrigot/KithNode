/**
 * Career-track taxonomy — the SINGLE SOURCE OF TRUTH for every track + role in
 * the app. Warm Signals tabs, Discover filters, Settings/onboarding targeting,
 * the heuristic classifier, the enrichment LLM prompt, and the contact-profile
 * editor all read from here. Change a track or role in ONE place and every
 * surface follows.
 *
 * Shape: track name -> ordered list of roles. The ordering is display order.
 */
export const CAREER_TRACKS = {
  "Finance": [
    "Investment Banking",
    "Private Equity",
    "Venture Capital",
    "Hedge Fund",
    "Asset Management",
    "Sales & Trading",
    "Equity Research",
    "Corporate Finance",
    "Wealth Management",
  ],
  "Consulting": ["Management Consulting", "Strategy"],
  "CS/Tech": ["Software Engineering", "Product Management", "Cybersecurity", "IT"],
  "Data Science": ["Data Science", "Data Engineering", "Quant", "Analytics"],
  "AI": ["AI Engineer", "ML Engineer", "AI Research", "AI Product"],
  "Startups": ["Founder", "Founding Engineer", "Early Stage", "AI-Native SaaS", "Growth Stage"],
} as const;

export type CareerTrack = keyof typeof CAREER_TRACKS;
export type CareerRole = (typeof CAREER_TRACKS)[CareerTrack][number];

/** All track names, in declaration order. */
export const ALL_TRACKS: CareerTrack[] = Object.keys(CAREER_TRACKS) as CareerTrack[];

/** Every role across every track, flattened in declaration order. Roles are
 * unique across tracks, so this doubles as the backward-compat "industry" pool
 * (see preference-options INDUSTRY_OPTIONS, which derives from it). */
export const ALL_ROLES: string[] = ALL_TRACKS.flatMap((t) => [...CAREER_TRACKS[t]]);

// Reverse index built once at module load: role -> owning track. Roles are
// guaranteed unique across tracks by the taxonomy above.
const ROLE_TO_TRACK: Record<string, CareerTrack> = {};
for (const track of ALL_TRACKS) {
  for (const role of CAREER_TRACKS[track]) {
    ROLE_TO_TRACK[role] = track;
  }
}

/** Map a role name back to its owning track. Returns "" for unknown roles. */
export function roleToTrack(role: string): CareerTrack | "" {
  return ROLE_TO_TRACK[role] ?? "";
}
