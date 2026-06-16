import { Resend } from "resend";
import { FOUNDER_EMAIL } from "./founder";
import { prisma } from "./db";
import { logEmail } from "@/lib/email/log";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const client = API_KEY ? new Resend(API_KEY) : null;

/** Returns true if this address has ever bounced or complained. The EmailEvent
 * table is the suppression list — no separate table needed. */
export async function isAddressSuppressed(email: string): Promise<boolean> {
  const hit = await prisma.emailEvent.findFirst({
    where: {
      recipient: email.toLowerCase(),
      type: { in: ["email.bounced", "email.complained"] },
    },
    select: { id: true },
  });
  return hit !== null;
}

type FeedbackAlertArgs = {
  fromEmail: string;
  page: string;
  message: string;
};

/** In-app help messages route to the founder's inbox. replyTo is the tester's
 * email so a plain Gmail reply answers them directly — that IS the support
 * loop for beta. Never throws: the message is already stored in DB. */
export async function sendFounderFeedbackAlert({ fromEmail, page, message }: FeedbackAlertArgs) {
  const subject = `[KithNode] Feedback from ${fromEmail}`;
  if (!client) {
    console.warn("[resend] RESEND_API_KEY missing — skipping feedback alert");
    await logEmail({ toEmail: FOUNDER_EMAIL, type: "feedback", result: { status: "skipped" }, subject });
    return;
  }

  try {
    const { data, error } = await client.emails.send({
      from: `KithNode Feedback <${FROM}>`,
      to: FOUNDER_EMAIL,
      replyTo: fromEmail,
      subject,
      text: [
        `From: ${fromEmail}`,
        `Page: ${page || "unknown"}`,
        ``,
        message,
        ``,
        `— Reply to this email to answer them directly.`,
      ].join("\n"),
    });
    await logEmail({
      toEmail: FOUNDER_EMAIL,
      type: "feedback",
      result: error
        ? { status: "failed", error: error.message ?? String(error) }
        : { status: "sent", id: data?.id },
      subject,
    });
  } catch (err) {
    console.error("[resend] feedback alert failed", err);
    await logEmail({
      toEmail: FOUNDER_EMAIL,
      type: "feedback",
      result: { status: "failed", error: err instanceof Error ? err.message : String(err) },
      subject,
    });
  }
}

type ConfirmArgs = {
  email: string;
  fullName: string;
  referralLink: string;
};

/** Delivery outcome so the caller can record it. "skipped" = no API key
 * configured (local/preview); "failed" = Resend returned an error or threw. */
export type EmailResult = {
  status: "sent" | "failed" | "skipped";
  id?: string;
  error?: string;
};

export async function sendWaitlistConfirmation({
  email,
  fullName,
  referralLink,
}: ConfirmArgs): Promise<EmailResult> {
  if (!client) {
    console.warn("[resend] RESEND_API_KEY missing — skipping confirmation email");
    const result: EmailResult = { status: "skipped" };
    await logEmail({ toEmail: email, type: "waitlist", result, subject: "You're on the KithNode list" });
    return result;
  }

  if (await isAddressSuppressed(email)) {
    console.warn(`[resend] suppressed address — skipping confirmation email to ${email}`);
    return { status: "skipped" };
  }

  const firstName = fullName.trim().split(" ")[0] || "there";

  try {
    // Resend returns { data, error }: an API-level error (bad domain, rate
    // limit, suppressed address) does NOT throw, so check `error` explicitly.
    // Only network/transport faults throw, hence the surrounding try/catch.
    const { data, error } = await client.emails.send({
      from: `Sam from KithNode <${FROM}>`,
      to: email,
      replyTo: "samrigot31@gmail.com",
      subject: "You're on the KithNode list",
      text: [
        `Hey ${firstName} — Sam here, founder of KithNode.`,
        ``,
        `You're in. I'm hand-picking the first 50 alpha users over the next few weeks.`,
        ``,
        `Two things that help:`,
        ``,
        `1. Share your spot — referrals skip the queue.`,
        `   ${referralLink}`,
        ``,
        `2. Hit reply and tell me what broke in your last recruiting push.`,
        `   I read every one.`,
        ``,
        `Talk soon,`,
        `Sam`,
        `UNC '29 · building KithNode`,
      ].join("\n"),
    });
    const result: EmailResult = error
      ? { status: "failed", error: error.message ?? String(error) }
      : { status: "sent", id: data?.id };
    if (error) console.error("[resend] send failed", error);
    await logEmail({ toEmail: email, type: "waitlist", result, subject: "You're on the KithNode list" });
    return result;
  } catch (err) {
    console.error("[resend] send threw", err);
    const result: EmailResult = {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
    await logEmail({ toEmail: email, type: "waitlist", result, subject: "You're on the KithNode list" });
    return result;
  }
}
