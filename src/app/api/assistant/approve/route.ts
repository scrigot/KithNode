import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { parseUpdateGoalInput } from "@/lib/assistant/executor";
import { assistantToolPolicy, isAssistantToolName } from "@/lib/assistant/tools";

const requestSchema = z.object({ toolCallId: z.string().min(1), decision: z.enum(["approve", "deny"]), reason: z.string().trim().max(500).default("") });
const enrichmentInputSchema = z.object({ contactIds: z.array(z.string().min(1)).min(1).max(25) });

function actionRpcError(error: { code?: string; message?: string } | null) {
  if (error?.code === "P0002") {
    return NextResponse.json(
      { error: "action_not_found", message: "This proposed action is no longer available. Rerun the search to create a fresh proposal." },
      { status: 404 },
    );
  }
  if (error?.code === "55000") {
    return NextResponse.json(
      { error: "action_conflict", message: "This action has already changed or can no longer be performed. Refresh the conversation to see its latest state." },
      { status: 409 },
    );
  }
  if (error?.code === "PGRST202" || error?.code === "42883") {
    return NextResponse.json(
      { error: "action_unavailable", message: "Recorded actions are temporarily unavailable. Your proposal is still preserved; retry after the database update completes." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "action_failed", message: "KithNode could not complete this action. Nothing was changed, and you can safely retry." },
    { status: 500 },
  );
}

async function updateTool(id: string, userId: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("AssistantToolCall").update(values).eq("id", id).eq("userId", userId);
  if (error) throw new Error(error.message);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: toolCall } = await supabase.from("AssistantToolCall").select("*").eq("id", parsed.data.toolCallId).eq("userId", userId).maybeSingle();
  if (!toolCall) return NextResponse.json({ error: "Tool call not found" }, { status: 404 });
  const { data: approval } = await supabase.from("AssistantApproval").select("*").eq("toolCallId", toolCall.id).eq("userId", userId).maybeSingle();
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  if (!isAssistantToolName(toolCall.toolName)) return NextResponse.json({ error: "Tool is not allowed" }, { status: 400 });

  const now = new Date().toISOString();
  if (parsed.data.decision === "deny") {
    const { data: output, error } = await supabase.rpc("deny_assistant_action", {
      p_user_id: userId,
      p_tool_call_id: toolCall.id,
      p_reason: parsed.data.reason,
    });
    if (!error) return NextResponse.json({ status: "denied", executed: false, output });
    if (error.code !== "P0002" && error.code !== "PGRST202" && error.code !== "42883") return actionRpcError(error);

    // Compatibility path for proposals created before durable actions existed.
    if (approval.status !== "pending" || toolCall.status !== "proposed") {
      return NextResponse.json({ error: "Decision already recorded" }, { status: 409 });
    }
    const { data: claimed } = await supabase.from("AssistantApproval").update({ status: "denied", reason: parsed.data.reason, decidedAt: now }).eq("id", approval.id).eq("userId", userId).eq("status", "pending").select("id");
    if (!claimed?.length) return NextResponse.json({ error: "Decision already recorded" }, { status: 409 });
    await updateTool(toolCall.id, userId, { status: "denied", completedAt: now });
    return NextResponse.json({ status: "denied", executed: false });
  }

  const policy = assistantToolPolicy(toolCall.toolName);
  if (!policy.executable) return NextResponse.json({ error: "Tool execution is not available yet" }, { status: 409 });

  if (toolCall.toolName === "save_opportunity") {
    const { data: output, error } = await supabase.rpc("execute_save_opportunity_action", {
      p_user_id: userId,
      p_tool_call_id: toolCall.id,
    });
    if (error) return actionRpcError(error);
    return NextResponse.json({ status: "completed", executed: true, output, receipt: output });
  }

  if (approval.status !== "pending" || toolCall.status !== "proposed") {
    return NextResponse.json({ error: "Decision already recorded" }, { status: 409 });
  }
  const { data: claimed } = await supabase.from("AssistantApproval").update({ status: "approved", reason: parsed.data.reason, decidedAt: now }).eq("id", approval.id).eq("userId", userId).eq("status", "pending").select("id");
  if (!claimed?.length) return NextResponse.json({ error: "Decision already recorded" }, { status: 409 });
  await updateTool(toolCall.id, userId, { status: "running" });

  try {
    if (toolCall.toolName === "enrich_contacts") {
      const input = enrichmentInputSchema.parse(toolCall.input);
      const { POST: enrichContacts } = await import("@/app/api/contacts/enrich/route");
      const internalRequest = new NextRequest(new URL("/api/contacts/enrich", request.url), { method: "POST", headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" }, body: JSON.stringify({ contactIds: input.contactIds }) });
      const response = await enrichContacts(internalRequest);
      const output = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(output.error || "Enrichment failed"));
      await updateTool(toolCall.id, userId, { status: "completed", output, completedAt: new Date().toISOString() });
      return NextResponse.json({ status: "completed", executed: true, output });
    }

    const goalInput = parseUpdateGoalInput(toolCall.input);
    const goalId = randomUUID();
    const { error } = await supabase.from("CareerGoal").insert({ id: goalId, userId, ...goalInput, createdAt: now, updatedAt: now });
    if (error) throw new Error(error.message);
    const output = { goalId };
    await updateTool(toolCall.id, userId, { status: "completed", output, completedAt: new Date().toISOString() });
    return NextResponse.json({ status: "completed", executed: true, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed";
    await updateTool(toolCall.id, userId, { status: "failed", error: message, completedAt: new Date().toISOString() });
    return NextResponse.json(
      { error: "execution_failed", message: "KithNode could not complete this action. Nothing else was changed, and the proposal remains recorded.", status: "failed" },
      { status: 502 },
    );
  }
}
