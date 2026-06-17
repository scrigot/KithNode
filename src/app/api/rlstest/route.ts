import { NextRequest, NextResponse } from "next/server";
import { getUserClient, mintUserToken } from "@/lib/supabase-user";

// TEMPORARY Phase 4 verification — 404s in production, REMOVE before promote.
export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  const email = req.nextUrl.searchParams.get("email") ?? "";

  const db = await getUserClient(uid, email);
  const pe = await db.from("PipelineEntry").select("*", { count: "exact", head: true });

  // Raw PostgREST fetch to surface the real error body (supabase-js swallows it).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jyjpitagxtdzedtooedw.supabase.co";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const token = await mintUserToken(uid, email);
  const raw = await fetch(`${url}/rest/v1/PipelineEntry?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  const rawBody = await raw.text();

  return NextResponse.json({
    uid,
    pipelineEntry: pe.count,
    peErrStatus: pe.status ?? null,
    rawStatus: raw.status,
    rawBody: rawBody.slice(0, 400),
    tokenHeader: token.split(".")[0],
    anonPrefix: anon.slice(0, 6),
  });
}
