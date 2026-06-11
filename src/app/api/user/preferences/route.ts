import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({}, { status: 401 });

  const prefs = await getUserPrefs(email);
  return NextResponse.json(prefs);
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

  const rawClubs = Array.isArray(body.clubs)
    ? body.clubs
        .map((c: unknown) => String(c).trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const recruitingDate =
    typeof body.recruiting_date === "string" &&
    !Number.isNaN(Date.parse(body.recruiting_date))
      ? new Date(body.recruiting_date).toISOString()
      : null;

  const weeklyGoalRaw = Number(body.weekly_goal_target);
  const weeklyGoalTarget =
    Number.isFinite(weeklyGoalRaw) && weeklyGoalRaw > 0
      ? Math.min(99, Math.round(weeklyGoalRaw))
      : 3;

  const { error } = await supabase
    .from("User")
    .update({
      university: body.current_university || "",
      highSchool: body.high_school || "",
      hometown: body.hometown || "",
      greekOrg: body.greek_life || "",
      targetIndustries: serializeList(body.target_industries),
      targetFirms: serializeList(body.target_companies),
      targetLocations: serializeList(body.target_locations),
      clubs: JSON.stringify(rawClubs),
      recruitingDate,
      weeklyGoalTarget,
    })
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
