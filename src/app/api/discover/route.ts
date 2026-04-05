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

  // Build query — exclude own imports and legacy unowned contacts
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

  const { data, error } = await builder
    .order("warmthScore", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ contacts: [], total: 0 }, { status: 500 });
  }

  // Filter out already rated (can't do NOT IN with Supabase easily)
  const filtered = (data || []).filter((c) => !ratedIds.includes(c.id));

  return NextResponse.json({
    contacts: filtered,
    total: filtered.length,
  });
}
