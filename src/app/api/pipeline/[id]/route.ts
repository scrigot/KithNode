import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  requireUser,
  scopedSelect,
  scopedInsert,
  scopedDelete,
} from "@/lib/pipeline-auth";
import { recordPipelineAdvance } from "@/lib/kith/events";

interface StageMeta {
  key: string;
  label: string;
  color: string;
  universalPhase?: string;
}

function parseStages(raw: unknown): StageMeta[] {
  if (Array.isArray(raw)) return raw as StageMeta[];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function loadPipeline(userId: string, pipelineId: string) {
  const { data } = await scopedSelect("Pipeline", userId).eq("id", pipelineId).maybeSingle();
  if (!data) return null;
  return { ...data, stages: parseStages(data.stages) as StageMeta[] };
}

/** POST: add an existing contact to a specific pipeline (idempotent per pipeline). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: contactId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const pipelineId: string | undefined = body.pipelineId;
    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId required" }, { status: 400 });
    }
    const pipeline = await loadPipeline(userId, pipelineId);
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Idempotent: one entry per (contact, pipeline, user).
    const { data: existing } = await scopedSelect("PipelineEntry", userId)
      .eq("contactId", contactId)
      .eq("pipelineId", pipelineId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        contact_id: contactId,
        pipeline_id: existing.id,
        stage: existing.stage,
        already_exists: true,
      });
    }

    const firstStage = pipeline.stages[0]?.key || "researched";
    const now = new Date().toISOString();
    const { data: entry, error } = await scopedInsert("PipelineEntry", userId, {
      contactId,
      pipelineId,
      stage: firstStage,
      notes: "",
      addedAt: now,
      updatedAt: now,
      lastTouchAt: now,
    })
      .select()
      .single();
    if (error) {
      // The DB enforces one entry per (contactId, userId)
      // (PipelineEntry_contactId_userId_key). The pre-check above is scoped to a
      // single pipeline, so a contact already in ANOTHER of this user's pipelines
      // surfaces here as a unique violation — return it gracefully, not a 500.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyExists: true });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: entry.id,
      stage: entry.stage,
    });
  } catch {
    return NextResponse.json({ error: "Failed to add to pipeline" }, { status: 500 });
  }
}

/** PATCH: advance/regress a contact within its pipeline, or set a specific stage. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: contactId } = await params;

  try {
    const body = await request.json();
    const pipelineId: string | undefined = body.pipelineId;

    // Locate the entry. pipelineId disambiguates when a contact is in >1 pipeline.
    let q = scopedSelect("PipelineEntry", userId).eq("contactId", contactId);
    if (pipelineId) q = q.eq("pipelineId", pipelineId);
    const { data: existing, error: fetchError } = await q.maybeSingle();
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Contact not in pipeline" }, { status: 404 });
    }

    const pipeline = existing.pipelineId
      ? await loadPipeline(userId, existing.pipelineId)
      : null;
    const stages = pipeline?.stages || [];
    const stageKeys = stages.map((s: StageMeta) => s.key);

    let newStage: string;
    if (body.stage) {
      newStage = String(body.stage).toLowerCase();
      // Orphan guard: reject a target stage that isn't in this pipeline.
      if (stageKeys.length && !stageKeys.includes(newStage)) {
        return NextResponse.json(
          { error: `Unknown stage "${newStage}" for this pipeline` },
          { status: 400 },
        );
      }
    } else {
      const dir = body.direction === "backward" ? -1 : 1;
      const curIdx = stageKeys.indexOf((existing.stage || "").toLowerCase());
      const nextIdx = curIdx + dir;
      if (curIdx < 0 || nextIdx < 0 || nextIdx >= stageKeys.length) {
        return NextResponse.json({ error: "No further stage" }, { status: 400 });
      }
      newStage = stageKeys[nextIdx];
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("PipelineEntry")
      .update({
        stage: newStage,
        notes: body.notes ?? existing.notes,
        lastTouchAt: now,
        updatedAt: now,
      })
      .eq("id", existing.id)
      .eq("userId", userId) // IDOR guard on the write too
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    // Best-effort node activity log. Fire-and-forget: recordPipelineAdvance never
    // throws, and the trailing .catch() ensures a rejected promise can't surface
    // here — the PATCH response is unaffected either way.
    void recordPipelineAdvance({
      actorId: userId,
      contactId,
      oldStage: existing.stage,
      newStage,
      stages,
    }).catch(() => {});

    // Conversion tracking: reaching the pipeline's final stage.
    const terminalKey = stageKeys[stageKeys.length - 1];
    let conversion:
      | { contactId: string; source: string; stage: string; warmPathCount: number; pipelineKind: string }
      | undefined;
    if (newStage === terminalKey) {
      const { data: contact } = await supabase
        .from("AlumniContact")
        .select("source, affiliations")
        .eq("id", contactId)
        .maybeSingle();
      conversion = {
        contactId,
        source: contact?.source ?? "unknown",
        stage: newStage,
        warmPathCount: contact?.affiliations
          ? contact.affiliations.split(",").filter(Boolean).length
          : 0,
        pipelineKind: pipeline?.kind || "",
      };
    }

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: updated.id,
      stage: updated.stage,
      ...(conversion ? { conversion } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }
}

/** DELETE: remove this user's PipelineEntry for the contact. Optionally scoped
 *  to a single pipeline via ?pipelineId=; otherwise removes the contact from
 *  every pipeline the user owns. userId scoping is the only IDOR guard. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: contactId } = await params;
  const pipelineId = request.nextUrl.searchParams.get("pipelineId");

  let q = scopedDelete("PipelineEntry", userId).eq("contactId", contactId);
  if (pipelineId) q = q.eq("pipelineId", pipelineId);
  const { error, count } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, removed: count ?? 0 });
}
