import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const tier = request.nextUrl.searchParams.get("tier") || "";

  let builder = supabase.from("AlumniContact").select("*");

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
    .limit(50);

  if (error) {
    return NextResponse.json({ contacts: [], total: 0 }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [], total: data?.length || 0 });
}
