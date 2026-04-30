import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jyjpitagxtdzedtooedw.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anBpdGFneHRkemVkdG9vZWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDUyMDEsImV4cCI6MjA5MDgyMTIwMX0.nTUbvwcRnER0aGL0UPjgHw51SRAu0dxqQKcZvN68px4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server-only client that bypasses RLS via the service_role policy.
// NEVER import this from client components.
let _admin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for server-side writes that must bypass RLS",
    );
  }
  _admin = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
