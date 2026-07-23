import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { memoryCorrectionSchema } from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to correct memory.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const parsed = memoryCorrectionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return routeError("Choose a correction, forget, or restore action.", 400, "invalid_memory_change");
  const { data: memory, error } = await supabase
    .from("AssistantMemory")
    .select("*")
    .eq("id", id)
    .eq("userId", userId)
    .maybeSingle();
  if (error) return routeError("Memory is temporarily unavailable.", 503, "memory_unavailable");
  if (!memory) return routeError("Memory not found.", 404, "memory_not_found", "Return to Memory.");

  const nextContent = parsed.data.action === "correct" ? parsed.data.content || memory.content : memory.content;
  const active = parsed.data.action === "forget" ? false : parsed.data.action === "restore" ? true : memory.active;
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("AssistantMemory")
    .update({ content: nextContent, active, updatedAt: now })
    .eq("id", id)
    .eq("userId", userId)
    .select("*")
    .single();
  if (updateError || !updated) return routeError("KithNode could not record this memory change.", 503, "memory_update_failed");

  await supabase.from("MemoryCorrection").insert({
    id: randomUUID(),
    memoryId: id,
    userId,
    action: parsed.data.action,
    beforeValue: memory.content,
    afterValue: parsed.data.action === "forget" ? null : nextContent,
    reason: parsed.data.reason,
    createdAt: now,
  });
  return NextResponse.json({
    memory: updated,
    learned: parsed.data.action === "correct" ? "KithNode will use your correction in future recommendations." : undefined,
    reversible: true,
  });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const request = new NextRequest("http://localhost/api/memory", {
    method: "PATCH",
    body: JSON.stringify({ action: "forget" }),
    headers: { "content-type": "application/json" },
  });
  return PATCH(request, context);
}

