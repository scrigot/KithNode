import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

/**
 * Per-request, USER-SCOPED Supabase client. Mints a short-lived HS256 JWT
 * (signed with SUPABASE_JWT_SECRET — the same secret GoTrue/PostgREST verify
 * with) carrying:
 *   - sub  = the user's stable User.id (UUID)  -> auth.uid() in RLS
 *   - email = the user's email                 -> auth.email() in RLS
 *   - role = "authenticated"                   -> the `TO authenticated` policies apply
 *
 * Unlike `supabase` (service role, bypasses RLS — see ./supabase.ts), queries
 * through this client are constrained by RLS at the database. Use it for
 * user-scoped reads/writes so a forgotten `.eq("userId", …)` filter can no
 * longer leak or cross-write another tenant's rows.
 *
 * Keep `supabase` (service role) for genuinely cross-tenant work: the shared
 * AlumniContact pool (scoped by the redact projection, see ./redact.ts), cron
 * jobs, Stripe webhooks, and seeding.
 *
 * Server-only. Never import from a client component.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jyjpitagxtdzedtooedw.supabase.co";

// Modern PUBLISHABLE key (sb_publishable_...) — public by design, safe to embed.
// The project migrated to the new key system, so the legacy JWT anon key is no
// longer a valid apikey ("Invalid API key"). The publishable key is the apikey;
// the per-request bearer JWT (mintUserToken) sets the authenticated identity.
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_g64OolfrbPfZLtVWzDDidA_Him0Uq8S";

export async function mintUserToken(userId: string, email: string): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not configured");
  return new SignJWT({ role: "authenticated", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

/**
 * Returns a Supabase client whose every request authenticates as `userId`
 * (RLS-enforced). `email` is included so policies on the email-keyed raw tables
 * (contact_tags, UsageEvent, feedback_response, …) keep working via auth.email().
 */
export async function getUserClient(
  userId: string,
  email: string,
): Promise<SupabaseClient> {
  const token = await mintUserToken(userId, email);
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
