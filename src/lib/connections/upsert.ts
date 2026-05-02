// Shared dedup + Supabase upsert helper for AlumniContact ingestion.
// Extracted from src/app/api/professors/seed/route.ts so all connection
// sources (faculty, news alumni, greek clubs) use identical dedup logic.
//
// Dedup order:
//   1. email + importedByUserId  (most reliable when email is present)
//   2. name + firmName + importedByUserId  (fallback for no-email records)
//
// Throws on Supabase error so callers can catch + increment failed counter.

import { supabase } from "@/lib/supabase";
import type { AlumniSeed } from "./types";

export type UpsertResult = "inserted" | "updated";

export async function upsertAlumniContact(
  seed: AlumniSeed,
  userId: string,
): Promise<UpsertResult> {
  const record = {
    name: seed.name,
    title: seed.title,
    firmName: seed.firmName,
    email: seed.email,
    linkedInUrl: seed.sourceUrl,
    university: seed.university,
    education: "",
    location: seed.location,
    affiliations: seed.affiliations,
    warmthScore: 0.5,
    tier: "warm",
    source: seed.source,
    importedByUserId: userId,
    enrichedAt: new Date().toISOString(),
    enrichmentSource: "connections_scraper",
  };

  // Step 1: dedup by email
  let existingId: string | undefined;
  if (seed.email) {
    const { data, error } = await supabase
      .from("AlumniContact")
      .select("id")
      .eq("email", seed.email)
      .eq("importedByUserId", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    existingId = data?.id;
  }

  // Step 2: dedup by name + firmName
  if (!existingId) {
    const { data, error } = await supabase
      .from("AlumniContact")
      .select("id")
      .eq("name", seed.name)
      .eq("firmName", seed.firmName)
      .eq("importedByUserId", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    existingId = data?.id;
  }

  if (existingId) {
    const { error } = await supabase
      .from("AlumniContact")
      .update(record)
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await supabase
    .from("AlumniContact")
    .insert({ ...record, graduationYear: 0 });
  if (error) throw new Error(error.message);
  return "inserted";
}
