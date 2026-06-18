// Per-Node engagement leaderboard. Computed entirely from existing tables
// (AlumniContact tiers, PipelineEntry stage activity, intro_requests, contacts
// added). Two windows: week (7d) and month (30d). Identity = email.

import { supabase } from "@/lib/supabase";
import { assertNodeMember, getNodeMemberIds } from "@/lib/kith/authz";
import { getUserNames } from "@/lib/kith/users";

export type LeaderboardWindow = "week" | "month";

const WINDOW_DAYS: Record<LeaderboardWindow, number> = { week: 7, month: 30 };

// Each signal is weighted by how much intent it shows.
const WEIGHTS = { warmSignals: 3, coffeeChats: 5, intros: 4, contactsAdded: 1 };

export interface LeaderboardRow {
  email: string;
  name: string;
  warmSignals: number;
  coffeeChats: number;
  intros: number;
  contactsAdded: number;
  score: number;
}

function tally<T>(rows: T[] | null | undefined, key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export async function computeLeaderboard(
  nodeId: string,
  requesterId: string,
  window: LeaderboardWindow,
): Promise<LeaderboardRow[]> {
  await assertNodeMember(requesterId, nodeId);

  const memberIds = await getNodeMemberIds(nodeId);
  if (memberIds.length === 0) return [];

  const since = new Date(Date.now() - WINDOW_DAYS[window] * 86_400_000).toISOString();

  const [contactsRes, pipelineRes, introsRes, names] = await Promise.all([
    supabase
      .from("AlumniContact")
      .select("importedByUserId, tier, createdAt")
      .in("importedByUserId", memberIds)
      .gte("createdAt", since),
    supabase
      .from("PipelineEntry")
      .select("userId, updatedAt")
      .in("userId", memberIds)
      .gte("updatedAt", since),
    supabase
      .from("intro_requests")
      .select("from_user_id, created_at")
      .in("from_user_id", memberIds)
      .gte("created_at", since),
    getUserNames(memberIds),
  ]);

  const contactsAdded = tally(contactsRes.data, (r) => r.importedByUserId as string);
  const warmSignals = tally(
    (contactsRes.data ?? []).filter((r) => ["hot", "warm"].includes(String(r.tier).toLowerCase())),
    (r) => r.importedByUserId as string,
  );
  const coffeeChats = tally(pipelineRes.data, (r) => r.userId as string);
  const intros = tally(introsRes.data, (r) => r.from_user_id as string);

  const rows: LeaderboardRow[] = memberIds.map((email) => {
    const ws = warmSignals.get(email) ?? 0;
    const cc = coffeeChats.get(email) ?? 0;
    const ic = intros.get(email) ?? 0;
    const ca = contactsAdded.get(email) ?? 0;
    return {
      email,
      name: names.get(email) ?? email,
      warmSignals: ws,
      coffeeChats: cc,
      intros: ic,
      contactsAdded: ca,
      score:
        ws * WEIGHTS.warmSignals +
        cc * WEIGHTS.coffeeChats +
        ic * WEIGHTS.intros +
        ca * WEIGHTS.contactsAdded,
    };
  });

  return rows.sort((a, b) => b.score - a.score);
}
