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
      : prefs.pastFirms.map((firm) => ({ title: "", firm, start: "", end: "" }));

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

  const gradYearRaw = Number(body.graduation_year);
  const graduationYear =
    Number.isInteger(gradYearRaw) && gradYearRaw >= 2000 && gradYearRaw <= 2100
      ? gradYearRaw
      : null;

  const weeklyGoalRaw = Number(body.weekly_goal_target);
  const weeklyGoalTarget =
    Number.isFinite(weeklyGoalRaw) && weeklyGoalRaw > 0
      ? Math.min(99, Math.round(weeklyGoalRaw))
      : 3;

  // ── Conversion-funnel diagnose answers ──────────────────────────────────
  // Single-select goal + timeline: trimmed free-ish strings, capped at 80.
  const onboardingGoal =
    typeof body.onboarding_goal === "string"
      ? body.onboarding_goal.trim().slice(0, 80)
      : undefined;
  const onboardingTimeline =
    typeof body.onboarding_timeline === "string"
      ? body.onboarding_timeline.trim().slice(0, 80)
      : undefined;
  // Multi-select pain: trim, cap each at 120, cap the list at 8, JSON-stringify.
  const onboardingPain = Array.isArray(body.onboarding_pain)
    ? JSON.stringify(
        body.onboarding_pain
          .map((p: unknown) => String(p).trim().slice(0, 120))
          .filter(Boolean)
          .slice(0, 8),
      )
    : undefined;
  // Tutorial completion marker: accept an ISO string (parsed → ISO) or explicit
  // null to clear it. Another lane's dashboard tour POSTs this on completion.
  let tutorialDoneAt: string | null | undefined;
  if (body.tutorial_done_at === null) {
    tutorialDoneAt = null;
  } else if (
    typeof body.tutorial_done_at === "string" &&
    !Number.isNaN(Date.parse(body.tutorial_done_at))
  ) {
    tutorialDoneAt = new Date(body.tutorial_done_at).toISOString();
  } else {
    tutorialDoneAt = undefined;
  }

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

  // PATCH semantics: only write a column when the request actually carries it.
  // A partial POST (the tour marking tutorialDoneAt, or a single funnel step)
  // must NEVER blank the rest of the profile. Full-body callers (settings,
  // onboarding profile steps) send every key, so they still write everything.
  const patch: Record<string, unknown> = {};
  if ("current_university" in body) patch.university = body.current_university || "";
  if ("high_school" in body) patch.highSchool = body.high_school || "";
  if ("hometown" in body) patch.hometown = body.hometown || "";
  if ("greek_life" in body) patch.greekOrg = body.greek_life || "";
  if ("minor" in body) patch.minor = minor;
  if ("target_industries" in body) patch.targetIndustries = serializeList(body.target_industries);
  if ("target_companies" in body) patch.targetFirms = serializeList(body.target_companies);
  if ("target_locations" in body) patch.targetLocations = serializeList(body.target_locations);
  if ("skills" in body) patch.skills = JSON.stringify(rawSkills);
  if ("recruiting_date" in body) patch.recruitingDate = recruitingDate;
  if ("graduation_year" in body) patch.graduationYear = graduationYear;
  if ("weekly_goal_target" in body) patch.weeklyGoalTarget = weeklyGoalTarget;

  // Education trio: written from structured rows when present, else from any
  // legacy flat education key supplied.
  if (educationsJson !== undefined || "major" in body || "degrees" in body || "concentration" in body) {
    patch.major = major;
    patch.degrees = degrees;
    patch.concentration = concentration;
  }
  if (educationsJson !== undefined) patch.educations = educationsJson;
  if (experiencesJson !== undefined || "past_firms" in body) patch.pastFirms = pastFirmsJson;
  if (experiencesJson !== undefined) patch.experiences = experiencesJson;
  if (clubMembershipsJson !== undefined || "clubs" in body) patch.clubs = clubsJson;
  if (clubMembershipsJson !== undefined) patch.clubMemberships = clubMembershipsJson;

  if (onboardingGoal !== undefined) patch.onboardingGoal = onboardingGoal;
  if (onboardingPain !== undefined) patch.onboardingPain = onboardingPain;
  if (onboardingTimeline !== undefined) patch.onboardingTimeline = onboardingTimeline;
  if (tutorialDoneAt !== undefined) patch.tutorialDoneAt = tutorialDoneAt;

  // Empty body → nothing to write; succeed without a no-op update.
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("User")
    .update(patch)
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
