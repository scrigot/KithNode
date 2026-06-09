import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * Pipeline ownership guard.
 *
 * CONTEXT: `supabase` uses the SERVICE ROLE key, which BYPASSES RLS. RLS is only
 * defense-in-depth for the anon key. The load-bearing protection for user-owned
 * rows is a `userId` filter applied at the route-handler layer on every query.
 * Forgetting that filter once = a cross-user IDOR (see commit 22d59e0). These
 * helpers make the filter impossible to forget for the user-owned pipeline tables.
 *
 * SCOPE: use for `Pipeline` and `PipelineEntry` only — tables whose rows belong to
 * exactly one user, keyed by `userId` (which holds the session EMAIL, not a uuid,
 * to stay consistent with the existing PipelineEntry rows). Do NOT use these for
 * `AlumniContact`: contacts are shared/importable and are scoped by contactId +
 * redacted for non-owners (see redact.ts), not filtered by userId.
 */

/** User-owned tables. Restricting the helpers to these prevents accidental misuse. */
export type UserScopedTable = "Pipeline" | "PipelineEntry";

/**
 * Resolve the current user's id (their email). Returns null when unauthenticated;
 * the caller returns 401. Kept as a thin wrapper so every pipeline route resolves
 * identity the same way.
 */
export async function requireUser(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

/**
 * SELECT scoped to the current user. Always appends `.eq("userId", userId)`.
 * Pass the columns you need (defaults to "*"). Returns the Supabase query builder
 * so callers can chain `.eq`, `.order`, `.in`, etc.
 */
export function scopedSelect(
  table: UserScopedTable,
  userId: string,
  columns = "*",
) {
  return supabase.from(table).select(columns).eq("userId", userId);
}

/**
 * INSERT scoped to the current user. Forces `userId` onto every row so an
 * inserted Pipeline/PipelineEntry can never be silently mis-owned.
 */
export function scopedInsert<T extends Record<string, unknown>>(
  table: UserScopedTable,
  userId: string,
  rows: T | T[],
) {
  const withOwner = Array.isArray(rows)
    ? rows.map((r) => ({ ...r, userId }))
    : { ...rows, userId };
  return supabase.from(table).insert(withOwner);
}

/**
 * UPDATE scoped to the current user. Always appends `.eq("userId", userId)` so an
 * update can never touch another user's row. Chain further `.eq(...)` to target a
 * specific id.
 */
export function scopedUpdate(
  table: UserScopedTable,
  userId: string,
  patch: Record<string, unknown>,
) {
  return supabase.from(table).update(patch).eq("userId", userId);
}

/**
 * DELETE scoped to the current user. Always appends `.eq("userId", userId)`.
 */
export function scopedDelete(table: UserScopedTable, userId: string) {
  return supabase.from(table).delete().eq("userId", userId);
}
