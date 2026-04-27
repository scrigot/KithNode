import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { findWarmPaths } from "@/lib/warm-paths";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const query = request.nextUrl.searchParams.get("q") || "";
  const tier = request.nextUrl.searchParams.get("tier") || "";
  const source = request.nextUrl.searchParams.get("source") || "alumni";

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
  if (source === "professor") {
    builder = builder.eq("source", "professor");
  } else {
    builder = builder.neq("source", "professor");
  }

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
    if (source === "professor") {
      ownBuilder = ownBuilder.eq("source", "professor");
    } else {
      ownBuilder = ownBuilder.neq("source", "professor");
    }

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

  return NextResponse.json({
    contacts: enriched,
    total: enriched.length,
  });
}
