import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://kithnode.vercel.app";

const resend = API_KEY ? new Resend(API_KEY) : null;

function buildIntroEmailHtml(
  userName: string,
  intermediaryName: string,
  targetName: string,
  firmName: string,
  message: string,
): string {
  const firstName = intermediaryName.trim().split(" ")[0] || "there";

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
                KITHNODE INTRO REQUEST
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #E2E8F0;">
                ${userName} is asking for an intro
              </div>
              <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #94A3B8; margin-top: 8px;">
                Hey ${firstName}, ${userName} would like you to introduce them to ${targetName} at ${firmName}.
              </div>
            </td>
          </tr>

          <!-- Message card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(148,163,184,0.6);">
                      MESSAGE FROM ${userName.toUpperCase()}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #E2E8F0; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0EA5E9; padding: 12px 32px;">
                    <a href="${APP_URL}/dashboard" style="font-family: Geist, Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FFFFFF; text-decoration: none;">
                      VIEW ON KITHNODE
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 11px; color: #475569; line-height: 1.6;">
                KithNode - Warm-path networking intelligence<br/>
                You received this because ${userName} identified you as a mutual connection.
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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.email;
  const userName = session.user.name || session.user.email.split("@")[0];

  const body = await request.json();
  const {
    intermediaryName,
    intermediaryEmail,
    targetContactId,
    message,
  } = body as {
    intermediaryName: string;
    intermediaryEmail?: string;
    targetContactId: string;
    message: string;
  };

  if (!intermediaryName || !targetContactId || !message) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Look up target contact for the email subject
  const { data: target } = await supabase
    .from("AlumniContact")
    .select("name, title, firmName")
    .eq("id", targetContactId)
    .single();

  if (!target) {
    return NextResponse.json(
      { error: "Target contact not found" },
      { status: 404 },
    );
  }

  // Insert intro request record
  const { error: insertError } = await supabase
    .from("intro_requests")
    .insert({
      from_user_id: userId,
      intermediary_name: intermediaryName,
      intermediary_email: intermediaryEmail || null,
      target_contact_id: targetContactId,
      message,
      status: "pending",
    });

  if (insertError) {
    console.error("[intro] insert failed", insertError);
    return NextResponse.json(
      { error: "Failed to create intro request" },
      { status: 500 },
    );
  }

  // Send email if intermediary has an email
  let emailSent = false;
  if (intermediaryEmail && resend) {
    try {
      await resend.emails.send({
        from: `KithNode <${FROM}>`,
        to: intermediaryEmail,
        replyTo: session.user.email,
        subject: `KithNode: ${userName} wants an intro to ${target.name} at ${target.firmName}`,
        html: buildIntroEmailHtml(
          userName,
          intermediaryName,
          target.name,
          target.firmName,
          message,
        ),
      });
      emailSent = true;
    } catch (err) {
      console.error("[intro] email send failed", err);
    }
  }

  return NextResponse.json({
    success: true,
    emailSent,
    targetName: target.name,
    firmName: target.firmName,
  });
}
