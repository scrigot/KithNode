import { supabase } from "@/lib/supabase";

// Single source of truth for "leads overdue for follow-up." Used by the topbar
// bell (via /api/dashboard/overview) AND the follow-up reminder email, so the
// two never disagree.
//
// "Resolved" = the user moved the lead to responded/meeting_set; those drop off.
// NOTE: AutoGuard's Connection.automationPaused is NOT yet written by any code
// path (the field exists but nothing sets it true), so there is no replied-lead
// filter to apply here today — the stage check is the live signal. When backend
// reply-detection starts pausing automation, exclude those contactIds in
// getOverdueLeads so both surfaces respect it.

export const OVERDUE_DAYS = 7;
const RESOLVED_STAGES = new Set(["responded", "meeting_set"]);

export interface OverdueLead {
  contactId: string;
  stage: string;
  days: number; // whole days overdue (floored), as shown in the UI
}

interface PipelineRow {
  contactId: string;
  stage: string | null;
  addedAt: string | null;
}

/** Pure: pick + sort overdue leads from raw pipeline rows. Filter uses the
 *  fractional age; the returned `days` is floored for display. */
export function selectOverdueLeads(rows: PipelineRow[], now: number): OverdueLead[] {
  return rows
    .map((r) => {
      const stage = (r.stage || "researched").toLowerCase();
      const ageDays = (now - new Date(r.addedAt || now).getTime()) / 86_400_000;
      return { contactId: r.contactId, stage, ageDays };
    })
    .filter((r) => !RESOLVED_STAGES.has(r.stage) && r.ageDays >= OVERDUE_DAYS)
    .sort((a, b) => b.ageDays - a.ageDays)
    .map((r) => ({ contactId: r.contactId, stage: r.stage, days: Math.floor(r.ageDays) }));
}

/** Fetch a user's overdue leads. `userId` is the session email (the userId key
 *  on PipelineEntry in this codebase). */
export async function getOverdueLeads(userId: string): Promise<OverdueLead[]> {
  const { data } = await supabase
    .from("PipelineEntry")
    .select("contactId, stage, addedAt")
    .eq("userId", userId);
  return selectOverdueLeads(data ?? [], Date.now());
}
