import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  const query = request.nextUrl.searchParams.get("q") || "";
  const tier = request.nextUrl.searchParams.get("tier") || "";

  // Get IDs user already rated
  const { data: rated } = await supabase
    .from("UserDiscover")
    .select("contactId")
    .eq("userId", userId);
  const ratedIds = (rated || []).map((r) => r.contactId);

  // Build query — prefer other users' contacts (shared pool)
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

    const { data: ownData } = await ownBuilder
      .order("warmthScore", { ascending: false })
      .limit(100);

    contacts = ownData || [];
  }

  // Filter out already rated
  const filtered = contacts.filter((c) => !ratedIds.includes(c.id));

  return NextResponse.json({
    contacts: filtered,
    total: filtered.length,
  });
}
