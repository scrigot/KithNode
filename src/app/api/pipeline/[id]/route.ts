import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const STAGES = [
  "researched",
  "connected",
  "email_sent",
  "follow_up",
  "responded",
  "meeting_set",
];

/** POST — Add a contact to the pipeline (idempotent) */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contactId } = await params;

  try {
    // Check if already in pipeline
    const { data: existing } = await supabase
      .from("PipelineEntry")
      .select("*")
      .eq("contactId", contactId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        contact_id: contactId,
        pipeline_id: existing.id,
        stage: existing.stage,
        already_exists: true,
      });
    }

    // Create new pipeline entry
    const { data: entry, error } = await supabase
      .from("PipelineEntry")
      .insert({
        contactId,
        stage: "researched",
        notes: "",
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: entry.id,
      stage: entry.stage,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to add to pipeline" },
      { status: 500 },
    );
  }
}

/** PATCH — Advance a contact to the next stage (or set a specific stage) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: contactId } = await params;

  try {
    const body = await request.json();

    // Get current pipeline entry
    const { data: existing, error: fetchError } = await supabase
      .from("PipelineEntry")
      .select("*")
      .eq("contactId", contactId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Contact not in pipeline" },
        { status: 404 },
      );
    }

    let newStage: string;

    if (body.stage) {
      // Explicit stage provided
      newStage = body.stage.toLowerCase();
    } else {
      // Advance to next stage
      const currentIdx = STAGES.indexOf(
        (existing.stage || "researched").toLowerCase(),
      );
      if (currentIdx >= STAGES.length - 1) {
        return NextResponse.json(
          { error: "Already at final stage" },
          { status: 400 },
        );
      }
      newStage = STAGES[currentIdx + 1];
    }

    // Update the entry
    const { data: updated, error: updateError } = await supabase
      .from("PipelineEntry")
      .update({
        stage: newStage,
        notes: body.notes ?? existing.notes,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: updated.id,
      stage: updated.stage,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 },
    );
  }
}
