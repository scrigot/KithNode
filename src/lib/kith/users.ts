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
