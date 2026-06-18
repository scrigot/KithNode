import { Resend } from "resend";
import type { EmailResult } from "@/lib/resend";
import { logEmail } from "@/lib/email/log";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kithnode.vercel.app";

const client = API_KEY ? new Resend(API_KEY) : null;

export const SETUP_SUBJECT = "Welcome to KithNode — here's how to set up";

interface SetupStep {
  title: string;
  detail: string;
  href: string;
}

// The setup checklist. Mirrors the profile-completeness model (Identity /
// Targets via /onboarding) plus the core first-actions that turn a fresh
// account into a working pipeline. Order = the path of least friction.
const SETUP_STEPS: SetupStep[] = [
  {
    title: "Finish your profile",
    detail: "School, hometown, Greek org, education — this is what powers warm-path matching.",
    href: `${APP_URL}/onboarding`,
  },
  {
    title: "Set your targets",
    detail: "Industries, firms, locations, and your recruiting date so Discover knows what to surface.",
    href: `${APP_URL}/onboarding`,
  },
  {
    title: "Import your LinkedIn connections",
    detail: "Upload your connections export — this is the graph every warm path is found in.",
    href: `${APP_URL}/dashboard/import`,
  },
  {
    title: "Run Discover",
    detail: "Surface alumni and warm paths into your target firms, ranked by connection density.",
    href: `${APP_URL}/dashboard/discover`,
  },
  {
    title: "Draft your first outreach",
    detail: "Open a contact and generate a personalized, non-robotic intro you can actually send.",
    href: `${APP_URL}/dashboard/contacts`,
  },
  {
    title: "Tune your draft style",
    detail: "Set your tone, length, and signature so every draft sounds like you.",
    href: `${APP_URL}/dashboard/settings`,
  },
];

/** Escape user-controlled text before interpolating into the HTML template. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pure HTML builder — no I/O, fully unit-testable (mirrors weekly-digest). */
export function buildSetupEmailHtml(userName: string): string {
  const firstName = escapeHtml(userName.trim().split(" ")[0] || "there");

  const stepRows = SETUP_STEPS.map(
    (s, i) => `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #E2E8F0;">
            <span style="color: #0EA5E9;">${i + 1}.</span>
            <a href="${s.href}" style="color: #E2E8F0; text-decoration: none;">${s.title}</a>
          </div>
          <div style="font-family: Geist, Arial, sans-serif; font-size: 12px; color: #94A3B8; margin-top: 4px; line-height: 1.5;">
            ${s.detail}
          </div>
        </td>
      </tr>
    `,
  ).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0A1628; font-family: Geist, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A1628;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #0EA5E9;">
                WELCOME TO KITHNODE
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #E2E8F0;">
                Let's get you set up
              </div>
              <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #94A3B8; margin-top: 8px; line-height: 1.6;">
                Hey ${firstName} — Sam here, founder of KithNode. You're in. Here's everything to do to turn your account into a working recruiting pipeline. Takes about 10 minutes.
              </div>
            </td>
          </tr>

          <!-- Checklist card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(148,163,184,0.6);">
                      YOUR SETUP CHECKLIST
                    </div>
                  </td>
                </tr>
                ${stepRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0EA5E9; padding: 12px 32px;">
                    <a href="${APP_URL}/onboarding" style="font-family: Geist, Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FFFFFF; text-decoration: none;">
                      START SETUP
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 12px; color: #94A3B8; line-height: 1.6;">
                Stuck on anything? Just reply to this email — it comes straight to me.<br/>
                — Sam
              </div>
              <div style="font-family: Geist, Arial, sans-serif; font-size: 11px; color: #475569; line-height: 1.6; margin-top: 16px;">
                KithNode — Warm-path networking intelligence<br/>
                You're receiving this because you have an active KithNode account.
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

interface SetupEmailArgs {
  email: string;
  name: string;
  userId?: string;
}

/**
 * Send the welcome/setup email and record the outcome in EmailLog. Mirrors the
 * resend.ts send pattern: Resend returns { data, error } — an API-level error
 * does not throw, so check `error` explicitly; only transport faults throw.
 */
export async function sendSetupEmail({
  email,
  name,
  userId,
}: SetupEmailArgs): Promise<EmailResult> {
  if (!client) {
    console.warn("[setup-email] RESEND_API_KEY missing — skipping setup email");
    const result: EmailResult = { status: "skipped" };
    await logEmail({ toEmail: email, type: "setup", result, userId: userId ?? email, subject: SETUP_SUBJECT });
    return result;
  }

  let result: EmailResult;
  try {
    const { data, error } = await client.emails.send({
      from: `Sam from KithNode <${FROM}>`,
      to: email,
      replyTo: "samrigot31@gmail.com",
      subject: SETUP_SUBJECT,
      html: buildSetupEmailHtml(name),
    });
    if (error) {
      console.error("[setup-email] send failed", error);
      result = { status: "failed", error: error.message ?? String(error) };
    } else {
      result = { status: "sent", id: data?.id };
    }
  } catch (err) {
    console.error("[setup-email] send threw", err);
    result = {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await logEmail({ toEmail: email, type: "setup", result, userId: userId ?? email, subject: SETUP_SUBJECT });
  return result;
}
