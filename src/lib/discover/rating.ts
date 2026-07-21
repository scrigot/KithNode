import "server-only";
import { supabase } from "@/lib/supabase";

export const CONTACT_RATINGS = ["high_value", "skip", "later", "not_interested"] as const;
export type ContactRating = (typeof CONTACT_RATINGS)[number];

export function isContactRating(value: unknown): value is ContactRating {
  return typeof value === "string" && CONTACT_RATINGS.includes(value as ContactRating);
}

export async function saveContactRating(userId: string, contactId: string, rating: ContactRating) {
  const { error } = await supabase
    .from("UserDiscover")
    .upsert({ userId, contactId, rating }, { onConflict: "userId,contactId" });
  if (error) throw new Error(`rating_write_failed:${error.code || "unknown"}`);

  const { data, error: countError } = await supabase
    .from("UserDiscover")
    .select("rating")
    .eq("userId", userId);
  if (countError) throw new Error(`rating_count_failed:${countError.code || "unknown"}`);
  const rows = data ?? [];
  return {
    contact_id: contactId,
    rating,
    total_ratings: rows.length,
    learning_active: rows.length >= 10,
    message: "Rating saved",
  };
}
