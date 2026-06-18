// Kith (friends). Mutual = a Friendship row with status 'accepted'.
// Identity = the User UUID; email is a display/transport attribute resolved from
// the User table. All access via the service-role client.

import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/kith/ids";
import { getUserProfiles, getUserNames, idsForEmails } from "@/lib/kith/users";
import { getAcceptedFriendIds, getUserNodeIds } from "@/lib/kith/authz";

/** How a Friendship row was created, relative to the schema's `source` column. */
type FriendshipSource = "direct" | "invite" | "suggestion";

export class FriendRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendRequestError";
  }
}

interface FriendshipRow {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  source: string;
  createdAt: string;
  respondedAt: string | null;
}

async function findBetween(a: string, b: string): Promise<FriendshipRow | null> {
  const [r1, r2] = await Promise.all([
    supabase.from("Friendship").select("*").eq("requesterId", a).eq("addresseeId", b).maybeSingle(),
    supabase.from("Friendship").select("*").eq("requesterId", b).eq("addresseeId", a).maybeSingle(),
  ]);
  return (r1.data as FriendshipRow | null) ?? (r2.data as FriendshipRow | null) ?? null;
}

/**
 * Create an already-accepted Friendship between two users (identified by email,
 * resolved to User ids). Idempotent:
 * - If no row exists, inserts with status='accepted'.
 * - If a row exists in any status, leaves it as-is (never downgrades accepted/blocked).
 * Used by the invite-link auto-friend path in the signIn callback. Best-effort:
 * if either user doesn't exist yet, skips gracefully.
 */
export async function createKithFriendship(inviterEmail: string, newUserEmail: string) {
  const inviter = inviterEmail.trim().toLowerCase();
  const newUser = newUserEmail.trim().toLowerCase();
  if (inviter === newUser) return;

  const ids = await idsForEmails([inviter, newUser]);
  const requesterId = ids.get(inviter);
  const addresseeId = ids.get(newUser);
  if (!requesterId || !addresseeId) return; // best-effort: skip if either user is missing

  const existing = await findBetween(requesterId, addresseeId);
  if (existing) return; // already any-status — don't touch it

  const { error } = await supabase
    .from("Friendship")
    .insert({ id: genId(), requesterId, addresseeId, status: "accepted", source: "invite", respondedAt: new Date().toISOString() });
  if (error && error.code !== "23505") {
    // 23505 = unique violation (race); treat as success
    throw new FriendRequestError(error.message);
  }
}

/** Send (or auto-accept a reciprocal) friend request. Idempotent. `source`
 *  records how the request originated ('direct' search vs a chapter 'suggestion'). */
