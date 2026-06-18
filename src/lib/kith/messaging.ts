// In-app messaging: user DMs + Node group chat. Identity = the User UUID; the
// uuid↔email seam lives here. DM thread keys ('emailA|emailB') and realtime
// topics ('kith:user:{email}') STAY email-encoded — we resolve uuid↔email at
// those edges. Message.senderId stays homogeneous email.
//
// THE TRUST BOUNDARY (mirrors authz.ts): the app uses the service-role key
// (bypasses RLS) under NextAuth (auth.email() is NULL), so RLS cannot enforce
// who may read/write a thread. Every read/write below MUST pass canAccessThread.
//
// Delivery: clients subscribe ONLY to their own private Realtime topic
// 'kith:user:{email}'. The server, after persisting a message, broadcasts it to
// each recipient's topic. A client never subscribes to a thread directly, so the
// broadcast fan-out (below) is the only thing that decides who receives a message
// — it must exactly match the thread's authorized participants.

import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/kith/ids";
import { getAcceptedFriendIds, getCoMemberIds, getNodeMemberIds, isNodeMember } from "@/lib/kith/authz";
import { getUserNames, idsForEmails, emailsForIds } from "@/lib/kith/users";

export class MessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageError";
  }
}

/** Thrown when a caller tries to read/write a thread they're not part of. */
export class NotThreadParticipantError extends Error {
  constructor(message = "Not a participant in this thread") {
    super(message);
    this.name = "NotThreadParticipantError";
  }
}

const MAX_BODY = 4000;
const HISTORY_CAP = 200;

export type ThreadType = "dm" | "node";

export interface MessageRow {
  id: string;
  threadType: ThreadType;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

/**
 * Deterministic DM thread key for a pair of emails: lowercased, sorted, joined
 * with '|'. Sorting makes it symmetric (dmThreadId(a,b) === dmThreadId(b,a)) so
 * both participants resolve to the same thread regardless of who opens it.
 */
export function dmThreadId(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("|");
}

/** The two emails of a DM thread id, or null if it isn't a valid pair key. */
function dmPair(threadId: string): [string, string] | null {
  const parts = threadId.split("|");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

/**
 * May `userId` DM `otherId` (both User UUIDs)? DM scope = accepted friends OR
 * node co-members. (Two independent reasons; either grants access.)
 */
export async function canDM(userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return false;
  const [friends, coMembers] = await Promise.all([getAcceptedFriendIds(userId), getCoMemberIds(userId)]);
  return friends.includes(otherId) || coMembers.includes(otherId);
}

/**
 * The gate for every thread read/write (userId = the caller's User UUID). node →
 * must be a member; dm → must be one of the pair AND still allowed to DM the
 * other party (membership/friendship can be revoked, so we re-check live, not
 * just at thread-open time). DM thread keys are email pairs, so we resolve the
 * caller's uuid↔email and the other party's email↔uuid at this seam.
 */
export async function canAccessThread(
  userId: string,
  threadType: ThreadType,
  threadId: string,
): Promise<boolean> {
  if (threadType === "node") return isNodeMember(userId, threadId);

  const pair = dmPair(threadId);
  if (!pair) return false;
  const myEmail = (await emailsForIds([userId])).get(userId)?.trim().toLowerCase();
  if (!myEmail || !pair.includes(myEmail)) return false;
  const otherEmail = pair[0] === myEmail ? pair[1] : pair[0];
  const otherId = (await idsForEmails([otherEmail])).get(otherEmail);
  if (!otherId) return false;
  return canDM(userId, otherId);
}

async function assertThreadAccess(userId: string, threadType: ThreadType, threadId: string): Promise<void> {
  if (!(await canAccessThread(userId, threadType, threadId))) throw new NotThreadParticipantError();
}

/** Attach resolved sender display names to raw Message rows. */
async function withSenderNames(rows: { senderId: string }[]): Promise<Map<string, string>> {
  return getUserNames([...new Set(rows.map((r) => r.senderId))]);
}

/**
 * Ordered messages for a thread. Asserts access first. With `sinceIso` returns
 * only messages strictly newer than the cursor (the polling fallback path);
 * otherwise the most recent HISTORY_CAP messages in chronological order.
 */
export async function listMessages(
  userId: string,
  threadType: ThreadType,
  threadId: string,
  sinceIso?: string,
): Promise<MessageRow[]> {
  await assertThreadAccess(userId, threadType, threadId);

  let query = supabase
    .from("Message")
    .select("id, threadType, threadId, senderId, body, createdAt")
    .eq("threadType", threadType)
    .eq("threadId", threadId);

  if (sinceIso) {
    query = query.gt("createdAt", sinceIso).order("createdAt", { ascending: true }).limit(HISTORY_CAP);
  } else {
    // newest HISTORY_CAP, then reverse so the caller gets chronological order.
    query = query.order("createdAt", { ascending: false }).limit(HISTORY_CAP);
  }

  const { data, error } = await query;
  if (error) throw new MessageError(error.message);
  const rows = (data ?? []) as Omit<MessageRow, "senderName">[];
  if (!sinceIso) rows.reverse();

  const names = await withSenderNames(rows);
  return rows.map((r) => ({ ...r, senderName: names.get(r.senderId) ?? r.senderId }));
}

/** Recipient emails for a message (who the server broadcasts it to). Node member
 *  ids are uuids → resolved to emails so they match the client's realtime topic
 *  subscription ('kith:user:{email}'). DM thread keys are already email pairs. */
async function threadRecipients(threadType: ThreadType, threadId: string): Promise<string[]> {
  if (threadType === "node") {
    const memberIds = await getNodeMemberIds(threadId);
    const emails = await emailsForIds(memberIds);
    return memberIds.map((id) => emails.get(id) ?? id);
  }
  const pair = dmPair(threadId);
  return pair ?? [];
}

/**
 * Broadcast a persisted message to each recipient's private per-user topic via
 * the Realtime REST endpoint (no socket needed — works in serverless handlers).
 * Recipients are the thread's authorized participants and NOTHING else — this is
 * the only place that decides delivery, since clients never subscribe to threads
 * directly. Best-effort: a broadcast failure must not fail the (already-durable)
 * send; clients fall back to polling.
 */
async function broadcastMessage(message: MessageRow): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jyjpitagxtdzedtooedw.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  if (!key) return;

  const recipients = await threadRecipients(message.threadType, message.threadId);
  if (recipients.length === 0) return;

  const messages = recipients.map((email) => ({
    topic: `kith:user:${email.trim().toLowerCase()}`,
    event: "msg",
    payload: message,
    private: true,
  }));

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages }),
    });
  } catch (err) {
    console.error("[kith] broadcast failed (send still durable)", err);
  }
}

