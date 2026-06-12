import { Resend } from "resend";
import { FOUNDER_EMAIL } from "./founder";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const client = API_KEY ? new Resend(API_KEY) : null;

type FeedbackAlertArgs = {
  fromEmail: string;
  page: string;
  message: string;
};

/** In-app help messages route to the founder's inbox. replyTo is the tester's
 * email so a plain Gmail reply answers them directly — that IS the support
 * loop for beta. Never throws: the message is already stored in DB. */
export async function sendFounderFeedbackAlert({ fromEmail, page, message }: FeedbackAlertArgs) {
  if (!client) {
    console.warn("[resend] RESEND_API_KEY missing — skipping feedback alert");
    return;
  }

  try {
    await client.emails.send({
      from: `KithNode Feedback <${FROM}>`,
      to: FOUNDER_EMAIL,
      replyTo: fromEmail,
      subject: `[KithNode] Feedback from ${fromEmail}`,
      text: [
        `From: ${fromEmail}`,
        `Page: ${page || "unknown"}`,
        ``,
        message,
        ``,
        `— Reply to this email to answer them directly.`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[resend] feedback alert failed", err);
  }
}

type ConfirmArgs = {
  email: string;
  fullName: string;
  referralLink: string;
};

export async function sendWaitlistConfirmation({ email, fullName, referralLink }: ConfirmArgs) {
  if (!client) {
    console.warn("[resend] RESEND_API_KEY missing — skipping confirmation email");
    return;
  }

  const firstName = fullName.trim().split(" ")[0] || "there";

  try {
    await client.emails.send({
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
  } catch (err) {
    console.error("[resend] send failed", err);
  }
}
