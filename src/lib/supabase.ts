import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Uses the SERVICE ROLE key so writes bypass RLS.
 * RLS still exists as defense-in-depth (denies anon + authenticated reads if
 * the anon key ever leaks); the application enforces userId scoping at the
 * route-handler layer (see Lane A auth lockdown).
 *
 * NEVER import this from a client component. Every caller in this repo is a
 * server route, server action, or server-only lib.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jyjpitagxtdzedtooedw.supabase.co";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Server-side writes will fail under RLS.",
  );
}

export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
