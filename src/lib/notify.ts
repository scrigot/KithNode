import { logEmail } from "@/lib/email/log";

const WEBHOOK = process.env.SLACK_WEBHOOK_URL;

/** Founder-facing lifecycle events worth a real-time Slack ping. */
export type FounderEvent =
  | "access_request"
  | "feedback_survey"
  | "onboarding_done"
  | "help_feedback"
  | "subscription";

type NotifyArgs = {
  event: FounderEvent;
  /** Bold first line, e.g. "🟢 New access request". */
  title: string;
  /** Body lines (email, name, key fields) — joined with newlines. */
  lines: string[];
};

/**
 * Ping the founder's Slack via an Incoming Webhook. Mirrors the contract of
 * sendFounderFeedbackAlert in src/lib/resend.ts:
 *
 * Never throws — the underlying event (signup, feedback, payment) is already
 * persisted, so a Slack hiccup must never fail the parent request. Every
 * outcome (sent | failed | skipped) is recorded to EmailLog for audit.
 *
 * No SLACK_WEBHOOK_URL configured (local/preview/tests) → log "skipped" and
 * return without sending.
 */
export async function notifyFounder({ event, title, lines }: NotifyArgs): Promise<void> {
  const text = [`*${title}*`, ...lines].join("\n");

  if (!WEBHOOK) {
    console.warn(`[notify] SLACK_WEBHOOK_URL missing — skipping ${event} alert`);
    await logEmail({ toEmail: "slack", type: "founder_alert", result: { status: "skipped" }, subject: title });
    return;
  }

  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    await logEmail({
      toEmail: "slack",
      type: "founder_alert",
      result: res.ok
        ? { status: "sent" }
        : { status: "failed", error: `Slack responded ${res.status}` },
      subject: title,
    });
  } catch (err) {
    console.error(`[notify] ${event} alert failed`, err);
    await logEmail({
      toEmail: "slack",
      type: "founder_alert",
      result: { status: "failed", error: err instanceof Error ? err.message : String(err) },
      subject: title,
    });
  }
}
