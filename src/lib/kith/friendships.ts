// Kith (friends). Mutual = a Friendship row with status 'accepted'.
// Identity = email. All access via the service-role client.

import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/kith/ids";
import { getUserProfiles, userExists } from "@/lib/kith/users";

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

/** Send (or auto-accept a reciprocal) friend request. Idempotent. */
export async function sendFriendRequest(requesterId: string, addresseeEmailRaw: string) {
  const addresseeId = addresseeEmailRaw.trim().toLowerCase();
  if (!addresseeId) throw new FriendRequestError("Email required");
  if (addresseeId === requesterId.toLowerCase()) throw new FriendRequestError("You can't friend yourself");
  if (!(await userExists(addresseeId))) throw new FriendRequestError("No KithNode user with that email");

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
    .insert({ id: genId(), requesterId, addresseeId, status: "pending" })
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

/** Lists for the Friends page: accepted, incoming pending, outgoing pending. */
export async function listFriends(userId: string) {
  const [asReq, asAddr] = await Promise.all([
    supabase.from("Friendship").select("*").eq("requesterId", userId),
    supabase.from("Friendship").select("*").eq("addresseeId", userId),
  ]);
  const rows = [...((asReq.data as FriendshipRow[]) ?? []), ...((asAddr.data as FriendshipRow[]) ?? [])];

  const otherEmails = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  const profiles = await getUserProfiles(otherEmails);
  const label = (email: string) => profiles.get(email) ?? { email, name: email, image: "" };

  return {
    friends: rows.filter((r) => r.status === "accepted").map((r) => label(r.requesterId === userId ? r.addresseeId : r.requesterId)),
    incoming: rows.filter((r) => r.status === "pending" && r.addresseeId === userId).map((r) => label(r.requesterId)),
    outgoing: rows.filter((r) => r.status === "pending" && r.requesterId === userId).map((r) => label(r.addresseeId)),
  };
}
