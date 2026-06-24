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
}

export interface RankedContact extends RankInput {
  score: number;
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

export function rankAiConsulting(contacts: RankInput[]): RankedContact[] {
  return contacts
    .map((c): RankedContact => {
      const title = c.title || "";
      const firm = c.firmName || "";
      const reasons: string[] = [];
      let score = 0;
      let connector = false;

      if (DATA_LEADER.test(title)) {
        score += 40;
        reasons.push("data leader · buyer");
      } else if (FOUNDER_EXEC.test(title)) {
        score += 26;
        reasons.push("founder / exec");
      } else if (PRACTITIONER.test(title)) {
        score += 18;
        reasons.push("practitioner");
      }
      if (CONNECTOR.test(title)) {
        score += 12;
        connector = true;
        reasons.push("connector");
      }
      if (AI_DATA_FIRM.test(firm)) {
        score += 14;
        reasons.push("AI/data firm");
      }

      // Manual label always adds on top (Sam's judgment wins).
      if (c.relationshipType === "buyer") {
        score += 30;
        reasons.push("tagged buyer");
      } else if (c.relationshipType === "practitioner") {
        score += 16;
        reasons.push("tagged practitioner");
      } else if (c.relationshipType === "ecosystem") {
        score += 12;
        connector = true;
        reasons.push("tagged ecosystem");
      }

      if (c.email) score += 3; // reachable

      return { ...c, score, reasons, connector };
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
