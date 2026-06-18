import { prisma } from "@/lib/db";
import type { EmailResult } from "@/lib/resend";

export type EmailType =
  | "setup"
  | "weekly_digest"
  | "followup"
  | "waitlist"
  | "feedback"
  | "founder_alert";

interface LogEmailArgs {
  toEmail: string;
  type: EmailType;
  result: EmailResult;
  userId?: string;
  subject?: string;
}

/**
 * Record an outbound email send in the EmailLog table. Maps the sender's
 * EmailResult onto the row (providerId = result.id, error = result.error).
 *
 * Never throws: logging is observability, not a hard dependency of sending —
 * a DB hiccup must never turn a delivered email into a failed request. Failures
 * are swallowed and logged to the console.
 */
export async function logEmail({
  toEmail,
  type,
  result,
  userId = "",
  subject = "",
}: LogEmailArgs): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        userId,
        toEmail,
        type,
        subject,
        status: result.status,
        providerId: result.id ?? "",
        error: result.error ?? "",
      },
    });
  } catch (err) {
    console.error("[email-log] failed to record send", { type, toEmail, err });
  }
}
