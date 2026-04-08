// Composite ranker for discovered contacts.
//
// Replaces the one-shot computeWarmthScore() at import time with a
// multi-factor model that runs at discover time. Mathematically it
// preserves the existing 0–100 sum-of-boosts semantics from
// linkedin-import.ts so contacts don't suddenly re-tier on rollout —
// then layers an identity-anchoring confidence multiplier so unverified
// rows naturally sink to the bottom, plus a small reachability kicker so
// analysts (responsive to students) edge out MDs (not responsive) at the
// same firm.
//
//   base       = clamp(30 + Σ boost, 0, 100)
//   raw        = base * 0.85 + reachability * 0.15
//   score      = round(raw * confidence)
//
// Where:
//   fit          informational subscore: firm tier + seniority + industry
//   affinity     informational subscore: same school / greek / hometown / employer
//   reachability 0–100, email confidence × role accessibility
//   intent       informational subscore: recent job change / funding (v2 hook)
//   confidence   weighted-by-boost average of per-signal confidences
//
// Identity anchoring: every signal carries a sourceUrl + confidence,
// enforced upstream by signal-detector.ts. Anything that slips through
// with low confidence multiplies the whole score down.

import type { RankBreakdown, RankResult, Signal, Tier } from "./types";

export interface RankerInput {
  signals: Signal[];
  /** 0.0 – 1.0. From email-finder. */
  emailConfidence: number;
  /** Free-text title used for role accessibility. */
  title: string;
}

const BASE_SCORE = 30;
const SCORE_CAP = 100;
const BASE_WEIGHT = 0.85;
const REACH_WEIGHT = 0.15;

/** Tier cutoffs match the existing scoring scheme in linkedin-import.ts. */
function tierFor(score: number): Tier {
  if (score > 80) return "hot";
  if (score > 60) return "warm";
  if (score > 40) return "monitor";
  return "cold";
}

function sumBoosts(signals: Signal[], predicate: (s: Signal) => boolean): number {
  return signals.filter(predicate).reduce((sum, s) => sum + s.boost, 0);
}

/**
 * Reachability: 0–100. Combines email confidence (the only objective
 * signal of "can I actually email this person") with role accessibility
 * (analysts and associates respond to students; MDs and partners don't).
 */
function reachabilityFor(emailConfidence: number, title: string): number {
  const t = title.toLowerCase();
  let role = 50; // unknown title
  if (/\b(analyst|associate)\b/i.test(t)) role = 100;
  else if (/\b(vp|vice president)\b/i.test(t)) role = 70;
  else if (/\b(md|managing director|partner|principal|director)\b/i.test(t)) role = 40;
  else if (/\b(ceo|cfo|coo|founder|president)\b/i.test(t)) role = 25;

  // 70% email, 30% accessibility — a verified email at any title beats an
  // unverified address at the perfect title.
  return Math.round(emailConfidence * 100 * 0.7 + role * 0.3);
}

/**
 * Confidence: weighted average of signal confidences, weighted by boost
 * (so a high-impact LinkedIn meta-tag signal counts more than a noisy
 * blocklist-passing DDG snippet). Returns 1.0 when there are no signals
 * so the score doesn't get nuked for an empty contact.
 */
function confidenceFor(signals: Signal[]): number {
  if (signals.length === 0) return 1;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of signals) {
    const w = Math.max(s.boost, 1);
    weightedSum += s.confidence * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 1;
}

export function rank(input: RankerInput): RankResult {
  const { signals, emailConfidence, title } = input;

  // Informational subscores — exposed in the breakdown for the UI's
  // signal chips, but the final score is driven by the total boost sum
  // (1:1 with the existing computeWarmthScore semantics).
  const fit = sumBoosts(
    signals,
    (s) => s.type === "firm-tier" || s.type === "seniority" || s.type === "industry",
  );
  const affinity = sumBoosts(
    signals,
    (s) => s.type === "affinity" || s.type === "location",
  );
  const intent = sumBoosts(signals, (s) => s.type === "intent");

  const reachability = reachabilityFor(emailConfidence, title);
  const confidence = confidenceFor(signals);

  const totalBoost = signals.reduce((sum, s) => sum + s.boost, 0);
  const base = Math.min(SCORE_CAP, BASE_SCORE + totalBoost);
  const raw = base * BASE_WEIGHT + reachability * REACH_WEIGHT;
  const score = Math.round(raw * confidence);

  const breakdown: RankBreakdown = { fit, affinity, reachability, intent, confidence };

  return { ...breakdown, score, tier: tierFor(score) };
}
