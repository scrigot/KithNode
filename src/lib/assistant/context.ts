import "server-only";
import { supabase } from "@/lib/supabase";
import { connectedCalendarContext } from "@/lib/integrations/read";
import { AssistantDatabaseError } from "@/lib/assistant/repository";

function rows<T>(operation: string, result: { data: T[] | null; error: { message: string } | null }) {
  if (result.error) throw new AssistantDatabaseError(operation, result.error.message);
  return result.data || [];
}

export async function buildAssistantContext(userId: string) {
  const [userResult, goalResult, pipelineResult, memoryResult, recommendationResult, connectedCalendars] = await Promise.all([
    supabase.from("User").select("name,university,graduationYear,targetIndustries,targetFirms,targetLocations,onboardingGoal,onboardingTimeline").eq("id", userId).maybeSingle(),
    supabase.from("CareerGoal").select("*").eq("userId", userId).eq("status", "active").order("priority", { ascending: false }).order("updatedAt", { ascending: false }).limit(10),
    supabase.from("PipelineEntry").select("id,contactId,pipelineId,stage,notes,lastTouchAt,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(30),
    supabase.from("AssistantMemory").select("*").eq("userId", userId).eq("active", true).order("updatedAt", { ascending: false }).limit(20),
    supabase.from("Recommendation").select("*").eq("userId", userId).eq("status", "open").order("dueAt", { ascending: true }).order("createdAt", { ascending: false }).limit(10),
    connectedCalendarContext(userId).catch(() => []),
  ]);
  if (userResult.error) throw new AssistantDatabaseError("load user context", userResult.error.message);
  const pipeline = rows("load pipeline", pipelineResult);
  const contactIds = [...new Set(pipeline.map((entry) => String(entry.contactId)).filter(Boolean))];
  const pipelineIds = [...new Set(pipeline.map((entry) => String(entry.pipelineId || "")).filter(Boolean))];
  const [contactResult, pipelineMetaResult] = await Promise.all([
    contactIds.length ? supabase.from("AlumniContact").select("id,name,firmName,title,tier").in("id", contactIds) : Promise.resolve({ data: [], error: null }),
    pipelineIds.length ? supabase.from("Pipeline").select("id,name,kind").in("id", pipelineIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const contacts = new Map(rows("load pipeline contacts", contactResult).map((item) => [String(item.id), item]));
  const pipelines = new Map(rows("load pipeline metadata", pipelineMetaResult).map((item) => [String(item.id), item]));

  return {
    user: userResult.data,
    goals: rows("load goals", goalResult),
    pipeline: pipeline.map((entry) => ({ ...entry, contact: contacts.get(String(entry.contactId)) || null, pipeline: pipelines.get(String(entry.pipelineId)) || null })),
    memories: rows("load memories", memoryResult),
    existingRecommendations: rows("load recommendations", recommendationResult),
    connectedCalendars,
    now: new Date().toISOString(),
  };
}
