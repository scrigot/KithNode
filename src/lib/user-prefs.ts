import { supabase } from "@/lib/supabase";
import {
  type EducationEntry,
  type ExperienceEntry,
  parseEducations,
  parseExperiences,
} from "@/lib/educations";
import { type ClubEntry, parseClubMemberships } from "@/lib/club-memberships";

/**
 * Per-user scoring preferences. Drives the personalized warmth score in
 * detectAffiliations(). All array fields are stored on the Supabase User
 * table as JSON strings — this helper parses them into typed arrays.
 */
export interface UserPrefs {
  university: string;
  highSchool: string;
  hometown: string;
  greekOrg: string;
  major: string;
  minor: string;
  /** Comma-joined area(s) of emphasis within the major (e.g. "Finance"). Feeds
   * the Same Major matcher alongside major/minor. */
  concentration: string;
  /** Canonical degree designations, comma-joined (e.g. "BS, MBA"). Grad/pro
   * degrees here drive the Same Program matcher. */
  degrees: string;
  targetIndustries: string[];
  targetFirms: string[];
  targetLocations: string[];
  clubs: string[];
  skills: string[];
  /** The user's own past employers. Drives the Shared Employer matcher. Stored
   * JSON-stringified on the User.pastFirms column (like clubs/skills). */
  pastFirms: string[];
  /** Structured education rows. UI truth; flat major/degrees/concentration are
   * derived from these on every save. */
  educations: EducationEntry[];
  /** Structured experience rows. UI truth; pastFirms is derived from these. */
  experiences: ExperienceEntry[];
  /** Structured club/role rows. UI truth; flat clubs is derived from these. */
  clubMemberships: ClubEntry[];
  recruitingDate: string | null;
  weeklyGoalTarget: number;
}

export type { EducationEntry, ExperienceEntry, ClubEntry };

const EMPTY_PREFS: UserPrefs = {
  university: "",
  highSchool: "",
  hometown: "",
  greekOrg: "",
  major: "",
  minor: "",
  concentration: "",
  degrees: "",
  targetIndustries: [],
  targetFirms: [],
  targetLocations: [],
  clubs: [],
  skills: [],
  pastFirms: [],
  educations: [],
  experiences: [],
  clubMemberships: [],
  recruitingDate: null,
  weeklyGoalTarget: 3,
};

function parseList(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return val ? [val] : [];
  }
}

/**
 * Load a user's scoring preferences from the Supabase User table.
 * Returns empty defaults if the user doesn't exist or has no prefs set yet.
 *
 * Single source of truth for the preferences shape — used by:
 *   - GET /api/user/preferences
 *   - POST /api/import/linkedin (per-user scoring at import)
 *   - POST /api/contacts/rescore (batch rescore)
 *   - POST /api/contacts/enrich (enrichment + score)
 *   - POST /api/outreach/draft (personalized email prompts)
 */
export async function getUserPrefs(email: string): Promise<UserPrefs> {
  if (!email) return EMPTY_PREFS;

  const { data, error } = await supabase
    .from("User")
    .select(
      "university, highSchool, hometown, greekOrg, major, minor, concentration, degrees, targetIndustries, targetFirms, targetLocations, clubs, skills, pastFirms, educations, experiences, clubMemberships, recruitingDate, weeklyGoalTarget"
    )
    .eq("email", email)
    .single();

  if (error || !data) return EMPTY_PREFS;

  return {
    university: data.university || "",
    highSchool: data.highSchool || "",
    hometown: data.hometown || "",
    greekOrg: data.greekOrg || "",
    major: data.major || "",
    minor: data.minor || "",
    concentration: data.concentration || "",
    degrees: data.degrees || "",
    targetIndustries: parseList(data.targetIndustries),
    targetFirms: parseList(data.targetFirms),
    targetLocations: parseList(data.targetLocations),
    clubs: parseList(data.clubs),
    skills: parseList(data.skills),
    pastFirms: parseList(data.pastFirms),
    educations: parseEducations(data.educations),
    experiences: parseExperiences(data.experiences),
    clubMemberships: parseClubMemberships(data.clubMemberships),
    recruitingDate: data.recruitingDate ?? null,
    weeklyGoalTarget: data.weeklyGoalTarget ?? 3,
  };
}
