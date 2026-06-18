/**
 * Manually send the welcome/setup email to a user.
 *
 * Usage:
 *   npm run email:setup -- <email>
 *
 * Looks up the user's name (falls back to the email local-part), sends via
 * Resend, and records the send in EmailLog (same path as the auto-send on
 * first sign-in). Safe to re-run for resends.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run email:setup -- <email>");
    process.exit(1);
  }

  const { supabase } = await import("@/lib/supabase");
  const { sendSetupEmail } = await import("@/lib/email/setup-email");

  const { data: user, error } = await supabase
    .from("User")
    .select("email, name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error(`[email:setup] User lookup failed for ${email}:`, error.message);
    process.exit(1);
  }

  if (!user) {
    console.warn(`[email:setup] no User row for ${email} — sending anyway (they may not have signed in yet).`);
  }

  const name = user?.name?.trim() || email.split("@")[0];
  const result = await sendSetupEmail({ email, name, userId: user?.email ?? email });

  const suffix =
    (result.id ? ` (id ${result.id})` : "") + (result.error ? ` — ${result.error}` : "");
  console.log(`[email:setup] -> ${email}: ${result.status}${suffix}`);
  process.exit(result.status === "failed" ? 1 : 0);
}

main().catch((err) => {
  console.error("[email:setup] fatal", err);
  process.exit(1);
});
