import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { normalizeFirmName } from "@/lib/normalize-firm";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kithnode.vercel.app";

const client = API_KEY ? new Resend(API_KEY) : null;

interface DigestContact {
  name: string;
  firmName: string;
  title: string;
  affiliations: string | null;
}

interface FirmGroup {
  firm: string;
  contacts: DigestContact[];
}

function groupByFirm(contacts: DigestContact[]): FirmGroup[] {
  const map = new Map<string, DigestContact[]>();

  for (const c of contacts) {
    const key = normalizeFirmName(c.firmName) || c.firmName || "Unknown";
    const list = map.get(key) || [];
    list.push(c);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([firm, contacts]) => ({
      firm: contacts[0].firmName || firm,
      contacts,
    }))
    .sort((a, b) => b.contacts.length - a.contacts.length);
}

function buildChainText(c: DigestContact): string {
  const affiliation = c.affiliations?.split(",")[0]?.trim() || "Connection";
  return `Via ${c.name} (${affiliation}) - ${c.title} at ${c.firmName}`;
}

function buildEmailHtml(
  userName: string,
  firms: FirmGroup[],
  totalNew: number,
): string {
  const hasResults = totalNew > 0;

  const firmRows = firms
    .slice(0, 10)
    .map(
      (g) => `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #E2E8F0; margin-bottom: 8px;">
            ${g.firm}
            <span style="font-size: 11px; font-weight: 400; color: #64748B; margin-left: 8px;">${g.contacts.length} path${g.contacts.length > 1 ? "s" : ""}</span>
          </div>
          ${g.contacts
            .slice(0, 3)
            .map(
              (c) => `
            <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #0EA5E9; margin-top: 4px; line-height: 1.5;">
              ${buildChainText(c)}
            </div>
          `,
            )
            .join("")}
          ${g.contacts.length > 3 ? `<div style="font-family: Geist, Arial, sans-serif; font-size: 11px; color: #64748B; margin-top: 4px;">+${g.contacts.length - 3} more</div>` : ""}
        </td>
      </tr>
    `,
    )
    .join("");

  const emptyState = `
    <tr>
      <td style="padding: 32px 20px; text-align: center;">
        <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #94A3B8; line-height: 1.6;">
          No new warm paths this week.<br/>
          Import more connections to discover new paths.
        </div>
      </td>
    </tr>
  `;

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
                KITHNODE WEEKLY DIGEST
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 0 24px 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #E2E8F0;">
                ${hasResults ? `${totalNew} new warm path${totalNew > 1 ? "s" : ""} this week` : "Weekly update"}
              </div>
              <div style="font-family: Geist, Arial, sans-serif; font-size: 14px; color: #94A3B8; margin-top: 8px;">
                Hey ${userName.split(" ")[0] || "there"}, here's your weekly networking intelligence.
              </div>
            </td>
          </tr>

          <!-- Results card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-family: Geist, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(148,163,184,0.6);">
                      ${hasResults ? "RANKED BY CONNECTION DENSITY" : "STATUS"}
                    </div>
                  </td>
                </tr>
                ${hasResults ? firmRows : emptyState}
              </table>
            </td>
          </tr>

          ${
            firms.length > 10
              ? `
          <tr>
            <td style="padding: 12px 0 0 0;">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 12px; color: #64748B;">
                +${firms.length - 10} more firms with new paths
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- CTA -->
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

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="font-family: Geist, Arial, sans-serif; font-size: 11px; color: #475569; line-height: 1.6;">
                KithNode - Warm-path networking intelligence<br/>
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

export async function sendWeeklyDigest(
  userId: string,
  email: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.warn("[digest] RESEND_API_KEY missing - skipping digest email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: contacts, error: queryError } = await supabase
    .from("AlumniContact")
    .select("name, firmName, title, affiliations")
    .eq("importedByUserId", userId)
    .gte("createdAt", sevenDaysAgo.toISOString())
    .order("createdAt", { ascending: false })
    .limit(200);

  if (queryError) {
    console.error("[digest] query failed", queryError);
    return { success: false, error: queryError.message };
  }

  const newContacts: DigestContact[] = contacts || [];
  const firms = groupByFirm(newContacts);

  const subject =
    newContacts.length > 0
      ? `KithNode: ${newContacts.length} new warm paths this week`
      : "KithNode: Your weekly digest";

  try {
    await client.emails.send({
      from: `KithNode <${FROM}>`,
      to: email,
      replyTo: "samrigot31@gmail.com",
      subject,
      html: buildEmailHtml(userName, firms, newContacts.length),
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[digest] send failed", err);
    return { success: false, error: message };
  }
}
