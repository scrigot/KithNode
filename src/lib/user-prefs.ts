import { supabase } from "@/lib/supabase";

/**
 * Per-user scoring preferences. Drives the personalized warmth score in
 * detectAffiliations(). All array fields are stored on the Supabase User
 * table as JSON strings — this helper parses them into typed arrays.
 */
export interface UserPrefs {
  university: string;
  hometown: string;
  greekOrg: string;
  targetIndustries: string[];
  targetFirms: string[];
  targetLocations: string[];
}

const EMPTY_PREFS: UserPrefs = {
  university: "",
  hometown: "",
  greekOrg: "",
  targetIndustries: [],
  targetFirms: [],
  targetLocations: [],
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
    .select("university, hometown, greekOrg, targetIndustries, targetFirms, targetLocations")
    .eq("email", email)
    .single();

  if (error || !data) return EMPTY_PREFS;

  return {
    university: data.university || "",
    hometown: data.hometown || "",
    greekOrg: data.greekOrg || "",
    targetIndustries: parseList(data.targetIndustries),
    targetFirms: parseList(data.targetFirms),
    targetLocations: parseList(data.targetLocations),
  };
}
