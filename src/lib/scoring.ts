/**
 * Lead scoring algorithm for KithNode.
 * Computes Connection Strength (0–100) based on shared signals.
 */

export interface ScoringUser {
  university: string;
  targetIndustry: string;
  graduationYear?: number;
}

export interface ScoringAlumni {
  university: string;
  graduationYear: number;
  firmName: string;
}

const PRESTIGE_TIER_1 = new Set([
  "Goldman Sachs",
  "Morgan Stanley",
  "J.P. Morgan",
  "McKinsey & Company",
  "Bain & Company",
  "BCG",
  "KKR",
  "Blackstone",
  "Apollo Global",
  "Silver Lake",
  "TPG Capital",
  "Centerview Partners",
  "Evercore",
  "Lazard",
]);

const PRESTIGE_TIER_2 = new Set([
  "Citi",
  "Bank of America",
  "Deloitte",
  "Oliver Wyman",
  "Houlihan Lokey",
  "Warburg Pincus",
]);

const FIRM_INDUSTRY: Record<string, string> = {
  "Goldman Sachs": "Investment Banking",
  "Morgan Stanley": "Investment Banking",
  "J.P. Morgan": "Investment Banking",
  Evercore: "Investment Banking",
  Lazard: "Investment Banking",
  "Centerview Partners": "Investment Banking",
  "Houlihan Lokey": "Investment Banking",
  Citi: "Investment Banking",
  "Bank of America": "Investment Banking",
  KKR: "Private Equity",
  Blackstone: "Private Equity",
  "Apollo Global": "Private Equity",
  "Silver Lake": "Private Equity",
  "TPG Capital": "Private Equity",
  "Warburg Pincus": "Private Equity",
  "McKinsey & Company": "Consulting",
  "Bain & Company": "Consulting",
  BCG: "Consulting",
  Deloitte: "Consulting",
  "Oliver Wyman": "Consulting",
};

export function scoreConnection(
  user: ScoringUser,
  alumni: ScoringAlumni,
  mutualConnections: number = 0,
): number {
  let score = 0;

  // Shared university: +20
  if (
    user.university &&
    alumni.university &&
    user.university.toLowerCase() === alumni.university.toLowerCase()
  ) {
    score += 20;
  }

  // Shared graduation decade: +10
  if (user.graduationYear && alumni.graduationYear) {
    const userDecade = Math.floor(user.graduationYear / 10);
    const alumniDecade = Math.floor(alumni.graduationYear / 10);
    if (userDecade === alumniDecade) {
      score += 10;
    }
  }

  // Same industry: +15
  const firmIndustry = FIRM_INDUSTRY[alumni.firmName];
  if (firmIndustry && user.targetIndustry === firmIndustry) {
    score += 15;
  }

  // Firm prestige tier: +25 (tier 1), +18 (tier 2), +10 (tier 3)
  if (PRESTIGE_TIER_1.has(alumni.firmName)) {
    score += 25;
  } else if (PRESTIGE_TIER_2.has(alumni.firmName)) {
    score += 18;
  } else {
    score += 10;
  }

  // Mutual connections: +5 each, max 20
  score += Math.min(mutualConnections * 5, 20);

  return Math.min(score, 100);
}
