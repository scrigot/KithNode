import { supabase } from "@/lib/supabase";

/** Map member emails → display name (falls back to the email). */
export async function getUserNames(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();
  const { data } = await supabase.from("User").select("email, name").in("email", emails);
  return new Map((data ?? []).map((u) => [u.email as string, (u.name as string) || (u.email as string)]));
}

/** Does a User row exist for this email? (Friend requests target real users.) */
export async function userExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("User").select("email").eq("email", email).maybeSingle();
  return !!data;
}

export interface UserProfile {
  email: string;
  name: string;
  image: string;
}

/** email → {name, image} for avatar-bearing lists (friends, search). */
export async function getUserProfiles(emails: string[]): Promise<Map<string, UserProfile>> {
  if (emails.length === 0) return new Map();
  const { data } = await supabase.from("User").select("email, name, image").in("email", emails);
  return new Map(
    (data ?? []).map((u) => [
      u.email as string,
      { email: u.email as string, name: (u.name as string) || (u.email as string), image: (u.image as string) || "" },
    ]),
  );
}

/** Typeahead: match users by name or email, excluding self. Sanitizes the term
 *  so it can't break out of the PostgREST ilike filter. */
export async function searchUsers(query: string, excludeEmail: string): Promise<UserProfile[]> {
  const q = query.replace(/[%,()*\\]/g, "").trim();
  if (q.length < 2) return [];
  const { data } = await supabase
    .from("User")
    .select("email, name, image")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(8);
  return (data ?? [])
    .filter((u) => u.email !== excludeEmail)
    .map((u) => ({ email: u.email as string, name: (u.name as string) || (u.email as string), image: (u.image as string) || "" }));
}
