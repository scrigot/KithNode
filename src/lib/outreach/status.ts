import "server-only";
import { supabase } from "@/lib/supabase";

export const OUTREACH_STATUSES = ["draft", "sent", "responded", "meeting_set", "failed"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export function isOutreachStatus(value: unknown): value is OutreachStatus {
  return typeof value === "string" && OUTREACH_STATUSES.includes(value.toLowerCase() as OutreachStatus);
}

export async function setOutreachStatus(userId: string, outreachId: string, statusInput: string) {
  const status = statusInput.toLowerCase() as OutreachStatus;
  const now = new Date().toISOString();
  const { data: draft, error } = await supabase
    .from("OutreachDraft")
    .update({
      status,
      updatedAt: now,
      ...(status === "sent" ? { sentAt: now } : {}),
    })
    .eq("id", outreachId)
    .eq("userId", userId)
    .select("id, contactId, status")
    .maybeSingle();
  if (error) throw new Error(`outreach_update_failed:${error.code || "unknown"}`);
  if (!draft) return null;

  const pipelineStage = status === "sent" ? "email_sent" : status;
  if (["email_sent", "responded", "meeting_set"].includes(pipelineStage)) {
    const { error: pipelineError } = await supabase
      .from("PipelineEntry")
      .update({ stage: pipelineStage, lastTouchAt: now, updatedAt: now })
      .eq("contactId", draft.contactId)
      .eq("userId", userId);
    if (pipelineError) throw new Error(`pipeline_update_failed:${pipelineError.code || "unknown"}`);
  }

  return { id: draft.id, contactId: draft.contactId, status: draft.status };
}
