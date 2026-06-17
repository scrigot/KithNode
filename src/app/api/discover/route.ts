import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { findWarmPaths } from "@/lib/warm-paths";
import { poolSafeContact } from "@/lib/redact";
import { sourcesForCategory, type DiscoverCategory, ALL_CATEGORIES } from "@/lib/discover/source-categories";
import { normalizeFirmName } from "@/lib/normalize-firm";

/** Normalize a LinkedIn URL for identity matching: lowercase, strip trailing
 * slash, ignore empty/whitespace-only values. */
function normalizeLinkedInUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

/** Normalize a name + firm pair into a single identity key. Falls back here
 * when a contact has no LinkedIn URL. Returns "" when name is missing. */
function normalizeNameFirm(
  name: string | null | undefined,
  firmName: string | null | undefined,
): string {
  const n = (name || "").trim().toLowerCase();
  if (!n) return "";
  const f = normalizeFirmName(firmName || "");
  return `${n}|${f}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const raw = request.nextUrl.searchParams.get("q") || "";
  const query = raw.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 100);
  const tier = request.nextUrl.searchParams.get("tier") || "";
  // Optional career-track filter. When non-empty, narrows the pool to that exact
  // track via an equality match on the AlumniContact.track column.
  const track = request.nextUrl.searchParams.get("track") || "";
  const rawSource = request.nextUrl.searchParams.get("source") || "alumni";
  const category: DiscoverCategory = ALL_CATEGORIES.includes(rawSource as DiscoverCategory)
    ? (rawSource as DiscoverCategory)
    : "alumni";
  const allowedSources = sourcesForCategory(category);

  // Get contacts the user has already rated, with their ratings.
  const { data: rated } = await supabase
    .from("UserDiscover")
    .select("contactId, rating")
    .eq("userId", userId);

  // later-rated contacts stay in the deck (they need a final rating); only
  // skip + high_value count as "done" for all-rated / empty-state logic.
  const finalRated = new Set<string>(
    (rated || [])
      .filter((r) => r.rating === "skip" || r.rating === "high_value")
      .map((r) => r.contactId),
  );
  const laterIds = new Set<string>(
    (rated || [])
      .filter((r) => r.rating === "later")
      .map((r) => r.contactId),
  );
  // Build query: prefer other users' contacts (shared pool)
  let builder = supabase
    .from("AlumniContact")
    .select("*")
    .neq("importedByUserId", userId)
    .neq("importedByUserId", "");

  if (query) {
    builder = builder.or(
      `name.ilike.%${query}%,firmName.ilike.%${query}%,title.ilike.%${query}%,education.ilike.%${query}%,location.ilike.%${query}%`,
    );
  }
  if (tier) {
    builder = builder.eq("tier", tier);
  }
  if (track) {
    builder = builder.eq("track", track);
  }
  builder = builder.in("source", allowedSources);

  const { data: otherData, error: otherError } = await builder
    .order("warmthScore", { ascending: false })
    .limit(100);

  if (otherError) {
    return NextResponse.json({ contacts: [], total: 0 }, { status: 500 });
  }

  let contacts = otherData || [];

  // Exclude shared-pool contacts that the CURRENT user has already imported
  // themselves (cross-user duplicate identities). Without this, a user who
  // imported "Jacob Goldstein @ KKR" still sees another user's copy of the same
  // person as a blurred "import to unlock" card. Match on normalized LinkedIn
  // URL (primary key), normalized name + firm, or — last resort — exact
  // normalized full name. Name-only is deliberately aggressive: pool copies of
  // someone you know often carry a DIFFERENT firm string (club-as-firm seed
  // rows, job changes), and hiding a same-named stranger is the cheaper error.
  const { data: ownImports } = await supabase
    .from("AlumniContact")
    .select("linkedInUrl, name, firmName")
    .eq("importedByUserId", userId);

  // Contacts the user already added to their pipeline. A piped contact must
  // never reappear in the deck — re-showing one let the user add it again
  // (e.g. Jacob Goldstein twice). The PipelineEntry(contactId,userId) unique
  // index stops a literal duplicate ROW, but this is the upstream fix: keep the
  // already-handled contact out of the feed entirely. Match on the pool row's
  // id, which is exactly what PipelineEntry.contactId stores.
  const { data: pipelineRows } = await supabase
    .from("PipelineEntry")
    .select("contactId")
    .eq("userId", userId);
  const pipedContactIds = new Set<string>(
    (pipelineRows || []).map((p) => p.contactId).filter(Boolean),
  );

  const ownLinkedInUrls = new Set<string>();
  const ownNameFirms = new Set<string>();
  const ownNames = new Set<string>();
  for (const own of ownImports || []) {
    const url = normalizeLinkedInUrl(own.linkedInUrl);
    if (url) ownLinkedInUrls.add(url);
    const nameFirm = normalizeNameFirm(own.name, own.firmName);
    if (nameFirm) ownNameFirms.add(nameFirm);
    const name = (own.name || "").trim().toLowerCase();
    if (name) ownNames.add(name);
  }

  contacts = contacts.filter((c) => {
    if (pipedContactIds.has(c.id)) return false;
    const url = normalizeLinkedInUrl(c.linkedInUrl);
    if (url && ownLinkedInUrls.has(url)) return false;
    const nameFirm = normalizeNameFirm(c.name, c.firmName);
    if (nameFirm && ownNameFirms.has(nameFirm)) return false;
    const name = (c.name || "").trim().toLowerCase();
    if (name && ownNames.has(name)) return false;
    return true;
  });

  // NOTE: the old "show the user's own contacts when the pool is empty"
  // fallback is gone — Discover is strictly the shared pool now. An exhausted
  // pool lands on the all-rated state (networkSize distinguishes no-network).

  // Exclude contacts the user has given a final rating (skip / high_value).
  // later-rated contacts are kept but separated so they can be appended last.
  const unrated = contacts.filter((c) => !finalRated.has(c.id) && !laterIds.has(c.id));
  const deferred = contacts.filter((c) => laterIds.has(c.id));

  // Stable ordering: unrated first, later-rated appended at the end.
  const filtered = [...unrated, ...deferred];

  // Enrich each contact with warm paths (user's own contacts at the same firm).
  // Guard: a contact can never be their own warm-path intermediary. Drop any
  // path whose intermediary matches the contact by name or LinkedIn URL — this
  // prevents "via Jacob Goldstein -> Jacob Goldstein" self-referential paths.
  const enriched = await Promise.all(
    filtered.map(async (c) => {
      const contactUrl = normalizeLinkedInUrl(c.linkedInUrl);
      const warmPaths = (await findWarmPaths(userId, c.firmName)).filter(
        (wp) =>
          wp.intermediaryName !== c.name &&
          (!contactUrl ||
            normalizeLinkedInUrl(wp.intermediaryLinkedInUrl) !== contactUrl),
      );
      // later-rated contacts carry a deferred flag so the UI can signal that
      // the user has already seen them once and deferred the decision.
      return laterIds.has(c.id) ? { ...c, warmPaths, deferred: true } : { ...c, warmPaths };
    }),
  );

  // Project each pool contact down to the safe field allowlist. poolSafeContact
  // drops the owner's private columns (importedByUserId, email, isFriend,
  // lastSpokenAt, speakFrequency, hometown, highSchool, passions) entirely — the
  // service-role client returns them via select(*), so this projection is the
  // only guard. Identity (name / firm / title / linkedInUrl) stays CLEAR: the
  // old "blur until High Value unlock" gate is gone — ranked results show
  // directly (isRedacted is always false). The user's own imports pass through
  // untouched. warmPaths / deferred are route-computed UI metadata (warm paths
  // reference the user's OWN imports, see src/lib/warm-paths.ts), so re-attach
  // them after projection strips everything off-allowlist.
  const projected = enriched.map(({ warmPaths, deferred, ...c }) => {
    const safe = c.importedByUserId === userId ? c : poolSafeContact(c);
    return { ...safe, warmPaths, ...(deferred ? { deferred: true } : {}) };
  });

  // The user's own import count, so the UI can tell "you have no network"
  // apart from "you've rated everyone in this tab" (total = pool AFTER
  // exclusions, which legitimately hits 0 once the deck is exhausted).
  const { count: networkSize } = await supabase
    .from("AlumniContact")
    .select("*", { count: "exact", head: true })
    .eq("importedByUserId", userId);

  return NextResponse.json({
    contacts: projected,
    total: projected.length,
    networkSize: networkSize ?? 0,
  });
}
