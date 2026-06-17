/**
 * Shared unlock predicate for the shared-pool privacy model.
 *
 * A contact is "unlocked" for a viewer when:
 *   1. The viewer imported the contact themselves (importedByUserId === viewerEmail), OR
 *   2. The viewer has rated the contact as "high_value" in Discover.
 *
 * "skip" ratings stay locked — the viewer dismissed the contact and has no
 * meaningful relationship to act on. Identity (name, LinkedIn URL) must remain
 * redacted in that case.
 */

/** Pure predicate — no I/O. Pass a Set of contactIds the viewer rated high_value. */
export function isUnlocked(
  importedByUserId: string | null | undefined,
  viewerEmail: string,
  highValueContactIds: Set<string>,
  contactId: string,
): boolean {
  if (importedByUserId === viewerEmail) return true;
  return highValueContactIds.has(contactId);
}
