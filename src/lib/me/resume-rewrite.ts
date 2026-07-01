// Evidence-backed rewrite + JD-tailor helpers.
//
// The eng review flagged the citation contract as the highest-risk LLM surface:
// the model WILL occasionally cite evidence that doesn't exist or invent claims.
// So enforcement is deterministic here, not delegated to the prompt. These pieces
// are pure + tested; the route wires them to the gateway.

export interface Evidence {
  id: string;
  kind: string; // project | class | work | leadership | metric | skill
  title: string;
  detail: string;
  metric: string;
  proofUrl: string;
}

export interface RewriteCandidate {
  before: string;
  after: string;
  evidenceIds: string[];
}

export interface ValidatedRewrite extends RewriteCandidate {
  ok: boolean;
  reason?: string; // why it was flagged, if not ok
}

const STOP = new Set(["the", "and", "for", "with", "from", "this", "that", "you", "your", "our", "are", "will", "have", "has", "a", "an", "to", "of", "in", "on", "at", "by", "as", "is", "be", "or", "we", "they", "their", "it"]);
const tokenize = (s: string) => (s || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((t) => t.length > 2 && !STOP.has(t));

/**
 * Deterministic citation guard. A rewrite is valid only if every cited id exists
 * AND it cites at least one piece of evidence (no uncited claims). Flag, don't trust
 * the LLM to self-police. Returns each candidate annotated with ok/reason.
 */
export function validateCitations(candidates: RewriteCandidate[], evidence: Evidence[]): ValidatedRewrite[] {
  const ids = new Set(evidence.map((e) => e.id));
  return candidates.map((c) => {
    const cited = c.evidenceIds ?? [];
    if (cited.length === 0) return { ...c, ok: false, reason: "no evidence cited" };
    const missing = cited.filter((id) => !ids.has(id));
    if (missing.length) return { ...c, ok: false, reason: `cites unknown evidence: ${missing.join(", ")}` };
    if (!c.after.trim()) return { ...c, ok: false, reason: "empty rewrite" };
    return { ...c, ok: true };
  });
}

/**
 * Rank a user's evidence by relevance to a job description (token overlap over
 * title+detail+metric+kind). Deterministic preselect so the LLM call stays small
 * and grounded — never send the whole bank.
 */
export function matchEvidence(jobDescription: string, evidence: Evidence[], topN = 8): Evidence[] {
  const jd = new Set(tokenize(jobDescription));
  if (!jd.size) return evidence.slice(0, topN);
  const scored = evidence.map((e) => {
    const toks = tokenize(`${e.title} ${e.detail} ${e.metric} ${e.kind}`);
    const hits = toks.filter((t) => jd.has(t)).length;
    return { e, hits };
  });
  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, topN)
    .map((s) => s.e);
}

/** Keywords present in the JD but absent from the user's resume+evidence text. */
export function missingKeywords(jobDescription: string, resumeText: string, evidence: Evidence[]): string[] {
  const have = new Set([...tokenize(resumeText), ...evidence.flatMap((e) => tokenize(`${e.title} ${e.detail} ${e.metric}`))]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokenize(jobDescription)) {
    if (!have.has(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.slice(0, 20);
}
