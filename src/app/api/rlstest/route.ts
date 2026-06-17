import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase-user";

// TEMPORARY Phase 4 verification — counts only, 404s in production, REMOVE before promote.
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
    pipelineEntry: pe.count,
    userDiscover: ud.count,
    peErr: pe.error ? { message: pe.error.message, code: (pe.error as { code?: string }).code, details: (pe.error as { details?: string }).details, hint: (pe.error as { hint?: string }).hint, status: pe.status } : null,
    udErr: ud.error ? { message: ud.error.message, code: (ud.error as { code?: string }).code, status: ud.status } : null,
  });
}
