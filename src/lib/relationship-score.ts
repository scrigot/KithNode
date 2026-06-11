// Relationship score layer.
//
// The affiliation engine (computeWarmthScore) produces the FIT score from who a
// contact IS — school, Greek org, firm, major. This module adds the two other
// breakdown bars from the RELATIONSHIP a user has with the contact:
//   - ENGAGEMENT (0..20): how recently / often you actually talk
//   - SIGNAL     (0..30): friend status + leadership
// These are layered at READ time from the contact's relationship fields, never
// folded into computeWarmthScore — so friend status is never double-counted and
// the affiliation tests stay untouched.

/** Allowed speak-frequency values; "" = unset. Drives the UI select + the
 * engagement floor below. */
export const SPEAK_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "rarely",
] as const;

export type SpeakFrequency = (typeof SPEAK_FREQUENCIES)[number] | "";

const FREQUENCY_FLOOR: Record<string, number> = {
  daily: 18,
  weekly: 14,
  monthly: 9,
  quarterly: 5,
  rarely: 2,
};

const DAY_MS = 86_400_000;

/** Engagement 0..20 from recency of last contact and stated cadence. Takes the
 * max of the two so a recent conversation OR a tight cadence both lift it. A
 * future-dated or unparseable timestamp contributes 0 recency. */
export function engagementScore(input: {
  lastSpokenAt?: string | null;
  speakFrequency?: string | null;
  now?: number;
}): number {
  const now = input.now ?? 0;
  let recency = 0;
  if (input.lastSpokenAt && now > 0) {
    const t = Date.parse(input.lastSpokenAt);
    if (!Number.isNaN(t)) {
      const days = (now - t) / DAY_MS;
      if (days < 0) recency = 0;
      else if (days <= 7) recency = 20;
      else if (days <= 30) recency = 15;
      else if (days <= 90) recency = 9;
      else if (days <= 180) recency = 5;
      else if (days <= 365) recency = 2;
      else recency = 0;
    }
  }
  const floor = FREQUENCY_FLOOR[(input.speakFrequency ?? "").toLowerCase()] ?? 0;
  return Math.min(20, Math.max(recency, floor));
}

/** Signal 0..30: a marked friend is the strongest relationship signal; a
 * detected club-leadership affiliation adds to it. */
export function signalScore(input: {
  isFriend?: boolean;
  affiliationNames?: string[];
}): number {
  let s = 0;
  if (input.isFriend) s += 24;
  if ((input.affiliationNames ?? []).includes("Club Leadership")) s += 6;
  return Math.min(30, s);
}

/** Combined warmth shown to the user: FIT + SIGNAL + ENGAGEMENT, capped 100. */
export function combinedTotal(fit: number, signal: number, engagement: number): number {
  return Math.min(100, Math.round(fit + signal + engagement));
}

/** Tier from the combined total — same thresholds the affiliation engine uses. */
export function tierFromTotal(total: number): "hot" | "warm" | "monitor" | "cold" {
  return total > 80 ? "hot" : total > 60 ? "warm" : total > 40 ? "monitor" : "cold";
}