export async function sendFriendRequest(
  requesterId: string,
  addresseeEmailRaw: string,
  source: FriendshipSource = "direct",
) {
  const addresseeEmail = addresseeEmailRaw.trim().toLowerCase();
  if (!addresseeEmail) throw new FriendRequestError("Email required");
  const addresseeId = (await idsForEmails([addresseeEmail])).get(addresseeEmail);
  if (!addresseeId) throw new FriendRequestError("No KithNode user with that email");
  if (addresseeId === requesterId) throw new FriendRequestError("You can't friend yourself");

  const existing = await findBetween(requesterId, addresseeId);
  if (existing) {
    // They already requested you → accept it. Otherwise return as-is (idempotent).
    if (existing.status === "pending" && existing.addresseeId === requesterId) {
      const { data } = await supabase
        .from("Friendship")
        .update({ status: "accepted", respondedAt: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      return data;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from("Friendship")
    .insert({ id: genId(), requesterId, addresseeId, status: "pending", source })
    .select()
    .single();
  if (error) throw new FriendRequestError(error.message);
  return data;
}

/** Accept or block a pending incoming request (addressee = userId). */
export async function respondToRequest(userId: string, requesterId: string, action: "accept" | "block") {
  const status = action === "accept" ? "accepted" : "blocked";
  const { data, error } = await supabase
    .from("Friendship")
    .update({ status, respondedAt: new Date().toISOString() })
    .eq("requesterId", requesterId)
    .eq("addresseeId", userId)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (error) throw new FriendRequestError(error.message);
  if (!data) throw new FriendRequestError("No pending request from that user");
  return data;
}

/** Connection provenance for one accepted friend, relative to `userId`. */
export interface FriendProvenance {
  howConnected: string; // e.g. "Invited by you", "Chapter suggestion"
  referredIn: string | null; // e.g. "Joined via Jane Doe" if they arrived via someone's invite
  mutuals: { sharedNodes: string[]; mutualFriends: number };
}

interface FriendPerson {
  id: string;
  email: string;
  name: string;
  image: string;
  provenance: FriendProvenance;
}

/** Map an accepted Friendship row to the "how you connected" label, from `userId`'s POV. */
function howConnected(row: FriendshipRow, userId: string): string {
  const youRequested = row.requesterId === userId;
  switch (row.source) {
    case "invite":
      return youRequested ? "Invited by you" : "You joined via them";
    case "suggestion":
      return "Chapter suggestion";
    default: // 'direct'
      return youRequested ? "You added them" : "They added you";
  }
}

/**
 * Connection provenance for the user's accepted friends. Batched: fetches the
 * user's nodes + friends once, then resolves referrals, shared nodes, and mutual
 * friends across all friends in a fixed number of queries (no per-friend N+1).
 */
export async function friendContext(userId: string): Promise<Map<string, FriendProvenance>> {
  // Accepted Friendship rows involving the user (both directions) → the friend set + how-connected.
  const [asReq, asAddr] = await Promise.all([
    supabase.from("Friendship").select("*").eq("requesterId", userId).eq("status", "accepted"),
    supabase.from("Friendship").select("*").eq("addresseeId", userId).eq("status", "accepted"),
  ]);
  const acceptedRows = [...((asReq.data as FriendshipRow[]) ?? []), ...((asAddr.data as FriendshipRow[]) ?? [])];
  const friendIds = acceptedRows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  if (friendIds.length === 0) return new Map();

  const [myNodeIds, myFriendIds, referralRows, friendNodeRows, theirFriendRows] = await Promise.all([
    getUserNodeIds(userId),
    getAcceptedFriendIds(userId),
    // referredIn: an invite-source accepted row where the friend is the addressee → the requester referred them in.
    supabase
      .from("Friendship")
      .select("requesterId, addresseeId")
      .in("addresseeId", friendIds)
      .eq("source", "invite")
      .eq("status", "accepted"),
    // shared nodes: NodeMember rows for friends — intersect with my nodes in memory.
    supabase.from("NodeMember").select("nodeId, userId").in("userId", friendIds),
    // mutual friends: accepted Friendship rows where a friend is on either side.
    Promise.all([
      supabase.from("Friendship").select("requesterId, addresseeId").in("requesterId", friendIds).eq("status", "accepted"),
      supabase.from("Friendship").select("requesterId, addresseeId").in("addresseeId", friendIds).eq("status", "accepted"),
    ]),
  ]);

  // Node names for my nodes (the only nodes that can be "shared").
  const myNodeSet = new Set(myNodeIds);
  const { data: nodeRows } = myNodeIds.length
    ? await supabase.from("Node").select("id, name").in("id", myNodeIds)
    : { data: [] as { id: string; name: string }[] };
  const nodeName = new Map((nodeRows ?? []).map((n) => [n.id as string, n.name as string]));

  // referrerName per friend (resolve requester display names in one batch).
  const referrerByFriend = new Map<string, string>();
  for (const r of (referralRows.data ?? []) as { requesterId: string; addresseeId: string }[]) {
    if (!referrerByFriend.has(r.addresseeId)) referrerByFriend.set(r.addresseeId, r.requesterId);
  }
  const referrerNames = await getUserNames([...new Set(referrerByFriend.values())]);

  // sharedNodes per friend = intersection of their node memberships with mine.
  const sharedNodesByFriend = new Map<string, string[]>();
  for (const m of (friendNodeRows.data ?? []) as { nodeId: string; userId: string }[]) {
    if (!myNodeSet.has(m.nodeId)) continue;
    const arr = sharedNodesByFriend.get(m.userId) ?? [];
    arr.push(nodeName.get(m.nodeId) ?? m.nodeId);
    sharedNodesByFriend.set(m.userId, arr);
  }

  // friendsOf: id → set of that friend's accepted-friend ids (for mutual-count).
  const [theirAsReq, theirAsAddr] = theirFriendRows;
  const friendsOf = new Map<string, Set<string>>();
  const addFriendOf = (owner: string, other: string) => {
    const s = friendsOf.get(owner) ?? new Set<string>();
    s.add(other);
    friendsOf.set(owner, s);
  };
  for (const r of (theirAsReq.data ?? []) as { requesterId: string; addresseeId: string }[]) addFriendOf(r.requesterId, r.addresseeId);
  for (const r of (theirAsAddr.data ?? []) as { requesterId: string; addresseeId: string }[]) addFriendOf(r.addresseeId, r.requesterId);
  const mySet = new Set(myFriendIds);

  const out = new Map<string, FriendProvenance>();
  for (const row of acceptedRows) {
    const friendId = row.requesterId === userId ? row.addresseeId : row.requesterId;
    const referrer = referrerByFriend.get(friendId);
    const theirFriends = friendsOf.get(friendId) ?? new Set<string>();
    let mutualFriends = 0;
    for (const f of theirFriends) if (f !== userId && mySet.has(f)) mutualFriends++;
    out.set(friendId, {
      howConnected: howConnected(row, userId),
      referredIn: referrer ? `Joined via ${referrerNames.get(referrer) ?? referrer}` : null,
      mutuals: { sharedNodes: sharedNodesByFriend.get(friendId) ?? [], mutualFriends },
    });
  }
  return out;
}

/** Lists for the Friends page: accepted (with provenance), incoming, outgoing. */
export async function listFriends(userId: string) {
  const [asReq, asAddr] = await Promise.all([
    supabase.from("Friendship").select("*").eq("requesterId", userId),
    supabase.from("Friendship").select("*").eq("addresseeId", userId),
  ]);
  const rows = [...((asReq.data as FriendshipRow[]) ?? []), ...((asAddr.data as FriendshipRow[]) ?? [])];

  // Identity is the User UUID; resolve each other-party id to a display profile
  // (which carries the real id + email). incoming items expose the requester's
  // id so the client can respond with it.
  const otherIds = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  const [profiles, context] = await Promise.all([getUserProfiles(otherIds), friendContext(userId)]);
  const label = (id: string) => profiles.get(id) ?? { id, email: id, name: id, image: "" };
  const fallbackProvenance: FriendProvenance = {
    howConnected: "",
    referredIn: null,
    mutuals: { sharedNodes: [], mutualFriends: 0 },
  };
  const friendPerson = (id: string): FriendPerson => ({ ...label(id), provenance: context.get(id) ?? fallbackProvenance });

  return {
    friends: rows
      .filter((r) => r.status === "accepted")
      .map((r) => friendPerson(r.requesterId === userId ? r.addresseeId : r.requesterId)),
    incoming: rows.filter((r) => r.status === "pending" && r.addresseeId === userId).map((r) => label(r.requesterId)),
    outgoing: rows.filter((r) => r.status === "pending" && r.requesterId === userId).map((r) => label(r.addresseeId)),
  };
}
