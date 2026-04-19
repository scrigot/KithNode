import { supabase } from "@/lib/supabase";
import { normalizeFirmName } from "@/lib/normalize-firm";

export interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
}

/**
 * Find warm paths to a contact's firm via other users' imported contacts.
 * Queries the shared AlumniContact pool for contacts at the same normalized firm
 * that were imported by a different user.
 */
export async function findWarmPaths(
  userId: string,
  contactFirmName: string,
): Promise<WarmPath[]> {
  if (!contactFirmName) return [];

  const normalizedTarget = normalizeFirmName(contactFirmName);
  if (!normalizedTarget) return [];

  // Fetch contacts imported by the CURRENT user that work at the same firm.
  // These are the user's own connections who can provide a warm intro.
  const { data, error } = await supabase
    .from("AlumniContact")
    .select("name, title, firmName, affiliations, importedByUserId")
    .eq("importedByUserId", userId)
    .limit(500);

  if (error || !data) return [];

  // Filter by normalized firm name match
  const matches = data.filter(
    (c) => normalizeFirmName(c.firmName) === normalizedTarget,
  );

  return matches.map((c) => ({
    intermediaryName: c.name,
    intermediaryRelation: c.affiliations || "Connection",
    firmName: c.firmName,
    title: c.title,
  }));
}
