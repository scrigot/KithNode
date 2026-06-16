import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { getOverdueLeads } from "@/lib/leads/overdue";
import { isAddressSuppressed } from "@/lib/resend";
import { logEmail } from "@/lib/email/log";

// Follow-up reminder email: nudges the USER about leads that have gone cold
// (overdue for follow-up). KithNode never emails the lead — this respects
// AutoGuard + authenticity. Overdue logic is the single source in
// src/lib/leads/overdue.ts, shared with the topbar bell.

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kithnode.vercel.app";

const client = API_KEY ? new Resend(API_KEY) : null;

/** How many leads we list before collapsing the rest into a "+N more" line. */
const MAX_ROWS = 12;

const STAGE_LABELS: Record<string, string> = {
  researched: "Researched",
  connected: "Connected",
  email_sent: "Emailed",
  follow_up: "Follow-up sent",
};

function stageLabel(stage: string): string {
  return (
    STAGE_LABELS[stage] ||
    stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface OverdueRow {
  id: string;
  name: string;
  firmName: string;
  stage: string;
  days: number;
}

function buildEmailHtml(userName: string, rows: OverdueRow[], total: number): string {
  const leadRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <a href="${APP_URL}/contact/${r.id}" style="text-decoration: none;">
            <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #E2E8F0;">
              ${r.name}${r.firmName ? `<span style="font-size: 12px; font-weight: 400; color: #64748B;"> · ${r.firmName}</span>` : ""}
            </div>
            <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #0EA5E9; margin-top: 4px;">
              ${stageLabel(r.stage)} · ${r.days} day${r.days === 1 ? "" : "s"} with no movement
            </div>
          </a>
        </td>
      </tr>`,
    )
    .join("");

  const moreRow =
    total > rows.length
      ? `
      <tr>
        <td style="padding: 12px 20px;">
          <div style="font-family: Geist, Arial, sans-serif; font-size: 12px; color: #64748B;">
            +${total - rows.length} more lead${total - rows.length === 1 ? "" : "s"} waiting on you
          </div>
        </td>
      </tr>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0A1628; font-family: Geist, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A1628;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #0EA5E9;">
                KITHNODE FOLLOW-UP REMINDER
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #E2E8F0;">
                ${total} lead${total === 1 ? "" : "s"} going cold
              </div>
              <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #94A3B8; margin-top: 8px;">
                Hey ${userName.split(" ")[0] || "there"}, these contacts haven't moved in a week. A quick follow-up keeps the conversation warm.
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(148,163,184,0.6);">
                      OVERDUE FOR FOLLOW-UP
                    </div>
                  </td>
                </tr>
                ${leadRows}
                ${moreRow}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0EA5E9; padding: 12px 32px;">
                    <a href="${APP_URL}/dashboard" style="font-family: Geist, Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FFFFFF; text-decoration: none;">
                      OPEN KITHNODE
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 11px; color: #475569; line-height: 1.6;">
                KithNode - Warm-path networking intelligence<br/>
                You're receiving this because follow-up reminders are on. Turn them off in Settings - Notifications.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email a user about leads overdue for follow-up. No-op (success, not sent) when
 * the user has zero overdue leads or every overdue contact has been deleted.
 * The opt-out (followupEmailEnabled) is enforced by the caller (cron route).
 */
export async function sendFollowupReminders(
  userId: string,
  email: string,
  userName: string,
): Promise<{ success: boolean; sent: boolean; error?: string }> {
  if (!client) {
    console.warn("[followups] RESEND_API_KEY missing - skipping reminder email");
    return { success: false, sent: false, error: "RESEND_API_KEY not configured" };
  }

  if (await isAddressSuppressed(email)) {
    console.warn(`[followups] suppressed address — skipping reminder email to ${email}`);
    return { success: false, sent: false, error: "Address suppressed" };
  }

  const overdue = await getOverdueLeads(userId);
  if (overdue.length === 0) return { success: true, sent: false };

  // Resolve contact names. A PipelineEntry can outlive its AlumniContact, so
  // drop overdue leads whose contact no longer exists rather than emailing a
  // blank row.
  const { data: contacts } = await supabase
    .from("AlumniContact")
    .select("id, name, firmName")
    .in(
      "id",
      overdue.map((o) => o.contactId),
    );
  const byId = new Map((contacts ?? []).map((c) => [c.id, c]));

  const rows: OverdueRow[] = overdue
    .map((o) => {
      const c = byId.get(o.contactId);
      return c
        ? { id: c.id, name: c.name, firmName: c.firmName || "", stage: o.stage, days: o.days }
        : null;
    })
    .filter((r): r is OverdueRow => r !== null);

  if (rows.length === 0) return { success: true, sent: false };

  const subject = `KithNode: ${rows.length} lead${rows.length === 1 ? "" : "s"} need a follow-up`;

  try {
    const { data } = await client.emails.send({
      from: `KithNode <${FROM}>`,
      to: email,
      replyTo: "samrigot31@gmail.com",
      subject,
      html: buildEmailHtml(userName, rows.slice(0, MAX_ROWS), rows.length),
    });
    await logEmail({
      toEmail: email,
      type: "followup",
      result: { status: "sent", id: data?.id },
      userId,
      subject,
    });
    return { success: true, sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[followups] send failed", err);
    await logEmail({
      toEmail: email,
      type: "followup",
      result: { status: "failed", error: message },
      userId,
      subject,
    });
    return { success: false, sent: false, error: message };
  }
}
