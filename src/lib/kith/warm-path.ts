// Warm-path-through-a-friend: when a pooled contact is owned by member M,
// the path is "you → M → contact", and a 1-click intro creates an
// intro_requests row (intermediary = M) — reusing the existing intro table.

import { supabase } from "@/lib/supabase";
import { canUserSeeContact } from "@/lib/kith/authz";
import { getUserNames, emailsForIds } from "@/lib/kith/users";

export class WarmPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarmPathError";
  }
}

/** Human label for the path, e.g. "you → Grayson → contact". */
export function warmPathLabel(ownerName: string): string {
  return `you → ${ownerName} → contact`;
}

/**
 * Create an intro request through the contact's owner. Authorized: the viewer
 * must be able to see the contact (co-member + shared), and cannot intro to
 * their own contact. Returns the new intro_requests row.
 */
export async function createIntroFromPool(viewerId: string, contactId: string, message: string) {
  if (!(await canUserSeeContact(viewerId, contactId))) {
    throw new WarmPathError("You don't have access to this contact");
  }

  const { data: contact } = await supabase
    .from("AlumniContact")
    .select("id, importedByUserId")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) throw new WarmPathError("Contact not found");

  const ownerId = contact.importedByUserId as string;
  if (ownerId === viewerId) throw new WarmPathError("This is already your contact — no intro needed");

  const [names, emails] = await Promise.all([getUserNames([ownerId]), emailsForIds([ownerId])]);
  const ownerName = names.get(ownerId) ?? ownerId;
  const ownerEmail = emails.get(ownerId) ?? ownerId;

  const { data, error } = await supabase
    .from("intro_requests")
    .insert({
      from_user_id: viewerId,
      intermediary_name: ownerName,
      intermediary_email: ownerEmail, // display/transport: the owner's email
      target_contact_id: contactId,
      message,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new WarmPathError(error.message);
  return data;
}
