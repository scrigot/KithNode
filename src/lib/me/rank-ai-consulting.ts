// Warm-network ranking for in-field AI consulting on data services.
//
// Pure + deterministic (no DB, no model) so it's unit-tested and reused on
// either side. It does NOT touch the finance-tier scorer in linkedin-import.ts;
// it builds its own ICP, weighted buyers > practitioners > ecosystem (Sam's call).
//
//  - BUYERS: data/AI leaders who'd hire consulting (Head/VP/Dir of Data/Analytics/
//    Eng/AI, CDO, CTO), and founders/execs at data-heavy startups. Highest value.
//  - PRACTITIONERS: people doing the work (data scientists/engineers, ML, analytics,
//    consultants) — referrals + learning.
//  - ECOSYSTEM / CONNECTORS: investors, recruiters, partners, community/devrel —
//    reach and intros (these populate the "Can intro me" list).
//
// A manual relationshipType label (buyer|practitioner|ecosystem) always adds on
// top of the inferred signals, so Sam's own judgment wins.

export interface RankInput {
  id: string;
  name: string;
  firmName: string;
  title: string;
  email: string;
  relationshipType: string; // "" | buyer | practitioner | ecosystem
  inPipeline: boolean;
  education?: string;
  pastFirms?: string;
  location?: string;
}

// Sam's own profile, for warm-signal overlap. Optional everywhere — when absent,
// warmth is 0 and ranking is byte-for-byte the ICP-only behavior.
export interface MeProfileLite {
  schools?: string;
  pastFirms?: string;
  hometown?: string;
  location?: string;
}

export interface RankedContact extends RankInput {
  score: number; // icp + warmth
  icpScore: number;
  warmthScore: number;
  icpReasons: string[];
  warmthReasons: string[];
  reasons: string[];
  connector: boolean;
}

const DATA_LEADER =
  /\b(chief data|chief ai|chief analytics|cdo|cto|chief technology|vp\s+(of\s+)?(data|analytics|engineering|ai)|head of (data|analytics|engineering|ai|machine learning)|director of (data|analytics|engineering|ai)|vp,?\s*(data|analytics|engineering))\b/i;
const FOUNDER_EXEC = /\b(founder|co-?founder|cofounder|ceo|cto|chief executive)\b/i;
const PRACTITIONER =
  /\b(data scientist|data engineer|ml engineer|machine learning|ai engineer|applied (ai|ml)|analytics|data analyst|solutions architect|consultant|forward deployed)\b/i;
const CONNECTOR =
  /\b(recruiter|talent|partner|venture|investor|vc\b|principal|managing director|business development|\bbd\b|community|ecosystem|developer relations|devrel|evangelist|advisor)\b/i;
const AI_DATA_FIRM =
  /\b(anthropic|openai|deepmind|mistral|cohere|databricks|snowflake|scale ai|hugging\s*face|palantir|nvidia|fivetran|dbt|confluent|datadog|sigma|looker|tableau|data|analytics|ai\b|\bml\b|intelligence)\b/i;

const wnorm = (s: string | undefined) => (s || "").toLowerCase();
const wtokens = (s: string | undefined) => wnorm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2);

// Warm-signal overlap between Sam's profile and a contact's stored fields. Only
// uses fields we actually store (education / pastFirms / firmName / location).
function warmth(c: RankInput, p?: MeProfileLite): { score: number; reasons: string[] } {
  if (!p) return { score: 0, reasons: [] };
  const reasons: string[] = [];
  let score = 0;
  const overlap = (a: string | undefined, b: string | undefined) => {
    const ta = new Set(wtokens(a));
    return wtokens(b).some((t) => ta.has(t));
  };
  if (overlap(p.schools, c.education)) { score += 15; reasons.push("shared school"); }
  if (overlap(p.pastFirms, c.pastFirms) || overlap(p.pastFirms, c.firmName)) { score += 12; reasons.push("shared employer"); }
  if (overlap(p.location, c.location) || overlap(p.hometown, c.location)) { score += 8; reasons.push("same area"); }
  return { score, reasons };
}

export function rankAiConsulting(contacts: RankInput[], opts: { profile?: MeProfileLite } = {}): RankedContact[] {
  return contacts
    .map((c): RankedContact => {
      const title = c.title || "";
      const firm = c.firmName || "";
      const icpReasons: string[] = [];
      let icpScore = 0;
      let connector = false;

      if (DATA_LEADER.test(title)) {
        icpScore += 40;
        icpReasons.push("data leader · buyer");
      } else if (FOUNDER_EXEC.test(title)) {
        icpScore += 26;
        icpReasons.push("founder / exec");
      } else if (PRACTITIONER.test(title)) {
        icpScore += 18;
        icpReasons.push("practitioner");
      }
      if (CONNECTOR.test(title)) {
        icpScore += 12;
        connector = true;
        icpReasons.push("connector");
      }
      if (AI_DATA_FIRM.test(firm)) {
        icpScore += 14;
        icpReasons.push("AI/data firm");
      }

      // Manual label always adds on top (Sam's judgment wins).
      if (c.relationshipType === "buyer") {
        icpScore += 30;
        icpReasons.push("tagged buyer");
      } else if (c.relationshipType === "practitioner") {
        icpScore += 16;
        icpReasons.push("tagged practitioner");
      } else if (c.relationshipType === "ecosystem") {
        icpScore += 12;
        connector = true;
        icpReasons.push("tagged ecosystem");
      }

      if (c.email) icpScore += 3; // reachable

      const w = warmth(c, opts.profile);

      return {
        ...c,
        score: icpScore + w.score,
        icpScore,
        warmthScore: w.score,
        icpReasons,
        warmthReasons: w.reasons,
        reasons: [...icpReasons, ...w.reasons],
        connector,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** "Reconnect with": highest-value people, surfacing ones you aren't tracking yet. */
export function reconnectList(ranked: RankedContact[], limit = 25): RankedContact[] {
  return ranked
    .filter((c) => c.score > 0)
    .sort((a, b) => Number(a.inPipeline) - Number(b.inPipeline) || b.score - a.score)
    .slice(0, limit);
}

/** "Can intro me": connectors / ecosystem, by score. */
export function introList(ranked: RankedContact[], limit = 25): RankedContact[] {
  return ranked.filter((c) => c.connector).slice(0, limit);
}
