-- Friend-scoped contact sharing for Kith & Nodes.
-- Mirrors AlumniContact.sharedInNodes (1781740800_kith_nodes): a second, independent
-- share scope so an accepted Friendship — not just Node co-membership — unlocks a
-- contact. Enforced in the app authz layer (src/lib/kith/authz.ts: canUserSeeContact,
-- getFriendSharedContacts); RLS stays deny-all defense-in-depth (service-role path).
-- Default true = chapter-trust default; a user can opt a contact out later.

ALTER TABLE public."AlumniContact"
  ADD COLUMN IF NOT EXISTS "sharedWithFriends" boolean NOT NULL DEFAULT true;
