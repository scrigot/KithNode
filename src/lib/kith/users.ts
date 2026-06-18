import { supabase } from "@/lib/supabase";

/** Split a mixed key list into uuid-shaped ids and email-shaped values, so each
 *  goes to the column whose type it can match (an email in an `id.in.(…)` clause
 *  fails Postgres' uuid cast — keep the two filters separate). */
function splitKeys(keys: string[]): { ids: string[]; emails: string[] } {
  const ids: string[] = [];
  const emails: string[] = [];
  for (const k of keys) (k.includes("@") ? emails : ids).push(k);
  return { ids, emails };
}

/** Map member keys (id OR email) → display name (falls back to the email/key).
 *  Resolves against User by both id and email and returns BOTH id→name and
 *  email→name entries, so callers can pass either identity shape (node members
 *  are uuid; message senderIds stay email). */
export async function getUserNames(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const { ids, emails } = splitKeys(keys);
  const [byId, byEmail] = await Promise.all([
    ids.length ? supabase.from("User").select("id, email, name").in("id", ids) : Promise.resolve({ data: [] }),
    emails.length ? supabase.from("User").select("id, email, name").in("email", emails) : Promise.resolve({ data: [] }),
  ]);
  const map = new Map<string, string>();
  for (const u of [...(byId.data ?? []), ...(byEmail.data ?? [])]) {
    const name = (u.name as string) || (u.email as string);
    map.set(u.id as string, name);
    map.set(u.email as string, name);
  }
  return map;
}

/** Does a User row exist for this email? (Friend requests target real users.) */
export async function userExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("User").select("email").eq("email", email).maybeSingle();
  return !!data;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image: string;
}

/** key (id OR email) → {id, email, name, image} for avatar-bearing lists
 *  (friends, search). Keyed by BOTH id and email. */
export async function getUserProfiles(keys: string[]): Promise<Map<string, UserProfile>> {
  if (keys.length === 0) return new Map();
  const { ids, emails } = splitKeys(keys);
  const [byId, byEmail] = await Promise.all([
    ids.length ? supabase.from("User").select("id, email, name, image").in("id", ids) : Promise.resolve({ data: [] }),
    emails.length ? supabase.from("User").select("id, email, name, image").in("email", emails) : Promise.resolve({ data: [] }),
  ]);
  const map = new Map<string, UserProfile>();
  for (const u of [...(byId.data ?? []), ...(byEmail.data ?? [])]) {
    const profile: UserProfile = {
      id: u.id as string,
      email: u.email as string,
      name: (u.name as string) || (u.email as string),
      image: (u.image as string) || "",
    };
    map.set(u.id as string, profile);
    map.set(u.email as string, profile);
  }
  return map;
}

/** Typeahead: match users by name or email, excluding self (by id). Sanitizes
 *  the term so it can't break out of the PostgREST ilike filter. */
export async function searchUsers(query: string, excludeId: string): Promise<UserProfile[]> {
  const q = query.replace(/[%,()*\\]/g, "").trim();
  if (q.length < 2) return [];
  const { data } = await supabase
    .from("User")
    .select("id, email, name, image")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(8);
  return (data ?? [])
    .filter((u) => u.id !== excludeId)
    .map((u) => ({
      id: u.id as string,
      email: u.email as string,
      name: (u.name as string) || (u.email as string),
      image: (u.image as string) || "",
    }));
}

/** email → User.id, for the messaging seam and add-member-by-email. */
export async function idsForEmails(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();
  const { data } = await supabase.from("User").select("id, email").in("email", emails);
  return new Map((data ?? []).map((u) => [u.email as string, u.id as string]));
}

/** User.id → email, for the messaging seam (uuid identity ↔ email transport). */
export async function emailsForIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("User").select("id, email").in("id", ids);
  return new Map((data ?? []).map((u) => [u.id as string, u.email as string]));
}
