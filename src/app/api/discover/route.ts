import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { findWarmPaths } from "@/lib/warm-paths";
import { maybeRedact } from "@/lib/redact";
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
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const raw = request.nextUrl.searchParams.get("q") || "";
  const query = raw.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 100);
  const tier = request.nextUrl.searchParams.get("tier") || "";
  const rawSource = request.nextUrl.searchParams.get("source") || "alumni";
  const category: DiscoverCategory = ALL_CATEGORIES.includes(rawSource as DiscoverCategory)
    ? (rawSource as DiscoverCategory)
    : "alumni";
  const allowedSources = sourcesForCategory(category);

  // Get IDs user already rated
  const { data: rated } = await supabase
    .from("UserDiscover")
    .select("contactId")
    .eq("userId", userId);
  const ratedIds = (rated || []).map((r) => r.contactId);

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
  // URL (primary key) or normalized name + firm (fallback).
  const { data: ownImports } = await supabase
    .from("AlumniContact")
    .select("linkedInUrl, name, firmName")
    .eq("importedByUserId", userId);

  const ownLinkedInUrls = new Set<string>();
  const ownNameFirms = new Set<string>();
  for (const own of ownImports || []) {
    const url = normalizeLinkedInUrl(own.linkedInUrl);
    if (url) ownLinkedInUrls.add(url);
    const nameFirm = normalizeNameFirm(own.name, own.firmName);
    if (nameFirm) ownNameFirms.add(nameFirm);
  }

  contacts = contacts.filter((c) => {
    const url = normalizeLinkedInUrl(c.linkedInUrl);
    if (url && ownLinkedInUrls.has(url)) return false;
    const nameFirm = normalizeNameFirm(c.name, c.firmName);
    if (nameFirm && ownNameFirms.has(nameFirm)) return false;
    return true;
  });

  // Fallback: if no other-user contacts exist (single-user demo / no shared pool yet),
  // show the user's own contacts so Discover is not empty
  if (contacts.length === 0) {
    let ownBuilder = supabase
      .from("AlumniContact")
      .select("*")
      .eq("importedByUserId", userId);

    if (query) {
      ownBuilder = ownBuilder.or(
        `name.ilike.%${query}%,firmName.ilike.%${query}%,title.ilike.%${query}%,education.ilike.%${query}%,location.ilike.%${query}%`,
      );
    }
    if (tier) {
      ownBuilder = ownBuilder.eq("tier", tier);
    }
    ownBuilder = ownBuilder.in("source", allowedSources);

    const { data: ownData } = await ownBuilder
      .order("warmthScore", { ascending: false })
      .limit(100);

    contacts = ownData || [];
  }

  // Filter out already rated
  const filtered = contacts.filter((c) => !ratedIds.includes(c.id));

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
      return { ...c, warmPaths };
    }),
  );

  // Redact PII for contacts not imported by the current user.
  // Warm paths reference the user's OWN imports (see src/lib/warm-paths.ts),
  // so they stay clear.
  const redacted = enriched.map((c) => maybeRedact(c, userId));

  return NextResponse.json({
    contacts: redacted,
    total: redacted.length,
  });
}
