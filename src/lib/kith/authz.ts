// THE TRUST BOUNDARY for Kith & Nodes.
//
// The app talks to Supabase with the service-role key, which BYPASSES RLS, and
// uses NextAuth (no Supabase Auth → auth.uid()/auth.email() are NULL). So RLS
// cannot enforce per-member sharing at runtime — these helpers do, and every
// read/write path MUST go through them. RLS on the tables is deny-all defense
// in depth only.
//
// User identity = email everywhere (matches AlumniContact.importedByUserId).

import { supabase } from "@/lib/supabase";
import { dedupePooled, type PoolContact } from "@/lib/kith/pool";

/** Thrown when a caller tries to touch a Node they're not a member of. */
export class NotNodeMemberError extends Error {
  constructor(message = "Not a member of this node") {
    super(message);
    this.name = "NotNodeMemberError";
  }
}

/** Accepted (mutual) friends of a user — emails. Two parameterized queries, no
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
  return [...new Set(ids)];
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

/** Member emails of a node (caller should assertNodeMember first). */
export async function getNodeMemberIds(nodeId: string): Promise<string[]> {
  const { data } = await supabase.from("NodeMember").select("userId").eq("nodeId", nodeId);
  return data?.map((r) => r.userId as string) ?? [];
}

/** Everyone who shares at least one node with the user (excludes self). */
export async function getCoMemberIds(userId: string): Promise<string[]> {
  const nodeIds = await getUserNodeIds(userId);
  if (nodeIds.length === 0) return [];
  const { data } = await supabase.from("NodeMember").select("userId").in("nodeId", nodeIds);
  return [...new Set((data?.map((r) => r.userId as string) ?? []).filter((id) => id !== userId))];
}

const POOL_COLUMNS =
  "id, name, firmName, title, linkedInUrl, education, location, warmthScore, tier, affiliations, graduationYear, degrees, concentration, hometown, enrichedAt, importedByUserId, sharedInNodes";

/** The pooled, deduped contact view for a node. NON-MEMBER → throws (never
 *  returns rows). sharedInNodes=false contacts are excluded. Each row carries
 *  the owner email + name for the "via {friend}" warm path. */
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
    supabase.from("User").select("email, name").in("email", memberIds),
  ]);

  const nameByEmail = new Map((users ?? []).map((u) => [u.email as string, (u.name as string) || (u.email as string)]));

  const rows: PoolContact[] = (contacts ?? []).map((c) => ({
    ...(c as Omit<PoolContact, "ownerId" | "ownerName">),
    ownerId: c.importedByUserId as string,
    ownerName: nameByEmail.get(c.importedByUserId as string) ?? (c.importedByUserId as string),
  }));

  return dedupePooled(rows);
}

/** Can this user see this contact? Owner, or a co-member's shared contact. */
export async function canUserSeeContact(userId: string, contactId: string): Promise<boolean> {
  const { data: contact } = await supabase
    .from("AlumniContact")
    .select("importedByUserId, sharedInNodes")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return false;
  if (contact.importedByUserId === userId) return true;
  if (!contact.sharedInNodes) return false;
  const coMembers = await getCoMemberIds(userId);
  return coMembers.includes(contact.importedByUserId as string);
}