/**
 * Persist a message then broadcast it. Asserts access, trims + length-validates
 * the body (the only boundary validation). Returns the inserted row.
 */
export async function sendMessage(
  userId: string,
  threadType: ThreadType,
  threadId: string,
  bodyRaw: string,
): Promise<MessageRow> {
  await assertThreadAccess(userId, threadType, threadId);

  const body = (bodyRaw ?? "").trim();
  if (!body) throw new MessageError("Message body required");
  if (body.length > MAX_BODY) throw new MessageError("Message too long");

  // senderId stays homogeneous email: resolve the caller's uuid → email.
  const senderId = ((await emailsForIds([userId])).get(userId) ?? userId).trim().toLowerCase();
  const { data, error } = await supabase
    .from("Message")
    .insert({ id: genId(), threadType, threadId, senderId, body })
    .select("id, threadType, threadId, senderId, body, createdAt")
    .single();
  if (error) throw new MessageError(error.message);

  const names = await getUserNames([senderId]);
  const message: MessageRow = {
    ...(data as Omit<MessageRow, "senderName">),
    senderName: names.get(senderId) ?? senderId,
  };

  await broadcastMessage(message);
  return message;
}

export interface DmThreadSummary {
  threadId: string;
  other: { email: string; name: string };
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
}

/**
 * Distinct DM threads the user participates in, newest-activity first, with the
 * other participant's name + a last-message preview. The user's email appears on
 * one side of every thread key, so we match threadId LIKE '%email%' on both the
 * 'email|...' and '...|email' positions, then keep only keys that actually
 * contain the user (LIKE could false-match a substring of another address).
 */
export async function listDmThreads(userId: string): Promise<DmThreadSummary[]> {
  // DM thread keys are email pairs: resolve the caller's uuid → email first.
  const me = ((await emailsForIds([userId])).get(userId) ?? userId).trim().toLowerCase();

  // Pull this user's DM messages (their email is always one side of the key).
  const { data, error } = await supabase
    .from("Message")
    .select("threadId, senderId, body, createdAt")
    .eq("threadType", "dm")
    .like("threadId", `%${me}%`)
    .order("createdAt", { ascending: false });
  if (error) throw new MessageError(error.message);

  // Group by thread, keeping the newest message (rows are already newest-first).
  const seen = new Map<string, { lastBody: string; lastSender: string; lastAt: string; other: string }>();
  for (const row of data ?? []) {
    const threadId = row.threadId as string;
    const pair = dmPair(threadId);
    if (!pair || !pair.includes(me)) continue; // guard against LIKE substring false-matches
    if (seen.has(threadId)) continue;
    const other = pair[0] === me ? pair[1] : pair[0];
    seen.set(threadId, {
      lastBody: row.body as string,
      lastSender: row.senderId as string,
      lastAt: row.createdAt as string,
      other,
    });
  }

  const names = await getUserNames([...new Set([...seen.values()].map((v) => v.other))]);
  return [...seen.entries()].map(([threadId, v]) => ({
    threadId,
    other: { email: v.other, name: names.get(v.other) ?? v.other },
    lastMessage: { body: v.lastBody, senderId: v.lastSender, createdAt: v.lastAt },
  }));
}
