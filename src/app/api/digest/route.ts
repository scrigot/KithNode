import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";
import { sendWeeklyDigest } from "@/lib/email/weekly-digest";

/** POST - Send digest to the authenticated user (manual trigger / testing) */
export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId || userId === "anonymous") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("User")
      .select("email, name")
      .eq("email", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await sendWeeklyDigest(userId, user.email, user.name);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[digest] POST failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** GET - Vercel Cron triggers this every Monday at 9am ET to send to all users */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: users, error } = await supabase
    .from("User")
    .select("id, email, name");

  if (error || !users) {
    console.error("[digest] failed to fetch users", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }

  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const user of users) {
    const result = await sendWeeklyDigest(user.email, user.email, user.name);
    results.push({ email: user.email, ...result });
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[digest] cron complete: ${sent} sent, ${failed} failed`);

  return NextResponse.json({ sent, failed, total: users.length });
}
