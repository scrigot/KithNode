// Member profile/contact card — the read side of "click a member, see their card".
//
// Visibility is gated through the same trust boundary as the pool: a viewer sees
// another member's FULL professional card only if they're accepted friends OR
// share a node; otherwise just name + photo. Self is always full.
//
// The card NEVER carries personal fields — hometown, highSchool, email, or any
// targets/goals (targetIndustries/Firms/Locations, onboardingGoal/Pain/Timeline,
// recruitingDate, draft*/notification settings). buildCard physically cannot emit
// them: it spreads only the explicit public allowlist below.

import { supabase } from "@/lib/supabase";
import { getAcceptedFriendIds, getCoMemberIds } from "@/lib/kith/authz";
import { idsForEmails } from "@/lib/kith/users";
import { getUserPrefs, type UserPrefs, type EducationEntry, type ExperienceEntry, type ClubEntry } from "@/lib/user-prefs";

/** The public, professional-only card. visible=false ⇒ only name+image+visible. */
export interface MemberCard {
  name: string;
  image: string;
  visible: boolean;
  university?: string;
  graduationYear?: number | null;
  degrees?: string;
  major?: string;
  concentration?: string;
  educations?: EducationEntry[];
  experiences?: ExperienceEntry[];
  clubMemberships?: ClubEntry[];
  skills?: string[];
}

/** Can the viewer see this member's full card? Self always; else accepted friend
 *  OR node co-member (independent checks, same boundary the pool uses). */
export async function canSeeCard(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;
  const [f, c] = await Promise.all([getAcceptedFriendIds(viewerId), getCoMemberIds(viewerId)]);
  return f.includes(targetId) || c.includes(targetId);
}

/** Pure card builder. Returns {name, image, visible} always; when visible, spreads
 *  ONLY the public professional fields from prefs. By construction it cannot emit
 *  hometown/highSchool/email/targets/goals — those keys are never referenced. */
export function buildCard(
  name: string,
  image: string,
  prefs: UserPrefs,
  visible: boolean,
): MemberCard {
  if (!visible) return { name, image, visible: false };
  return {
    name,
    image,
    visible: true,
    university: prefs.university,
    graduationYear: prefs.graduationYear ?? null,
    degrees: prefs.degrees,
    major: prefs.major,
    concentration: prefs.concentration,
    educations: prefs.educations,
    experiences: prefs.experiences,
    clubMemberships: prefs.clubMemberships,
    skills: prefs.skills,
  };
}

/** Resolve a target by email → their gated card, or null if no such user. */
export async function getUserCard(viewerId: string, targetEmail: string): Promise<MemberCard | null> {
  const email = targetEmail.trim().toLowerCase();
  const targetId = (await idsForEmails([email])).get(email);
  if (!targetId) return null;

  const [{ data: user }, prefs, visible] = await Promise.all([
    supabase.from("User").select("name, image").eq("id", targetId).maybeSingle(),
    getUserPrefs(email),
    canSeeCard(viewerId, targetId),
  ]);

  const name = (user?.name as string) || email;
  const image = (user?.image as string) || "";
  return buildCard(name, image, prefs, visible);
}
