import "server-only";
import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";

export class AssistantDatabaseError extends Error {
  constructor(public operation: string, message: string) { super(message); }
}

function assertResult<T>(operation: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new AssistantDatabaseError(operation, result.error.message);
  return result.data;
}

export const assistantId = () => randomUUID();

export const assistantRepository = {
  async listConversations(userId: string) {
    return assertResult("list conversations", await supabase.from("AssistantConversation").select("*").eq("userId", userId).order("updatedAt", { ascending: false }).limit(20)) || [];
  },
  async conversation(id: string, userId: string) {
    return assertResult("load conversation", await supabase.from("AssistantConversation").select("*").eq("id", id).eq("userId", userId).maybeSingle());
  },
  async createConversation(userId: string, title: string) {
    return assertResult("create conversation", await supabase.from("AssistantConversation").insert({ id: assistantId(), userId, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).select("*").single());
  },
  async touchConversation(id: string, userId: string) {
    assertResult("update conversation", await supabase.from("AssistantConversation").update({ updatedAt: new Date().toISOString() }).eq("id", id).eq("userId", userId));
  },
  async listMessages(conversationId: string, userId: string, descending = false, limit = 200) {
    return assertResult("list messages", await supabase.from("AssistantMessage").select("*").eq("conversationId", conversationId).eq("userId", userId).order("createdAt", { ascending: !descending }).limit(limit)) || [];
  },
  async createMessage(input: { conversationId: string; userId: string; role: string; content: string; meta?: unknown }) {
    return assertResult("create message", await supabase.from("AssistantMessage").insert({ id: assistantId(), ...input, meta: input.meta || {}, createdAt: new Date().toISOString() }).select("*").single());
  },
  async listRunIds(conversationId: string, userId: string) {
    return assertResult("list runs", await supabase.from("AssistantRun").select("id").eq("conversationId", conversationId).eq("userId", userId)) || [];
  },
  async createRun(input: { conversationId: string; userId: string; model: string }) {
    return assertResult("create run", await supabase.from("AssistantRun").insert({ id: assistantId(), ...input, status: "running", createdAt: new Date().toISOString() }).select("*").single());
  },
  async updateRun(id: string, userId: string, input: Record<string, unknown>) {
    assertResult("update run", await supabase.from("AssistantRun").update(input).eq("id", id).eq("userId", userId));
  },
  async listToolCalls(userId: string, runIds: string[]) {
    if (!runIds.length) return [];
    return assertResult("list tool calls", await supabase.from("AssistantToolCall").select("*").eq("userId", userId).in("runId", runIds).order("createdAt", { ascending: true }));
  },
  async createToolCall(input: Record<string, unknown>) {
    return assertResult("create tool call", await supabase.from("AssistantToolCall").insert({ id: assistantId(), status: "proposed", createdAt: new Date().toISOString(), ...input }).select("*").single());
  },
  async createApproval(toolCallId: string, userId: string) {
    return assertResult("create approval", await supabase.from("AssistantApproval").insert({ id: assistantId(), toolCallId, userId, status: "pending", createdAt: new Date().toISOString() }).select("*").single());
  },
  async createRecommendation(input: Record<string, unknown>) {
    return assertResult("create recommendation", await supabase.from("Recommendation").insert({ id: assistantId(), status: "open", createdAt: new Date().toISOString(), ...input }).select("*").single());
  },
};
