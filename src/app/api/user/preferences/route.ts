import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({}, { status: 401 });

  const { data, error } = await supabase
    .from("User")
    .select("university, hometown, greekOrg, targetIndustries, targetFirms, targetLocations")
    .eq("email", email)
    .single();

  if (error || !data) return NextResponse.json({});

  const parseList = (val: string | null): string[] => {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return val ? [val] : []; }
  };

  return NextResponse.json({
    university: data.university || "",
    hometown: data.hometown || "",
    greekOrg: data.greekOrg || "",
    targetIndustries: parseList(data.targetIndustries),
    targetFirms: parseList(data.targetFirms),
    targetLocations: parseList(data.targetLocations),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const serializeList = (val: unknown): string => {
    if (Array.isArray(val)) return JSON.stringify(val);
    return "";
  };

  const { error } = await supabase
    .from("User")
    .update({
      university: body.current_university || "",
      hometown: body.hometown || "",
      greekOrg: body.greek_life || "",
      targetIndustries: serializeList(body.target_industries),
      targetFirms: serializeList(body.target_companies),
      targetLocations: serializeList(body.target_locations),
    })
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
