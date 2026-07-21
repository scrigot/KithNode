import "server-only";
import { supabase } from "@/lib/supabase";

const RULES: Record<string, { days: number; message: string }> = {
  connected: { days: 14, message: "Time to send initial outreach" },
  contacted: { days: 7, message: "Send a follow-up" },
  email_sent: { days: 7, message: "Send a follow-up email" },
  follow_up: { days: 14, message: "Check in again or move on" },
  responded: { days: 1, message: "Send a thank-you within 24 hours" },
};

interface ReminderEntry {
  contactId: string;
  stage: string | null;
  addedAt: string | null;
  updatedAt: string | null;
  lastTouchAt: string | null;
  contact: { name: string; firmName: string } | null;
}

export function calculateReminders(entries: ReminderEntry[], now = Date.now()) {
  return entries
    .flatMap((entry) => {
      const stage = (entry.stage || "").toLowerCase();
      const rule = RULES[stage];
      if (!rule || !entry.contact) return [];
      const activityAt = entry.lastTouchAt || entry.updatedAt || entry.addedAt;
      if (!activityAt) return [];
      const timestamp = new Date(activityAt).getTime();
      if (!Number.isFinite(timestamp)) return [];
      const days = Math.floor((now - timestamp) / 86_400_000);
      if (days < rule.days) return [];
      return [{
        contact_id: entry.contactId,
        name: entry.contact.name,
        company_name: entry.contact.firmName,
        stage,
        days_since_activity: days,
        message: rule.message,
        urgency: days >= rule.days * 2 ? "high" as const : "normal" as const,
      }];
    })
    .sort((a, b) => b.days_since_activity - a.days_since_activity);
}

export async function getDashboardReminders(userId: string) {
  const { data, error } = await supabase
    .from("PipelineEntry")
    .select("contactId, stage, addedAt, updatedAt, lastTouchAt, contact:AlumniContact(name, firmName)")
    .eq("userId", userId);
  if (error) throw new Error(`reminders_query_failed:${error.code || "unknown"}`);
  const entries = (data ?? []).map((entry) => ({
    contactId: String(entry.contactId),
    stage: typeof entry.stage === "string" ? entry.stage : null,
    addedAt: typeof entry.addedAt === "string" ? entry.addedAt : null,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
    lastTouchAt: typeof entry.lastTouchAt === "string" ? entry.lastTouchAt : null,
    contact: Array.isArray(entry.contact) ? entry.contact[0] ?? null : entry.contact,
  }));
  const reminders = calculateReminders(entries);
  return { reminders, total: reminders.length };
}
