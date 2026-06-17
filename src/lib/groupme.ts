// Server-only GroupMe read client for the v1 beta-feedback pull. Reads
// GROUPME_TOKEN from env (never hardcoded), is strictly read-only (no posting),
// and persists new messages into the `beta_feedback` Supabase table. The cron at
// src/app/api/cron/groupme-pull/route.ts and scripts/dev/groupme-pull-once.ts
// are the only callers. NEVER import this from a client component — the token
// must never reach the browser bundle.

import { supabase } from "@/lib/supabase";

const API_BASE = "https://api.groupme.com/v3";
const BETA_GROUP_NAME = "KithNode Beta";
const PAGE_LIMIT = 100; // GroupMe max per request
const BACKFILL_PAGE_CAP = 10; // first-run safety cap: ≈1000 messages

/** Reads the token lazily so import order never matters (the dev script loads
 * .env.local before invoking the pull). Throws a clear error when unset. */
function getToken(): string {
  const token = process.env.GROUPME_TOKEN;
  if (!token) {
    throw new Error("GROUPME_TOKEN is not set — cannot pull beta feedback.");
  }
  return token;
}

interface GroupMeGroup {
  id: string;
  name: string;
}

interface GroupMeMessage {
  id: string;
  created_at: number; // unix seconds
  name: string;
  text: string | null;
  system: boolean;
}

/** GET /groups — the caller's groups (first page is plenty; the beta group is
 * one the founder owns/is a member of). */
async function listGroups(): Promise<GroupMeGroup[]> {
  const url = `${API_BASE}/groups?token=${encodeURIComponent(getToken())}&per_page=100&omit=memberships`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GroupMe /groups failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { response: GroupMeGroup[] | null };
  return body.response ?? [];
}

/** Resolve the beta group id: explicit GROUPME_GROUP_ID override wins, else
 * match by name "KithNode Beta" (case-insensitive). */
export async function resolveBetaGroupId(): Promise<string> {
  const override = process.env.GROUPME_GROUP_ID?.trim();
  if (override) return override;

  const groups = await listGroups();
  const match = groups.find(
    (g) => g.name?.trim().toLowerCase() === BETA_GROUP_NAME.toLowerCase(),
  );
  if (!match) {
    throw new Error(
      `No GroupMe group named "${BETA_GROUP_NAME}" found. Set GROUPME_GROUP_ID to pin it.`,
    );
  }
  return match.id;
}

/** GET /groups/:id/messages. GroupMe returns HTTP 304 when `after_id` has
 * nothing newer — treated as an empty page. Order within a page is not relied
 * upon; the caller advances the cursor by max(created_at) and dedupes by id. */
async function fetchMessages(
  groupId: string,
  opts: { afterId?: string; beforeId?: string } = {},
): Promise<GroupMeMessage[]> {
  const params = new URLSearchParams({
    token: getToken(),
    limit: String(PAGE_LIMIT),
  });
  if (opts.afterId) params.set("after_id", opts.afterId);
  if (opts.beforeId) params.set("before_id", opts.beforeId);

  const res = await fetch(`${API_BASE}/groups/${groupId}/messages?${params}`, {
    headers: { Accept: "application/json" },
  });
  // 304 = no messages match (e.g. after_id is the latest). Not an error.
  if (res.status === 304) return [];
  if (!res.ok) {
    throw new Error(`GroupMe /messages failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    response: { messages: GroupMeMessage[] | null } | null;
  };
  return body.response?.messages ?? [];
}

interface BetaFeedbackRow {
  id: string;
  author: string;
  text: string;
  source: "groupme";
  created_at: string;
}

/** Map a GroupMe message to a beta_feedback row. Returns null for system events
 * (joins/renames/etc.), which aren't feedback. */
function toRow(m: GroupMeMessage): BetaFeedbackRow | null {
  if (m.system) return null;
  return {
    id: m.id,
    author: m.name ?? "",
    text: m.text ?? "",
    source: "groupme",
    created_at: new Date(m.created_at * 1000).toISOString(),
  };
}

/** The last-seen GroupMe message id, derived from the table itself (the dedupe
 * table doubles as the cursor store — no separate cursor table needed). */
async function lastSeenId(): Promise<string | null> {
  const { data } = await supabase
    .from("beta_feedback")
    .select("id")
    .eq("source", "groupme")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Pull new beta-feedback messages and persist them. Incremental when a cursor
 * exists (only messages newer than the last-seen id); a bounded backfill on the
 * first run. Dedupes by id via upsert(ignoreDuplicates), so overlap is safe.
 */
export async function pullBetaFeedback(): Promise<{
  groupId: string;
  fetched: number;
  inserted: number;
  lastId: string | null;
}> {
  const groupId = await resolveBetaGroupId();
  const cursor = await lastSeenId();

  const collected = new Map<string, GroupMeMessage>();

  if (cursor) {
    // Incremental: walk forward from the cursor. Advance after_id to the
    // newest id in each page until a page comes back short / empty.
    let afterId = cursor;
    // Hard cap to bound a very stale cursor (still cheap: 50 pages = 5k msgs).
    for (let page = 0; page < 50; page++) {
      const batch = await fetchMessages(groupId, { afterId });
      if (batch.length === 0) break;
      for (const m of batch) collected.set(m.id, m);
      // Newest message in this batch becomes the next cursor.
      const newest = batch.reduce((a, b) => (b.created_at > a.created_at ? b : a));
      if (newest.id === afterId) break; // no forward progress
      afterId = newest.id;
      if (batch.length < PAGE_LIMIT) break;
    }
  } else {
    // First run: backfill backward from newest with before_id, capped.
    let beforeId: string | undefined;
    for (let page = 0; page < BACKFILL_PAGE_CAP; page++) {
      const batch = await fetchMessages(groupId, beforeId ? { beforeId } : {});
      if (batch.length === 0) break;
      for (const m of batch) collected.set(m.id, m);
      const oldest = batch.reduce((a, b) => (b.created_at < a.created_at ? b : a));
      beforeId = oldest.id;
      if (batch.length < PAGE_LIMIT) break;
    }
  }

  const rows = [...collected.values()]
    .map(toRow)
    .filter((r): r is BetaFeedbackRow => r !== null);

  let inserted = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("beta_feedback")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      throw new Error(`beta_feedback upsert failed: ${error.message}`);
    }
    inserted = data?.length ?? 0;
  }

  const newLastId = await lastSeenId();
  return { groupId, fetched: rows.length, inserted, lastId: newLastId };
}
