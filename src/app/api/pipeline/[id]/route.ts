import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserClient } from "@/lib/supabase-user";

const STAGES = [
  "researched",
  "connected",
  "email_sent",
  "follow_up",
  "responded",
  "meeting_set",
];

/** POST: Add a contact to the pipeline (idempotent) */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const db = await getUserClient(userId, session.user.email ?? "");

  const { id: contactId } = await params;

  try {
    // Check if already in pipeline for this user
    const { data: existing } = await db
      .from("PipelineEntry")
      .select("*")
      .eq("contactId", contactId)
      .eq("userId", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        contact_id: contactId,
        pipeline_id: existing.id,
        stage: existing.stage,
        already_exists: true,
      });
    }

    // Create new pipeline entry with userId
    const { data: entry, error } = await db
      .from("PipelineEntry")
      .insert({
        contactId,
        userId,
        stage: "researched",
        notes: "",
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Unique violation = a concurrent add won the race — idempotent success,
      // same as the existing-row short-circuit above.
      if (error.code === "23505") {
        return NextResponse.json({
          contact_id: contactId,
          stage: "researched",
          already_exists: true,
        });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: entry.id,
      stage: entry.stage,
    });
  } catch (err) {
    // Surface the real failure in server logs — a silent catch hid a broken
    // unique constraint here for weeks.
    console.error("Pipeline add error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to add to pipeline" },
      { status: 500 },
    );
  }
}

/** DELETE: Remove this user's PipelineEntry for the contact */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const db = await getUserClient(userId, session.user.email ?? "");
  const { id: contactId } = await params;

  const { error, count } = await db
    .from("PipelineEntry")
    .delete({ count: "exact" })
    .eq("contactId", contactId)
    .eq("userId", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removed: count ?? 0 });
}

/** PATCH: Advance a contact to the next stage (or set a specific stage) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const db = await getUserClient(userId, session.user.email ?? "");

  const { id: contactId } = await params;

  try {
    const body = await request.json();

    // Get current pipeline entry for this user
    const { data: existing, error: fetchError } = await db
      .from("PipelineEntry")
      .select("*")
      .eq("contactId", contactId)
      .eq("userId", userId)
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
    const { data: updated, error: updateError } = await db
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

    // Build conversion data for RESPONDED / MEETING_SET transitions
    const isConversion =
      newStage === "responded" || newStage === "meeting_set";
    let conversion: {
      contactId: string;
      source: string;
      stage: string;
      warmPathCount: number;
    } | undefined;

    if (isConversion) {
      const { data: contact } = await supabase
        .from("AlumniContact")
        .select("source, affiliations, importedByUserId")
        .eq("id", contactId)
        .maybeSingle();

      if (contact?.importedByUserId && contact.importedByUserId !== userId) {
        const { data: rating } = await db
          .from("UserDiscover")
          .select("rating")
          .eq("userId", userId)
          .eq("contactId", contactId)
          .maybeSingle();
        if (!rating) {
          return NextResponse.json(
            { error: "Contact not found" },
            { status: 404 },
          );
        }
      }

      conversion = {
        contactId,
        source: contact?.source ?? "unknown",
        stage: newStage,
        warmPathCount: contact?.affiliations
          ? contact.affiliations.split(",").filter(Boolean).length
          : 0,
      };
    }

    return NextResponse.json({
      contact_id: contactId,
      pipeline_id: updated.id,
      stage: updated.stage,
      ...(conversion ? { conversion } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 },
    );
  }
}
