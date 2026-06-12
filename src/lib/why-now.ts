// Rules-based "Why now" composer.
//
// Builds one specific sentence from a contact's REAL detected affiliations
// (the matcher names pushed by detectAffiliations) plus their title/firm,
// instead of canned filler copy. Deterministic and free: no LLM call, so it
// works for every contact instantly. Unknown affiliation names are ignored.

export interface WhyNowInput {
  /** Affiliation names exactly as detectAffiliations emits them. */
  affiliations: string[];
  title?: string;
  firm?: string;
  /** Warmth tier; "hot" swaps the closer for an urgency line. */
  tier?: string;
}

type FragmentBuilder = (ctx: { firm: string }) => string;

// Priority-ordered: strongest recruiting signal first. Each builder returns a
// third-person verb phrase so any two compose grammatically.
const PRIORITY: [string, FragmentBuilder][] = [
  [
    "Target Firm",
    ({ firm }) =>
      firm
        ? `works at ${firm}, one of your target firms`
        : "works at one of your target firms",
  ],
  ["Shared Employer", () => "has worked where you have"],
  ["Teaches at Your School", () => "teaches on your campus"],
  ["Same Greek Org", () => "shares your Greek org"],
  ["Same School", () => "graduated from your school"],
  ["Same Program", () => "came through your grad program"],
  ["Same Major", () => "studied your major"],
  ["Club Leadership", () => "held a club leadership role"],
  ["Same Club", () => "shares one of your clubs"],
  ["Same High School", () => "went to your high school"],
  ["Hometown Match", () => "comes from your hometown"],
  ["Professor", () => "teaches in your field"],
];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Compose a personalized one-liner from the top one or two affiliations.
 * Falls back to a tier-aware generic line only when nothing matched.
 */
export function composeWhyNow({
  affiliations,
  title = "",
  firm = "",
  tier = "",
}: WhyNowInput): string {
  const present = new Set(affiliations.map((a) => a.trim()));
  const hits = PRIORITY.filter(([name]) => present.has(name)).slice(0, 2);

  const hot = tier.toLowerCase() === "hot";

  if (hits.length === 0) {
    return hot
      ? "High warmth score with fresh signals. Reach out while it lasts."
      : "Solid warmth match. A clean, low-stakes first touch.";
  }

  // Anchor the line with who they are, unless a fragment already names the
  // firm (Target Firm does) which would read as a repeat.
  const firmAlreadyNamed = hits.some(([name]) => name === "Target Firm");
  const anchor =
    !firmAlreadyNamed && title && firm
      ? `, ${title} at ${firm}`
      : !firmAlreadyNamed && firm
        ? `, at ${firm}`
        : "";

  const fragments = hits.map(([, build]) => build({ firm }));
  const closer = hot
    ? "Reach out while the signal is hot."
    : hits.length === 2
      ? "Two genuine openers for one intro."
      : "A real reason to reach out.";

  if (fragments.length === 2) {
    return `${cap(fragments[0])} and ${fragments[1]}${anchor}. ${closer}`;
  }
  return `${cap(fragments[0])}${anchor}. ${closer}`;
}
