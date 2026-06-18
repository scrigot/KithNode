// Pooled-contact dedupe. Pure + unit-testable (no I/O).
//
// When several Node members have imported the same person, we collapse to one
// record. Key = normalized linkedInUrl, fallback name+firmName. The RICHEST
// record wins (most non-empty fields; tiebreak most recent enrichedAt) — the
// same "richer data wins" rule the rest of the app uses.

export interface PoolContact {
  id: string;
  name: string;
  firmName: string;
  title: string;
  linkedInUrl: string;
  education: string;
  location: string;
  warmthScore: number;
  tier: string;
  affiliations: string;
  graduationYear: number | null;
  degrees: string;
  concentration: string;
  hometown: string;
  enrichedAt: string | null;
  importedByUserId: string; // owner (User id)
  sharedInNodes: boolean;
  // Attached for the "via {friend}" warm path:
  ownerId: string; // = importedByUserId
  ownerName: string;
}

/** Normalize a LinkedIn URL for dedupe (protocol/www/trailing slash/query). */
export function normalizeLinkedIn(url: string | null | undefined): string {
  if (!url) return "";
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "");
}

/** Dedupe key: linkedIn if present, else name|firm (both lowercased). */
export function dedupeKey(c: Pick<PoolContact, "linkedInUrl" | "name" | "firmName">): string {
  const li = normalizeLinkedIn(c.linkedInUrl);
  if (li) return `li:${li}`;
  return `nf:${(c.name || "").trim().toLowerCase()}|${(c.firmName || "").trim().toLowerCase()}`;
}

const RICHNESS_FIELDS: (keyof PoolContact)[] = [
  "name", "firmName", "title", "linkedInUrl", "education", "location",
  "affiliations", "degrees", "concentration", "hometown", "graduationYear",
];

/** Count of non-empty signal fields — higher = richer record. */
export function richness(c: PoolContact): number {
  let n = 0;
  for (const f of RICHNESS_FIELDS) {
    const v = c[f];
    if (v !== null && v !== undefined && v !== "" && v !== 0) n += 1;
  }
  return n;
}

/** Returns the winner between two duplicates: more fields, tiebreak newer enrichedAt. */
function richer(a: PoolContact, b: PoolContact): PoolContact {
  const ra = richness(a);
  const rb = richness(b);
  if (ra !== rb) return ra > rb ? a : b;
  const ta = a.enrichedAt ? Date.parse(a.enrichedAt) : 0;
  const tb = b.enrichedAt ? Date.parse(b.enrichedAt) : 0;
  return tb > ta ? b : a;
}

/** Collapse duplicates across the pool; richest record per person wins. */
export function dedupePooled(rows: PoolContact[]): PoolContact[] {
  const byKey = new Map<string, PoolContact>();
  for (const row of rows) {
    const key = dedupeKey(row);
    const existing = byKey.get(key);
    byKey.set(key, existing ? richer(existing, row) : row);
  }
  return Array.from(byKey.values());
}
