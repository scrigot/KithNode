import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { findWarmPaths } from "@/lib/warm-paths";
import { maybeRedact } from "@/lib/redact";
import { sourcesForCategory, type DiscoverCategory, ALL_CATEGORIES } from "@/lib/discover/source-categories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const query = request.nextUrl.searchParams.get("q") || "";
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

  // Enrich each contact with warm paths (user's own contacts at the same firm)
  const enriched = await Promise.all(
    filtered.map(async (c) => {
      const warmPaths = await findWarmPaths(userId, c.firmName);
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
