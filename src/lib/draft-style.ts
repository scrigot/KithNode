// Maps a user's outreach-drafting settings into the prompt fragments the draft
// endpoint splices into its LLM prompt. Pure + deterministic so the email's
// "voice" (tone, length, sign-off, subject) is unit-tested without ever calling
// the model. The expensive, nondeterministic generateText() call stays dumb;
// this is where authenticity guardrails actually live.
//
// Used by src/app/api/outreach/draft/route.ts. Invalid/unknown values fall back
// to the warm defaults rather than throwing, so a stale client can never break
// a draft.

export type DraftTone = "warm" | "professional" | "concise";
export type DraftLength = "short" | "medium" | "long";
export type DraftSubjectStyle = "casual" | "formal";

export const DRAFT_TONE_DEFAULT: DraftTone = "warm";
export const DRAFT_LENGTH_DEFAULT: DraftLength = "medium";
export const DRAFT_SUBJECT_DEFAULT: DraftSubjectStyle = "casual";

/** How many characters of free-text signature we honor. Mirrors the cap the
 *  preferences POST route enforces on save. */
export const DRAFT_SIGNATURE_MAX = 200;

const TONE_PHRASES: Record<DraftTone, string> = {
  warm: "Authentic and warm, NOT spammy or templated. Humble and curious, never presumptuous.",
  professional:
    "Professional and polished, but still personable and human. Respectful of the recipient's time.",
  concise:
    "Direct and concise. Warm but to the point — cut filler and pleasantries that don't earn their place.",
};

const WORD_TARGETS: Record<DraftLength, number> = {
  short: 80,
  medium: 150,
  long: 220,
};

const SUBJECT_RULES: Record<DraftSubjectStyle, string> = {
  casual: "casual and warm, under 60 characters, sentence case (not Title Case)",
  formal: "professional and specific, under 70 characters",
};

export interface DraftStyleInput {
  draftTone?: string | null;
  draftLength?: string | null;
  draftSignature?: string | null;
  draftSubjectStyle?: string | null;
}

export interface DraftStyle {
  /** Tone sentence for the prompt's TONE REQUIREMENTS block. */
  tonePhrase: string;
  /** Word cap for the email body. */
  wordTarget: number;
  /** Subject-line formatting rule. */
  subjectRule: string;
  /** The exact sign-off instruction for the prompt. Uses the signature verbatim
   *  when set, otherwise the sender's first name. */
  signoffRule: string;
  /** Cleaned signature (empty when unset). The non-AI placeholder draft uses
   *  this directly so the fallback honors the user's signature too. */
  signature: string;
}

function coerce<K extends string>(value: unknown, table: Record<K, unknown>, fallback: K): K {
  return typeof value === "string" && value in table ? (value as K) : fallback;
}

/**
 * Resolve drafting settings into prompt fragments. `senderFirstName` is woven
 * into the default sign-off; a user-set signature overrides it.
 */
export function buildDraftStyle(prefs: DraftStyleInput, senderFirstName: string): DraftStyle {
  const tone = coerce(prefs.draftTone, TONE_PHRASES, DRAFT_TONE_DEFAULT);
  const length = coerce(prefs.draftLength, WORD_TARGETS, DRAFT_LENGTH_DEFAULT);
  const subject = coerce(prefs.draftSubjectStyle, SUBJECT_RULES, DRAFT_SUBJECT_DEFAULT);

  const signature = (prefs.draftSignature || "").trim().slice(0, DRAFT_SIGNATURE_MAX);
  const name = senderFirstName.trim() || "Me";

  const signoffRule = signature
    ? `End the email with this exact signature, verbatim, on its own line(s):\n${signature}`
    : `Sign off with the sender's first name: "${name}"`;

  return {
    tonePhrase: TONE_PHRASES[tone],
    wordTarget: WORD_TARGETS[length],
    subjectRule: SUBJECT_RULES[subject],
    signoffRule,
    signature,
  };
}
