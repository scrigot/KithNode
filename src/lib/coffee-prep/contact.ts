import "server-only";
import { supabase } from "@/lib/supabase";
import { applyOverlay } from "@/lib/contact-overrides";

export async function accessibleCoffeePrepContact(userId: string, contactId: string) {
  const { data: contact, error } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  if (error || !contact) return null;

  const owned = !contact.importedByUserId || contact.importedByUserId === userId;
  if (owned) return { contact, owned: true };

  const { data: discovery } = await supabase
    .from("UserDiscover")
    .select("rating")
    .eq("userId", userId)
    .eq("contactId", contactId)
    .maybeSingle();
  if (discovery?.rating !== "high_value") return null;

  const { data: overlay } = await supabase
    .from("contact_override")
    .select("overrides")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .maybeSingle();
  return {
    contact: applyOverlay(contact, (overlay?.overrides as Record<string, unknown>) || {}),
    owned: false,
  };
}
