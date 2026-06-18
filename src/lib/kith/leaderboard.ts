// Per-Node leaderboard — a SNAPSHOT of each member's CURRENT pipeline progression
// plus their total contacts added. (Replaces the old 7/30-day activity score.)
// Identity = the User UUID; names resolve from the User table (getUserNames keys
// by id). Computed entirely from existing tables — no events log.
//
// Each member's pipeline contacts are bucketed into the 4 universal phases
// (identified -> contacted -> engaged -> advanced) by mapping each entry's native
// stage through its Pipeline's stage config (stageMeta.universalPhase), mirroring
// the "All" view in /api/pipeline (UNIVERSAL_PHASES there). Score rewards
// progression: a booked meeting (advanced) is worth far more than an email sent
// (contacted); pre-outreach (identified) scores nothing. contactsAdded is a light
// per-contact reward for network-building (lifetime).

import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/supabase-paginate";
import { assertNodeMember, getNodeMemberIds } from "@/lib/kith/authz";
import { getUserNames } from "@/lib/kith/users";

// Must match UNIVERSAL_PHASES in src/app/api/pipeline/route.ts.
export const LEADERBOARD_PHASES = ["identified", "contacted", "engaged", "advanced"] as const;
export type LeaderboardPhase = (typeof LEADERBOARD_PHASES)[number];

// Progression weights. identified (sourced, not yet contacted) scores 0 so the
// board rewards actually advancing relationships, not bulk-importing leads.
export const PHASE_WEIGHTS: Record<LeaderboardPhase, number> = {
  identified: 0,
  contacted: 2,
  engaged: 5,
  advanced: 10,
};
export const CONTACT_ADDED_WEIGHT = 1;

/** Pure score for one member: progression-weighted phases + contacts added. */
export function scoreSnapshot(
  phases: Record<LeaderboardPhase, number>,
  contactsAdded: number,
): number {
  return (
    phases.identified * PHASE_WEIGHTS.identified +
    phases.contacted * PHASE_WEIGHTS.contacted +
    phases.engaged * PHASE_WEIGHTS.engaged +
    phases.advanced * PHASE_WEIGHTS.advanced +
    contactsAdded * CONTACT_ADDED_WEIGHT
  );
}

export interface LeaderboardRow {
  /** The member's User UUID. Named `email` for response-shape compatibility. */
  email: string;
  name: string;
  contactsAdded: number;
  phases: Record<LeaderboardPhase, number>;
  score: number;
}

interface StageMeta {
  key: string;
  universalPhase?: string;
}

function zeroPhases(): Record<LeaderboardPhase, number> {
  return { identified: 0, contacted: 0, engaged: 0, advanced: 0 };
}

// Pipeline.stages is stored as a JSON array (or a JSON string). Parse tolerantly
// into the {key, universalPhase} subset the bucketing needs.
export function parseStages(raw: unknown): StageMeta[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw || "[]");
      arr = Array.isArray(v) ? v : [];
    } catch {
      arr = [];
    }
  }
  return arr
    .filter((s): s is StageMeta => !!s && typeof s === "object" && typeof (s as StageMeta).key === "string")
    .map((s) => ({ key: s.key, universalPhase: s.universalPhase }));
}

export async function computeLeaderboard(
  nodeId: string,
  requesterId: string,
): Promise<LeaderboardRow[]> {
  await assertNodeMember(requesterId, nodeId);

  const memberIds = await getNodeMemberIds(nodeId);
  if (memberIds.length === 0) return [];

  // Snapshot — no time window. Lifetime contacts added + current pipeline state.
  // fetchAllRows pages past PostgREST's 1000-row cap (a plain .in() silently
  // truncates once a node crosses 1000 rows, zeroing recent members).
  const [contactRows, entryRows, names] = await Promise.all([
    fetchAllRows<{ importedByUserId: string }>(() =>
      supabase
        .from("AlumniContact")
        .select("importedByUserId")
        .in("importedByUserId", memberIds)
        .order("id"),
    ),
    fetchAllRows<{ userId: string; pipelineId: string | null; stage: string | null }>(() =>
      supabase
        .from("PipelineEntry")
        .select("userId, pipelineId, stage")
        .in("userId", memberIds)
        .order("id"),
    ),
    getUserNames(memberIds),
  ]);

  // Map each pipeline -> (native stage key -> universal phase). A stage with no
  // universalPhase (or an entry whose stage is unmapped) is excluded from the
  // phase tally — same "unsorted" fallthrough as the pipeline All view.
  const pipelineIds = [...new Set(entryRows.map((e) => e.pipelineId).filter((x): x is string => !!x))];
  const stageToPhase = new Map<string, Map<string, string>>();
  if (pipelineIds.length > 0) {
    const { data: pipes } = await supabase.from("Pipeline").select("id, stages").in("id", pipelineIds);
    for (const p of pipes ?? []) {
      const m = new Map<string, string>();
      for (const s of parseStages((p as { stages: unknown }).stages)) {
        if (s.universalPhase) m.set(s.key.toLowerCase(), s.universalPhase);
      }
      stageToPhase.set(p.id as string, m);
    }
  }

  const contactsAdded = new Map<string, number>();
  for (const r of contactRows) {
    contactsAdded.set(r.importedByUserId, (contactsAdded.get(r.importedByUserId) ?? 0) + 1);
  }

  const byMember = new Map<string, Record<LeaderboardPhase, number>>();
  for (const e of entryRows) {
    const phase = e.pipelineId
      ? stageToPhase.get(e.pipelineId)?.get((e.stage || "").toLowerCase())
      : undefined;
    if (!phase || !(phase in PHASE_WEIGHTS)) continue;
    const rec = byMember.get(e.userId) ?? zeroPhases();
    rec[phase as LeaderboardPhase] += 1;
    byMember.set(e.userId, rec);
  }

  const rows: LeaderboardRow[] = memberIds.map((id) => {
    const phases = byMember.get(id) ?? zeroPhases();
    const ca = contactsAdded.get(id) ?? 0;
    return { email: id, name: names.get(id) ?? id, contactsAdded: ca, phases, score: scoreSnapshot(phases, ca) };
  });

  return rows.sort((a, b) => b.score - a.score);
}
