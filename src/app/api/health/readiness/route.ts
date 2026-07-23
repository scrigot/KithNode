import { NextResponse } from "next/server";
import { URL } from "node:url";
import { serverEnv } from "@/lib/env/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const EXPECTED_MIGRATION = "20260721200000";

function projectRef(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostMatch = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    const poolUserMatch = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]+)$/i);
    return hostMatch?.[1] || poolUserMatch?.[1] || (url.hostname === "127.0.0.1" || url.hostname === "localhost" ? "local" : null);
  } catch { return null; }
}

export async function GET() {
  const env = serverEnv();
  const checks: Record<string, { ready: boolean; detail: string }> = {};
  try {
    const requiredTables = ["AssistantConversation", "IntegrationConnection", "LinkedInProfile", "Opportunity", "ContactFieldProvenance", "ResearchDraft"];
    const results = await Promise.all(requiredTables.map((table) => supabase.from(table).select("id", { head: true, count: "exact" })));
    if (results.some((result) => result.error)) throw new Error("required table unavailable");
    checks.database = { ready: true, detail: "reachable" };
    checks.migrations = { ready: true, detail: EXPECTED_MIGRATION };
  } catch {
    checks.database = { ready: false, detail: "unreachable" };
    checks.migrations = { ready: false, detail: "required tables missing" };
  }
  checks.aiGateway = { ready: Boolean(env.AI_GATEWAY_API_KEY || env.ANTHROPIC_API_KEY), detail: env.AI_GATEWAY_API_KEY || env.ANTHROPIC_API_KEY ? "configured" : "missing" };
  checks.pdl = { ready: Boolean(env.PDL_API_KEY), detail: env.PDL_API_KEY ? "configured" : "missing" };
  checks.oauth = { ready: Boolean(env.AUTH_SECRET && (env.GOOGLE_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID)), detail: env.AUTH_SECRET && (env.GOOGLE_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID) ? "configured" : "missing" };
  checks.search = { ready: Boolean(env.BRAVE_SEARCH_API_KEY), detail: env.BRAVE_SEARCH_API_KEY ? "configured" : "optional" };

  const databaseRef = projectRef(env.DATABASE_URL);
  const directRef = projectRef(env.DIRECT_URL);
  const supabaseRef = projectRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const configuredRefs = [databaseRef, directRef, supabaseRef].filter(Boolean);
  const aligned = configuredRefs.length >= 2 && configuredRefs.every((ref) => ref === configuredRefs[0]);
  checks.projectAlignment = { ready: aligned, detail: aligned ? configuredRefs[0]! : "database and Supabase project references differ or are incomplete" };
  const appOrigin = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  checks.appOrigin = { ready: appOrigin === "http://localhost:3000" || /^https:\/\//.test(appOrigin), detail: appOrigin || "missing" };

  const required = ["database", "migrations", "aiGateway", "oauth", "projectAlignment", "appOrigin"];
  const ready = required.every((name) => checks[name].ready);
  return NextResponse.json({ ready, checkedAt: new Date().toISOString(), expectedMigration: EXPECTED_MIGRATION, checks }, { status: ready ? 200 : 503 });
}
