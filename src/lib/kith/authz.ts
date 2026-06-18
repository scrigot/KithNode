// THE TRUST BOUNDARY for Kith & Nodes.
//
// The app talks to Supabase with the service-role key, which BYPASSES RLS, and
// uses NextAuth (no Supabase Auth → auth.uid()/auth.email() are NULL). So RLS
// cannot enforce per-member sharing at runtime — these helpers do, and every
// read/write path MUST go through them. RLS on the tables is deny-all defense
// in depth only.
//
// User identity = the User UUID everywhere (matches AlumniContact.importedByUserId
// and PipelineEntry.userId). Email is a display/transport attribute only,
// resolved from the User table at the edges that need it.

import { supabase } from "@/lib/supabase";
import { dedupePooled, type PoolContact } from "@/lib/kith/pool";

/** Thrown when a caller tries to touch a Node they're not a member of. */
export class NotNodeMemberError extends Error {
  constructor(message = "Not a member of this node") {
    super(message);
    this.name = "NotNodeMemberError";
  }
}

/** Defense-in-depth: identity columns hold User UUIDs after the email→uuid
 *  backfill. An email-shaped id reaching the trust boundary means an un-migrated
 *  row slipped through — log loudly (a leftover email could silently widen
 *  visibility if it ever collided with a contact's importedByUserId) rather than
 *  failing silently. Returns the ids unchanged. */
function flagEmailIds(ids: string[], where: string): string[] {
  if (ids.some((id) => id.includes("@"))) {
    console.error(`[kith] email-shaped identity in ${where} — email→uuid backfill incomplete`);
  }
  return ids;
}

/** Accepted (mutual) friends of a user — user ids. Two parameterized queries, no
 *  .or() string interpolation (avoids the PostgREST filter-injection vector). */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const [outgoing, incoming] = await Promise.all([
    supabase.from("Friendship").select("addresseeId").eq("requesterId", userId).eq("status", "accepted"),
    supabase.from("Friendship").select("requesterId").eq("addresseeId", userId).eq("status", "accepted"),
  ]);
  const ids = [
    ...(outgoing.data?.map((r) => r.addresseeId as string) ?? []),
    ...(incoming.data?.map((r) => r.requesterId as string) ?? []),
  ];
  return flagEmailIds([...new Set(ids)], "getAcceptedFriendIds");
}

/** Node ids the user belongs to. */
export async function getUserNodeIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("NodeMember").select("nodeId").eq("userId", userId);
  return data?.map((r) => r.nodeId as string) ?? [];
}

export async function isNodeMember(userId: string, nodeId: string): Promise<boolean> {
  const { data } = await supabase
    .from("NodeMember")
    .select("id")
    .eq("nodeId", nodeId)
    .eq("userId", userId)
    .maybeSingle();
  return !!data;
}

/** Gate used by every node route. Throws NotNodeMemberError if not a member. */
export async function assertNodeMember(userId: string, nodeId: string): Promise<void> {
  if (!(await isNodeMember(userId, nodeId))) throw new NotNodeMemberError();
}

/** Member ids of a node (caller should assertNodeMember first). */
export async function getNodeMemberIds(nodeId: string): Promise<string[]> {
  const { data } = await supabase.from("NodeMember").select("userId").eq("nodeId", nodeId);
  return flagEmailIds(data?.map((r) => r.userId as string) ?? [], "getNodeMemberIds");
}

/** Everyone who shares at least one node with the user (excludes self). */
export async function getCoMemberIds(userId: string): Promise<string[]> {
  const nodeIds = await getUserNodeIds(userId);
  if (nodeIds.length === 0) return [];
  const { data } = await supabase.from("NodeMember").select("userId").in("nodeId", nodeIds);
  return flagEmailIds(
    [...new Set((data?.map((r) => r.userId as string) ?? []).filter((id) => id !== userId))],
    "getCoMemberIds",
  );
}

