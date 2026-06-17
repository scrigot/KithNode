import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendFollowupReminders } from "@/lib/email/followup-reminders";

/**
 * GET - Vercel Cron triggers this (Mon + Thu ~9am ET) to email each opted-in
 * user about leads overdue for follow-up. Guarded by CRON_SECRET; the cron sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically once the env var is set.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only users who haven't opted out. sendFollowupReminders itself no-ops when
  // a user has zero overdue leads, so no extra filtering is needed here.
  const { data: users, error } = await supabase
    .from("User")
    .select("id, email, name")
    .eq("followupEmailEnabled", true);

  if (error || !users) {
    console.error("[followups] failed to fetch users", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const result = await sendFollowupReminders(user.id, user.email, user.name);
    if (!result.success) failed++;
    else if (result.sent) sent++;
    else skipped++;
  }

  console.log(`[followups] cron complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);

  return NextResponse.json({ sent, skipped, failed, total: users.length });
}
