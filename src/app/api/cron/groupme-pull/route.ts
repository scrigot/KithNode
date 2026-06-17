import { NextResponse } from "next/server";
import { pullBetaFeedback } from "@/lib/groupme";

export const runtime = "nodejs";

/**
 * GET - Vercel Cron triggers this daily to pull new messages from the beta
 * GroupMe into `beta_feedback`. Guarded by CRON_SECRET exactly like the digest /
 * follow-up crons; the cron sends `Authorization: Bearer ${CRON_SECRET}`
 * automatically once the env var is set. Read-only against GroupMe (no posting).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pullBetaFeedback();
    console.log(
      `[groupme-pull] group=${result.groupId} fetched=${result.fetched} inserted=${result.inserted}`,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[groupme-pull] failed:", message);
    return NextResponse.json(
      { error: "GroupMe pull failed", message },
      { status: 500 },
    );
  }
}