const POOL_COLUMNS =
  "id, name, firmName, title, linkedInUrl, education, location, warmthScore, tier, affiliations, graduationYear, degrees, concentration, hometown, enrichedAt, importedByUserId, sharedInNodes";

/** The pooled, deduped contact view for a node. NON-MEMBER → throws (never
 *  returns rows). sharedInNodes=false contacts are excluded. Each row carries
 *  the owner id + name for the "via {friend}" warm path. */
export async function getPooledContactsForNode(
  nodeId: string,
  requesterId: string,
): Promise<PoolContact[]> {
  await assertNodeMember(requesterId, nodeId);

  const memberIds = await getNodeMemberIds(nodeId);
  if (memberIds.length === 0) return [];

  const [{ data: contacts }, { data: users }] = await Promise.all([
    supabase
      .from("AlumniContact")
      .select(POOL_COLUMNS)
      .in("importedByUserId", memberIds)
      .eq("sharedInNodes", true),
    supabase.from("User").select("id, email, name").in("id", memberIds),
  ]);

  const nameById = new Map((users ?? []).map((u) => [u.id as string, (u.name as string) || (u.email as string)]));
  const emailById = new Map((users ?? []).map((u) => [u.id as string, u.email as string]));

  const rows: PoolContact[] = (contacts ?? []).map((c) => {
    const ownerId = c.importedByUserId as string;
    return {
      ...(c as Omit<PoolContact, "ownerId" | "ownerName">),
      ownerId,
      ownerName: nameById.get(ownerId) ?? emailById.get(ownerId) ?? ownerId,
    };
  });

  return dedupePooled(rows);
}

/** Friend-shared pooled contacts: contacts owned by the user's accepted friends
 *  with sharedWithFriends=true. Deduped, each row tagged with the owner id +
 *  name for the "via {friend}" warm path. Parallels getPooledContactsForNode. */
export async function getFriendSharedContacts(userId: string): Promise<PoolContact[]> {
  const friendIds = await getAcceptedFriendIds(userId);
  if (friendIds.length === 0) return [];

  const [{ data: contacts }, { data: users }] = await Promise.all([
    supabase
      .from("AlumniContact")
      .select(POOL_COLUMNS)
      .in("importedByUserId", friendIds)
      .eq("sharedWithFriends", true),
    supabase.from("User").select("id, email, name").in("id", friendIds),
  ]);

  const nameById = new Map((users ?? []).map((u) => [u.id as string, (u.name as string) || (u.email as string)]));
  const emailById = new Map((users ?? []).map((u) => [u.id as string, u.email as string]));

  const rows: PoolContact[] = (contacts ?? []).map((c) => {
    const ownerId = c.importedByUserId as string;
    return {
      ...(c as Omit<PoolContact, "ownerId" | "ownerName">),
      ownerId,
      ownerName: nameById.get(ownerId) ?? emailById.get(ownerId) ?? ownerId,
    };
  });

  return dedupePooled(rows);
}

/** Can this user see this contact? Owner, or — independently — an accepted
 *  friend's friend-shared contact OR a node co-member's node-shared contact. */
export async function canUserSeeContact(userId: string, contactId: string): Promise<boolean> {
  const { data: contact } = await supabase
    .from("AlumniContact")
    .select("importedByUserId, sharedInNodes, sharedWithFriends")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return false;
  const ownerId = contact.importedByUserId as string;
  if (ownerId === userId) return true;

  // Friend-shared: owner is an accepted friend and the contact is friend-shared.
  if (contact.sharedWithFriends) {
    const friends = await getAcceptedFriendIds(userId);
    if (friends.includes(ownerId)) return true;
  }

  // Node-shared: owner is a co-member and the contact is node-shared.
  if (contact.sharedInNodes) {
    const coMembers = await getCoMemberIds(userId);
    if (coMembers.includes(ownerId)) return true;
  }

  return false;
}
