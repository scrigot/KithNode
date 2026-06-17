// Person-to-person mutual-connection edges captured from LinkedIn.
//
// When the user views contact C's LinkedIn profile, LinkedIn shows the people
// the VIEWER and C both know. Each is a warm-intro route to C. We store these
// as ContactConnection edges (owner-scoped) and resolve a mutual to a real
// AlumniContact in the owner's network when name/slug matches — that is when
// "you both know X" becomes a clickable warm path.
//
// This module is PURE: key/slug derivation, tolerant parsing, and resolution
// against caller-supplied lookup maps. All I/O lives in the route handlers, so
// every function here is unit-tested without a database.

export interface CapturedMutual {
  name: string;
  slug?: string;
}

/** A ContactConnection row ready to upsert. */
export interface MutualEdgeRow {
  ownerUserId: string;
  contactId: string;
  mutualName: string;
  mutualSlug: string;
  mutualKey: string;
  mutualContactId: string | null;
  source: string;
}

/** What the contact page renders per mutual. */
export interface ResolvedMutual {
  name: string;
  slug: string;
  /** AlumniContact id when this mutual is already in the owner's network. */
  contactId: string | null;
}

/** Max mutuals stored per captured profile (caps a runaway page parse). */
export const MAX_MUTUALS = 25;

/** Extract the lowercased `/in/<slug>` token from a LinkedIn URL, or "". */
export function slugFromLinkedInUrl(url: string): string {
  if (typeof url !== "string") return "";
  const m = url.match(/\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

/** Collapse a display name to a comparable key (trim, collapse spaces, lower). */
export function normalizeMutualName(name: string): string {
  return typeof name === "string"
    ? name.trim().replace(/\s+/g, " ").toLowerCase()
    : "";
}

/**
 * Stable dedupe/identity key for a mutual: the LinkedIn slug when known (the
 * strongest identifier), else the normalized name. Two captures of the same
 * person collapse to one edge.
 */
export function mutualKey(name: string, slug?: string): string {
  const s = (slug || "").trim().toLowerCase();
  return s || normalizeMutualName(name);
}

/**
 * Tolerant parse of a captured `mutuals` payload: accepts an array of
 * `{ name, slug? }` objects or bare name strings. A full LinkedIn URL in `slug`
 * is reduced to its `/in/` token. Drops empties, dedupes by key, caps at
 * MAX_MUTUALS. Never throws.
 */
export function parseCapturedMutuals(raw: unknown): CapturedMutual[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CapturedMutual[] = [];
  for (const item of raw) {
    let name = "";
    let slug = "";
    if (typeof item === "string") {
      name = item.trim();
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      name = typeof o.name === "string" ? o.name.trim() : "";
      slug = typeof o.slug === "string" ? o.slug.trim() : "";
      if (slug.includes("/in/")) slug = slugFromLinkedInUrl(slug);
      slug = slug.toLowerCase();
    }
    if (!name) continue;
    const key = mutualKey(name, slug);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(slug ? { name, slug } : { name });
    if (out.length >= MAX_MUTUALS) break;
  }
  return out;
}

/**
 * Build the slug+name -> contactId lookup from the owner's contacts. Slug keys
 * (the stronger identity) and normalized-name keys share one map; first writer
 * wins so a slug match is never clobbered by a later name collision.
 */
export function buildContactLookup(
  contacts: { id: string; name: string; linkedInUrl: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of contacts) {
    const slug = slugFromLinkedInUrl(c.linkedInUrl || "");
    if (slug && !map.has(slug)) map.set(slug, c.id);
    const nameKey = normalizeMutualName(c.name || "");
    if (nameKey && !map.has(nameKey)) map.set(nameKey, c.id);
  }
  return map;
}

/**
 * Resolve a captured mutual to an AlumniContact id in the owner's network, or
 * null. Prefers the slug (exact LinkedIn identity); falls back to the
 * normalized name. Never resolves a mutual back to the profile it was captured
 * on (selfContactId), which would create a self-loop edge.
 */
export function resolveMutualContactId(
  m: CapturedMutual,
  lookup: Map<string, string>,
  selfContactId?: string,
): string | null {
  const slug = (m.slug || "").toLowerCase();
  const hit =
    (slug && lookup.get(slug)) || lookup.get(normalizeMutualName(m.name)) || null;
  return hit && hit !== selfContactId ? hit : null;
}

/** Build ContactConnection upsert rows for a captured profile's mutuals. */
export function buildMutualEdges(
  ownerUserId: string,
  contactId: string,
  mutuals: CapturedMutual[],
  lookup: Map<string, string>,
  source = "linkedin_extension",
): MutualEdgeRow[] {
  return mutuals.map((m) => {
    const slug = (m.slug || "").toLowerCase();
    return {
      ownerUserId,
      contactId,
      mutualName: m.name,
      mutualSlug: slug,
      mutualKey: mutualKey(m.name, slug),
      mutualContactId: resolveMutualContactId(m, lookup, contactId),
      source,
    };
  });
}

/**
 * The set of mutualKey values that should resolve to THIS contact (its slug key
 * and its name key) — used for back-resolution: when a contact is added, any of
 * the owner's dangling edges that named this person by slug or name get linked.
 */
export function contactMatchKeys(name: string, linkedInUrl: string): string[] {
  const keys = new Set<string>();
  const slug = slugFromLinkedInUrl(linkedInUrl || "");
  if (slug) keys.add(slug);
  const nameKey = normalizeMutualName(name || "");
  if (nameKey) keys.add(nameKey);
  return [...keys];
}

/** Map stored edges to the display shape the contact page renders. */
export function edgesToResolvedMutuals(
  edges: {
    mutualName: string;
    mutualSlug?: string | null;
    mutualContactId?: string | null;
  }[],
): ResolvedMutual[] {
  return edges.map((e) => ({
    name: e.mutualName,
    slug: (e.mutualSlug || "").toString(),
    contactId: e.mutualContactId ?? null,
  }));
}
