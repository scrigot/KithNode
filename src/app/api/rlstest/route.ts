import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase-user";

// TEMPORARY Phase 4 verification endpoint — proves the mint->PostgREST->RLS
// round-trip on a PREVIEW deploy. Returns row COUNTS only (no PII), and 404s in
// production so it can never serve real data there. REMOVE before promoting.
export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const db = await getUserClient(uid, email);
  const pe = await db.from("PipelineEntry").select("*", { count: "exact", head: true });
  const ud = await db.from("UserDiscover").select("*", { count: "exact", head: true });
  return NextResponse.json({
    uid,
    pipelineEntry: pe.count ?? null,
    userDiscover: ud.count ?? null,
    peErr: pe.error?.message ?? null,
    udErr: ud.error?.message ?? null,
  });
}
