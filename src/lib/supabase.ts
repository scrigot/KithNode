import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerEnv } from "@/lib/env/server";

/**
 * Server-side Supabase client. Uses the SERVICE ROLE key so writes bypass RLS.
 * RLS still exists as defense-in-depth (denies anon + authenticated reads if
 * the anon key ever leaks); the application enforces userId scoping at the
 * route-handler layer (see Lane A auth lockdown).
 *
 * NEVER import this from a client component. Every caller in this repo is a
 * server route, server action, or server-only lib.
 */
let serviceClient: SupabaseClient | undefined;

function getServiceClient() {
  if (serviceClient) return serviceClient;
  const env = supabaseServerEnv();
  serviceClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/**
 * Lazily resolve the server client so build-time module discovery and unit
 * tests can import route modules without silently connecting to a hosted
 * project. The first real database operation requires explicit environment
 * configuration and fails closed when it is missing.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getServiceClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function resetSupabaseClientForTests() {
  serviceClient = undefined;
}
