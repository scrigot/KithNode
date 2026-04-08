// Strict person-name validator.
//
// Ported from backend/app/core/contact_finder.py:_is_valid_person_name() and
// the inline filter inside _extract_people_from_html(). Web scraping returns
// garbage roughly half the time — page titles, button labels, "Learn more",
// city names, and concatenated junk like "Eric PoirierChief". A real-name
// heuristic prevents that garbage from ever reaching the ranker.
//
// Rules (preserved 1:1 from the Python bot — proven against 64 real contacts):
//   1. 2–4 capitalized whitespace-separated tokens
//   2. Each token starts with an uppercase letter, no digits
//   3. Reject if any blocklisted phrase appears (titles, locations, marketing copy)
//   4. Reject if it contains punctuation we never see in real names
//   5. Reject if any token is >15 chars (concatenated title pattern)
//   6. Reject overall length <4 chars

const BLOCKLIST = [
  // Titles
  "general partner", "managing director", "venture partner", "special advisor",
  "operations analyst", "chief executive", "vice president",
  "officer", "director", "manager", "analyst", "engineer", "intern",
  "associate", "partner",
  // Marketing / page chrome
  "our ", "the ", "learn more", "about us", "most innovative",
  "high-yield", "business", "savings", "parking", "conference",
  "award", "leadership", "client", "north", "company", "innovative",
  // Cities & places that frequently leak through scrapers
  "san francisco", "austin", "new york", "bangalore", "india",
  "true north", "passport", "atlas", "fast company", "thread mind",
  // Brands that commonly appear in card layouts
  "waystar",
];

const FORBIDDEN_CHARS = [".", "'", "\u2122"]; // period, apostrophe, ™

// Role acronyms and honorifics that scrapers love to mistake for first names.
// Token-exact, case-insensitive — so "MD" is rejected but "Madeleine" is fine.
const FORBIDDEN_TOKENS = new Set(
  ["VP", "EVP", "SVP", "MD", "CEO", "CFO", "COO", "CTO", "CIO", "CMO", "CHRO", "HR", "PR", "IT", "Mr", "Mrs", "Ms", "Dr"].map(
    (t) => t.toLowerCase(),
  ),
);

const MAX_TOKEN_LEN = 15;
const MIN_LEN = 4;

/**
 * Returns true if `name` looks like a real person's name.
 *
 * False positives are far more dangerous than false negatives in this
 * pipeline — we'd rather drop a real name than push "VP Marketing" into
 * the contact table. The 64-contact Python bot output proved this is
 * the right tradeoff.
 */
export function isValidPersonName(name: string): boolean {
  if (!name || name.length < MIN_LEN) return false;

  if (FORBIDDEN_CHARS.some((c) => name.includes(c))) return false;

  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;

  for (const p of parts) {
    if (!p) return false;
    if (p.length > MAX_TOKEN_LEN) return false;
    // First char must be a Unicode uppercase letter
    if (p[0] !== p[0].toUpperCase() || p[0] === p[0].toLowerCase()) return false;
    // No digits anywhere
    for (const ch of p) if (ch >= "0" && ch <= "9") return false;
    // Reject role acronym / honorific tokens (VP, MD, CEO, Mr, Dr, ...)
    if (FORBIDDEN_TOKENS.has(p.toLowerCase())) return false;
    // Reject camelCase splice (lowercase letter directly followed by uppercase) —
    // a strong signal of "name + title concatenated", e.g. "PoirierChief".
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1];
      const cur = p[i];
      if (prev >= "a" && prev <= "z" && cur >= "A" && cur <= "Z") return false;
    }
  }

  const lower = name.toLowerCase();
  if (BLOCKLIST.some((b) => lower.includes(b))) return false;

  return true;
}
