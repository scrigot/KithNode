// Shared contact rescoring. ONE source of truth for turning a contact row +
// the user's prefs + their manual tags into { affiliations, score, tier }.
//
// Before this existed, the tags route and the enrich route each had their own
// recompute. The enrich one did NOT load contact_tags, so enriching a contact
// after tagging it WIPED every tag-driven affiliation off the row. Both now
// call rescoreContact() so the two paths can never drift again.

import { supabase } from "@/lib/supabase";
import type { UserPrefs } from "@/lib/user-prefs";
import {
  detectAffiliations,
  computeWarmthScore,
  type ContactMeta,
} from "@/lib/linkedin-import";

interface RescoreResult {
  affiliations: { name: string; boost: number }[];
  score: number;
  tier: "hot" | "warm" | "monitor" | "cold";
}

/**
 * Load a user's manual tags for one contact, oldest first.
 * Lives next to rescoreContact so callers grab tags + rescore from one module.
 */
export async function loadContactTags(
  userEmail: string,
  contactId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("contact_tags")
    .select("tag")
    .eq("user_id", userEmail)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r: { tag: string }) => r.tag);
}

/**
 * Recompute affiliations + warmth from a contact row, the user's prefs, and
 * their manual tags. Pure given its inputs — the caller owns persistence.
 *
 * meta is built from the contact's name/education/location/firmName/title/
 * industry/seniorityLevel PLUS the editable highSchool/clubs/passions columns
 * PLUS the supplied tags, so every relationship signal is in play.
 */
export function rescoreContact(
  contact: Record<string, unknown>,
  prefs: UserPrefs,
  tags: string[],
): RescoreResult {
  const meta: ContactMeta = {
    name: (contact.name as string) || "",
    education: (contact.education as string) || "",
    location: (contact.location as string) || "",
    experience: (contact.firmName as string) || "",
    title: (contact.title as string) || "",
    industry: (contact.industry as string) || "",
    seniorityLevel: (contact.seniorityLevel as string) || "",
    highSchool: (contact.highSchool as string) || "",
    hometown: (contact.hometown as string) || "",
    clubs: (contact.clubs as string) || "",
    passions: (contact.passions as string) || "",
    greekOrg: (contact.greekOrg as string) || "",
    major: (contact.major as string) || "",
    minor: (contact.minor as string) || "",
    skills: (contact.skills as string) || "",
    pastFirms: (contact.pastFirms as string) || "",
    personType: (contact.personType as string) || "",
    university: (contact.university as string) || "",
    track: (contact.track as string) || "",
    role: (contact.role as string) || "",
    tags,
  };

  const affiliations = detectAffiliations(meta, prefs);
  const { score, tier } = computeWarmthScore(affiliations);
  return { affiliations, score, tier };
}
