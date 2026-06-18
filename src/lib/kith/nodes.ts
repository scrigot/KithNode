// Nodes (named groups that pool contacts). Identity = the User UUID; email is a
// display/transport attribute resolved from the User table.

import { supabase } from "@/lib/supabase";
import { genId, genInviteCode } from "@/lib/kith/ids";
import { getUserNames, idsForEmails, emailsForIds } from "@/lib/kith/users";
import {
  assertNodeMember,
  getUserNodeIds,
  getNodeMemberIds,
  getPooledContactsForNode,
} from "@/lib/kith/authz";

export class NodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeError";
  }
}

/** Consent copy shown before a user joins (their contacts become visible). */
export const NODE_JOIN_CONSENT =
  "Heads up: joining this Node makes your contacts (except ones you've marked private) visible to its members, with full detail. You can leave anytime to revoke access.";

export async function createNode(ownerId: string, nameRaw: string) {
  const name = nameRaw.trim();
  if (!name) throw new NodeError("Node name required");

  const id = genId();
  const inviteCode = genInviteCode();
  const { data: node, error } = await supabase
    .from("Node")
    .insert({ id, name, ownerId, inviteCode })
    .select()
    .single();
  if (error) throw new NodeError(error.message);

  const { error: memErr } = await supabase
    .from("NodeMember")
    .insert({ id: genId(), nodeId: id, userId: ownerId, role: "owner" });
  if (memErr) throw new NodeError(memErr.message);

  return node;
}

/** Nodes the user belongs to, with member counts. */
export async function getMyNodes(userId: string) {
  const nodeIds = await getUserNodeIds(userId);
  if (nodeIds.length === 0) return [];

  const [{ data: nodes }, { data: members }] = await Promise.all([
    supabase.from("Node").select("id, name, ownerId, inviteCode, createdAt").in("id", nodeIds),
    supabase.from("NodeMember").select("nodeId").in("nodeId", nodeIds),
  ]);

  const counts = new Map<string, number>();
  for (const m of members ?? []) counts.set(m.nodeId as string, (counts.get(m.nodeId as string) ?? 0) + 1);

  return (nodes ?? []).map((n) => ({
    ...n,
    memberCount: counts.get(n.id as string) ?? 0,
    isOwner: n.ownerId === userId,
  }));
}

export async function joinNodeByCode(userId: string, codeRaw: string) {
  const inviteCode = codeRaw.trim().toUpperCase();
  if (!inviteCode) throw new NodeError("Invite code required");

  const { data: node } = await supabase
    .from("Node")
    .select("id, name, ownerId")
    .eq("inviteCode", inviteCode)
    .maybeSingle();
  if (!node) throw new NodeError("No node with that invite code");

  // Idempotent: unique(nodeId,userId) — ignore if already a member.
  const { error } = await supabase
    .from("NodeMember")
    .upsert({ id: genId(), nodeId: node.id, userId, role: "member" }, { onConflict: "nodeId,userId", ignoreDuplicates: true });
  if (error) throw new NodeError(error.message);

  return node;
}

/** Resolve a node's member rows (userId = uuid) into the display shape the UI
 *  needs: each member carries its REAL email + name (resolved from User), plus
 *  role + joinedAt. Email is required for display and the DM/realtime seam. */
async function namedMembers(nodeId: string) {
  const memberIds = await getNodeMemberIds(nodeId);
  const [names, emails, { data: memberRows }] = await Promise.all([
    getUserNames(memberIds),
    emailsForIds(memberIds),
    supabase.from("NodeMember").select("userId, role, joinedAt").eq("nodeId", nodeId),
  ]);
  return (memberRows ?? []).map((m) => {
    const id = m.userId as string;
    return {
      email: emails.get(id) ?? id,
      name: names.get(id) ?? (emails.get(id) ?? id),
      role: m.role as string,
      joinedAt: m.joinedAt as string,
    };
  });
}

/**
 * Add a user to a node by email (the invite-UI add-member path). The requester
 * must already be a member (assertNodeMember — the trust boundary), and the
 * invitee must be a real KithNode user. The invitee email is resolved to a
 * User.id and stored as NodeMember.userId (uuid). Idempotent via the
 * unique(nodeId,userId) constraint. Returns the refreshed named member list.
 */
export async function addNodeMember(requesterId: string, nodeId: string, inviteeEmailRaw: string) {
  await assertNodeMember(requesterId, nodeId);

  const inviteeEmail = inviteeEmailRaw.trim().toLowerCase();
  if (!inviteeEmail) throw new NodeError("Invitee email required");
  const inviteeId = (await idsForEmails([inviteeEmail])).get(inviteeEmail);
  if (!inviteeId) throw new NodeError("No KithNode user with that email");

  const { error } = await supabase
    .from("NodeMember")
    .upsert(
      { id: genId(), nodeId, userId: inviteeId, role: "member" },
      { onConflict: "nodeId,userId", ignoreDuplicates: true },
    );
  if (error) throw new NodeError(error.message);

  return namedMembers(nodeId);
}

/** Leaving instantly revokes pool visibility (membership is checked live). */
export async function leaveNode(userId: string, nodeId: string) {
  const { error } = await supabase.from("NodeMember").delete().eq("nodeId", nodeId).eq("userId", userId);
  if (error) throw new NodeError(error.message);
}

/** Full node view for a member: node + members (named) + deduped contact pool. */
export async function getNodeDetail(nodeId: string, requesterId: string) {
  await assertNodeMember(requesterId, nodeId);

  const { data: node } = await supabase
    .from("Node")
    .select("id, name, ownerId, inviteCode, createdAt")
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) throw new NodeError("Node not found");

  const [members, pool] = await Promise.all([
    namedMembers(nodeId),
    getPooledContactsForNode(nodeId, requesterId),
  ]);

  return { node, members, pool };
}
