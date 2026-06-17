// Two-axis relationship model.
//
// AXIS 1 — FIT: the stored affiliation warmthScore (0..100) + tier from the
// scoring engine. "Is this a valuable door?" Never modified here.
// AXIS 2 — RELATIONSHIP CLASS: has the contact crossed from signal to actual
// connection? Friends and proven contacts ascend to the KITH class, which sits
// ABOVE the fit tiers (kith > hot > warm > monitor > cold) without ever
// compressing or inflating the fit score itself. This mirrors how relationship
// CRMs (Affinity, 4Degrees) and B2B lead scoring keep fit and engagement as
// separate axes instead of one blended scalar.
//
// engagementScore survives from the earlier blended model but is now used ONLY
// to order contacts within a class and to drive dormancy nudges — it is never
// summed into the displayed score.

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

/** "" = still a signal; "kith" = an actual connection, ranked above every fit
 * tier. */
export type RelationshipClass = "kith" | "";

/** Pipeline stages that PROVE the relationship: they replied or you met. */
const PROVEN_STAGES = new Set(["responded", "meeting_set"]);

/** Days of recent contact that count as a proven relationship on their own. */
const RECENT_CONTACT_DAYS = 30;

/** A contact ascends to KITH when the user marked them a friend, OR the
 * relationship is proven by behavior: the pipeline reached responded/meeting_set,
 * or you actually spoke within the last 30 days. */
export function relationshipClass(input: {
  isFriend?: boolean | null;
  pipelineStage?: string | null;
  lastSpokenAt?: string | null;
  now?: number;
}): RelationshipClass {
  if (input.isFriend) return "kith";
  if (PROVEN_STAGES.has((input.pipelineStage ?? "").toLowerCase())) return "kith";
  const now = input.now ?? 0;
  if (input.lastSpokenAt && now > 0) {
    const t = Date.parse(input.lastSpokenAt);
    if (!Number.isNaN(t)) {
      const days = (now - t) / DAY_MS;
      if (days >= 0 && days <= RECENT_CONTACT_DAYS) return "kith";
    }
  }
  return "";
}

/** Quiet threshold after which a kith deserves a reconnect nudge. */
export const DORMANT_AFTER_DAYS = 90;

/** Dormant = a logged last-contact date older than 90 days. Deliberately false
 * when no date was ever logged (a just-marked friend shouldn't instantly nag),
 * and dormancy NEVER demotes — dormant strong ties are the highest-value
 * reconnects, so they get a nudge instead. */
export function isDormantKith(input: {
  lastSpokenAt?: string | null;
  now?: number;
}): boolean {
  const now = input.now ?? 0;
  if (!input.lastSpokenAt || now <= 0) return false;
  const t = Date.parse(input.lastSpokenAt);
  if (Number.isNaN(t)) return false;
  return (now - t) / DAY_MS > DORMANT_AFTER_DAYS;
}

/** The tier the UI shows: the relationship class when promoted, else the
 * stored affiliation tier untouched. */
export function displayTier(storedTier: string | null | undefined, klass: RelationshipClass): string {
  if (klass === "kith") return "kith";
  return storedTier || "cold";
}
