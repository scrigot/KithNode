"use server";

/**
 * Tasks tile write path for the founder-ops cockpit (/dashboard/ops).
 *
 * SECURITY: server actions are publicly invocable RPC endpoints. EVERY action
 * MUST re-check isFounder(await auth()) — the sidebar/page gates are UX only.
 * A non-founder calling these directly gets { ok: false }. Mirrors the typed
 * result + service-role insert pattern in src/app/waitlist/actions.ts.
 *
 * The client refetches /api/ops/overview after a mutation (no revalidatePath —
 * the cockpit reads client-side via apiFetch).
 */

import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { supabase } from "@/lib/supabase";

export type OpsTaskResult = { ok: true } | { ok: false; error: string };

export async function addOpsTask(title: string): Promise<OpsTaskResult> {
  const session = await auth();
  if (!isFounder(session)) return { ok: false, error: "Forbidden" };

  const t = title.trim();
  if (!t) return { ok: false, error: "Empty title" };

  const { error } = await supabase.from("ops_tasks").insert({ title: t });
  if (error) return { ok: false, error: "Insert failed" };
  return { ok: true };
}

export async function toggleOpsTask(
  id: string,
  done: boolean,
): Promise<OpsTaskResult> {
  const session = await auth();
  if (!isFounder(session)) return { ok: false, error: "Forbidden" };

  const { error } = await supabase.from("ops_tasks").update({ done }).eq("id", id);
  if (error) return { ok: false, error: "Update failed" };
  return { ok: true };
}
