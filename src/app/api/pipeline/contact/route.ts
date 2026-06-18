import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireUser, scopedSelect, scopedInsert } from "@/lib/pipeline-auth";

interface StageMeta {
  key: string;
  label: string;
  color: string;
  universalPhase?: string;
}

/**
 * POST: manually create a contact and drop it into a pipeline.
 * v1 has no Discovery wiring, so this is the primary way contacts enter a
 * non-recruiting pipeline.
 */
export async function POST(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const pipelineId: string | undefined = body.pipelineId;
    if (!name || !pipelineId) {
      return NextResponse.json(
        { error: "name and pipelineId are required" },
        { status: 400 },
      );
    }

    // Confirm the pipeline belongs to this user (IDOR guard).
    const { data: pipeline } = await scopedSelect("Pipeline", userId)
      .eq("id", pipelineId)
      .maybeSingle();
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }
    const stages: StageMeta[] = Array.isArray(pipeline.stages)
      ? pipeline.stages
      : typeof pipeline.stages === "string"
        ? JSON.parse(pipeline.stages || "[]")
        : [];
    const firstStage = stages[0]?.key || "researched";

    // F9: linkedInUrl is @unique @default(""). Two manual contacts with no URL
    // would collide on "". Insert a unique sentinel when none is provided.
    const linkedInUrl =
      (body.linkedInUrl || "").trim() || `manual:${globalThis.crypto.randomUUID()}`;

    const { data: contact, error: cErr } = await supabase
      .from("AlumniContact")
      .insert({
        name,
        firmName: (body.firmName || "").trim(),
        title: (body.title || "").trim(),
        university: (body.university || "").trim(),
        graduationYear: 0, // sentinel: manual non-recruiting contacts have no grad year
        linkedInUrl,
        importedByUserId: userId,
        source: "manual",
        warmthScore: 0,
        tier: "cold",
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    const now = new Date().toISOString();
    const { data: entry, error: eErr } = await scopedInsert(
      "PipelineEntry",
      userId,
      {
        contactId: contact.id,
        pipelineId,
        stage: firstStage,
        notes: (body.notes || "").trim(),
        addedAt: now,
        updatedAt: now,
        lastTouchAt: now,
      },
    )
      .select()
      .single();
    if (eErr) {
      // One entry per (contactId, userId) (PipelineEntry_contactId_userId_key).
      // Return the conflict gracefully instead of a generic 500.
      if (eErr.code === "23505") {
        return NextResponse.json({ ok: true, alreadyExists: true });
      }
      throw new Error(eErr.message);
    }

    return NextResponse.json({
      contact_id: contact.id,
      pipeline_id: entry.id,
      stage: entry.stage,
    });
  } catch {
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
}
