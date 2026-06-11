import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { normalizeDegrees } from "@/lib/normalize-degrees";
import {
  parseEducations,
  parseExperiences,
  flatFromEducations,
  firmsFromExperiences,
  educationsFromFlat,
} from "@/lib/educations";
import {
  parseClubMemberships,
  clubsFlatFromMemberships,
  membershipsFromFlat,
} from "@/lib/club-memberships";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({}, { status: 401 });

  const prefs = await getUserPrefs(email);

  // When no structured rows exist yet, synthesize from the flat columns so
  // old profiles display rows immediately without requiring a re-save.
  const educations =
    prefs.educations.length > 0
      ? prefs.educations
      : educationsFromFlat(prefs.major, prefs.degrees, prefs.concentration);

  // Synthesize experience rows from the flat pastFirms list when no rows exist.
  const experiences =
    prefs.experiences.length > 0
      ? prefs.experiences
      : prefs.pastFirms.map((firm) => ({ title: "", firm, dates: "" }));

  // Synthesize club membership rows from the flat clubs list when no rows exist.
  const clubMemberships =
    prefs.clubMemberships.length > 0
      ? prefs.clubMemberships
      : membershipsFromFlat(prefs.clubs.join(", "));

  return NextResponse.json({ ...prefs, educations, experiences, clubMemberships });
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

  const rawSkills = Array.isArray(body.skills)
    ? body.skills
        .map((s: unknown) => String(s).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  // Past employers: free-text firm names (no canonical pool). Trim, cap each at
  // 80 chars, cap the list at 8. Stored JSON-stringified like clubs/skills.
  const rawPastFirms = Array.isArray(body.past_firms)
    ? body.past_firms
        .map((f: unknown) => String(f).trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 8)
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

  // When educations array is present, derive major/degrees/concentration from
  // it. Otherwise fall back to legacy flat handling (back-compat).
  let major: string;
  let concentration: string;
  let degrees: string;
  let educationsJson: string | undefined;

  if (Array.isArray(body.educations)) {
    const parsedEdus = parseEducations(JSON.stringify(body.educations));
    educationsJson = JSON.stringify(parsedEdus);
    const flat = flatFromEducations(parsedEdus);
    major = flat.major;
    degrees = flat.degrees;
    concentration = flat.concentration;
  } else {
    // Legacy flat columns: comma-joined strings, trimmed and capped at 160.
    major = typeof body.major === "string" ? body.major.trim().slice(0, 160) : "";
    concentration =
      typeof body.concentration === "string" ? body.concentration.trim().slice(0, 160) : "";
    // degrees: filtered to canonical closed set; invalid tokens silently dropped.
    degrees =
      typeof body.degrees === "string" ? normalizeDegrees(body.degrees) : "";
  }

  const minor = typeof body.minor === "string" ? body.minor.trim().slice(0, 160) : "";

  // When experiences array is present, derive pastFirms from it.
  let pastFirmsJson: string;
  let experiencesJson: string | undefined;

  if (Array.isArray(body.experiences)) {
    const parsedExps = parseExperiences(JSON.stringify(body.experiences));
    experiencesJson = JSON.stringify(parsedExps);
    pastFirmsJson = JSON.stringify(firmsFromExperiences(parsedExps));
  } else {
    pastFirmsJson = JSON.stringify(rawPastFirms);
  }

  // When clubMemberships array is present, derive flat clubs from it.
  // Absent → legacy flat clubs handling stays (rawClubs).
  let clubsJson: string = JSON.stringify(rawClubs);
  let clubMembershipsJson: string | undefined;

  if (Array.isArray(body.clubMemberships)) {
    const parsedMemberships = parseClubMemberships(JSON.stringify(body.clubMemberships));
    clubMembershipsJson = JSON.stringify(parsedMemberships);
    clubsJson = JSON.stringify(clubsFlatFromMemberships(parsedMemberships).split(", ").filter(Boolean));
  }

  const patch: Record<string, unknown> = {
    university: body.current_university || "",
    highSchool: body.high_school || "",
    hometown: body.hometown || "",
    greekOrg: body.greek_life || "",
    major,
    minor,
    concentration,
    degrees,
    targetIndustries: serializeList(body.target_industries),
    targetFirms: serializeList(body.target_companies),
    targetLocations: serializeList(body.target_locations),
    clubs: clubsJson,
    skills: JSON.stringify(rawSkills),
    pastFirms: pastFirmsJson,
    recruitingDate,
    weeklyGoalTarget,
  };
  if (educationsJson !== undefined) patch.educations = educationsJson;
  if (experiencesJson !== undefined) patch.experiences = experiencesJson;
  if (clubMembershipsJson !== undefined) patch.clubMemberships = clubMembershipsJson;

  const { error } = await supabase
    .from("User")
    .update(patch)
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
