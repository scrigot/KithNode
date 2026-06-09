/**
 * Name parsing utilities for KithNode.
 * Suffix-aware surname extraction shared by outreach drafting and the
 * email-finder waterfall so generational suffixes never leak into the
 * last name (e.g. "Elena Ramirez Jr." -> "Ramirez", not "Jr").
 */

// Generational suffixes, normalized to lowercase with trailing periods
// stripped. Covers Jr/Sr (with or without a period) and roman numerals.
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function isSuffix(token: string): boolean {
  return SUFFIXES.has(token.toLowerCase().replace(/\.$/, ""));
}

/**
 * Extracts the surname from a full name, skipping generational suffixes
 * (Jr, Jr., Sr, Sr., II, III, IV, V — case-insensitive). Walks backwards
 * from the last token and returns the first non-suffix token. Falls back
 * to the single token for one-word names, and "" for empty input.
 */
export function lastName(fullName: string): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!isSuffix(parts[i])) return parts[i];
  }
  return parts[parts.length - 1];
}
