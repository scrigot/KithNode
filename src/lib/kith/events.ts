// Per-Node activity log. A durable NodeEvent row is written when a member
// advances a contact into a tracked universal phase (contacted/engaged/advanced).
// Service-role only (RLS denies clients); identity = the User UUID.

import { supabase } from "@/lib/supabase";
import { genId } from "@/lib/kith/ids";
import { LEADERBOARD_PHASES, parseStages } from "@/lib/kith/leaderboard";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { assertNodeMember, getUserNodeIds } from "@/lib/kith/authz";
import { getUserNames } from "@/lib/kith/users";

interface StageMeta {
  key: string;
  universalPhase?: string;
}

// identified is pre-outreach (never emitted); only forward moves into these
// three universal phases are worth logging.
const TRACKED_PHASES = ["contacted", "engaged", "advanced"] as const;

/** Pure: the universal phase to log for a stage move, or null if this move
 *  isn't a tracked forward advance. A move emits its new phase ONLY when the
 *  new phase is tracked AND strictly later in the universal order than the old
 *  phase (an unmapped/missing old phase counts as index -1 — a forward move). */
export function pipelineAdvanceEvent(
  oldStage: string | null,
  newStage: string,
  stages: StageMeta[],
): string | null {
  const stageToPhase = new Map<string, string>();
  for (const s of stages) {
    if (s.universalPhase) stageToPhase.set(s.key.toLowerCase(), s.universalPhase);
  }

  const newPhase = stageToPhase.get(newStage.toLowerCase());
  if (!newPhase || !(TRACKED_PHASES as readonly string[]).includes(newPhase)) return null;

  const oldPhase = oldStage ? stageToPhase.get(oldStage.toLowerCase()) : undefined;
  const newIdx = (LEADERBOARD_PHASES as readonly string[]).indexOf(newPhase);
  const oldIdx = oldPhase ? (LEADERBOARD_PHASES as readonly string[]).indexOf(oldPhase) : -1;

  return newIdx > oldIdx ? newPhase : null;
}

/** Best-effort: write one NodeEvent per node the actor belongs to when a
 *  pipeline move is a tracked forward advance. NEVER throws — a failed log must
 *  not break the pipeline PATCH it rides on. */
export async function recordPipelineAdvance({
  actorId,
  contactId,
  oldStage,
  newStage,
  stages,
}: {
  actorId: string;
  contactId: string;
  oldStage: string | null;
  newStage: string;
  stages: StageMeta[];
}): Promise<void> {
  try {
    if (!KITH_NODES_ENABLED) return;

    const phase = pipelineAdvanceEvent(oldStage, newStage, stages);
    if (!phase) return;

    const nodeIds = await getUserNodeIds(actorId);
    if (nodeIds.length === 0) return;

    const createdAt = new Date().toISOString();
    const rows = nodeIds.map((nodeId) => ({
      id: genId(),
      nodeId,
      actorId,
      kind: "pipeline_advanced",
      contactId,
      phase,
      createdAt,
    }));
    const { error } = await supabase.from("NodeEvent").insert(rows);
    if (error) console.error("[kith] recordPipelineAdvance insert failed", error);
  } catch (err) {
    console.error("[kith] recordPipelineAdvance failed", err);
  }
}

export interface FeedEvent {
  id: string;
  actorName: string;
  kind: string;
  contactName: string | null;
  phase: string | null;
  createdAt: string;
}

/** A node's activity feed (most recent first). Member-gated. Resolves actor +
 *  contact names so the UI renders without extra lookups. */
export async function getNodeFeed(
  nodeId: string,
  requesterId: string,
  limit = 50,
): Promise<FeedEvent[]> {
  await assertNodeMember(requesterId, nodeId);

  const { data: events } = await supabase
    .from("NodeEvent")
    .select("id, actorId, kind, contactId, phase, createdAt")
    .eq("nodeId", nodeId)
    .order("createdAt", { ascending: false })
    .limit(limit);
  const rows = events ?? [];
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actorId as string))];
  const contactIds = [...new Set(rows.map((r) => r.contactId as string).filter(Boolean))];

  const [names, { data: contacts }] = await Promise.all([
    getUserNames(actorIds),
    contactIds.length
      ? supabase.from("AlumniContact").select("id, name").in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const contactName = new Map((contacts ?? []).map((c) => [c.id as string, c.name as string]));

  return rows.map((r) => ({
    id: r.id as string,
    actorName: names.get(r.actorId as string) ?? (r.actorId as string),
    kind: r.kind as string,
    contactName: r.contactId ? contactName.get(r.contactId as string) ?? null : null,
    phase: (r.phase as string) ?? null,
    createdAt: r.createdAt as string,
  }));
}
