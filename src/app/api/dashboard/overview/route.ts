import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName } from "@/lib/redact";

interface RecentActivity {
  type: "rate" | "pipeline_add" | "pipeline_move";
  contactId: string;
  contactName: string;
  firmName: string;
  detail: string;
  timestamp: string;
}

interface OverdueContact {
  contactId: string;
  contactName: string;
  firmName: string;
  stage: string;
  days: number;
  isRedacted?: boolean;
}

interface TopUnrated {
  contactId: string;
  contactName: string;
  firmName: string;
  score: number;
  tier: string;
  hasWarmPath: boolean;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const { count: totalContacts } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true })
      .eq("importedByUserId", userId);

    const { count: highValue } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true })
      .eq("importedByUserId", userId)
      .in("tier", ["hot", "warm"]);

    const { data: scoreData } = await supabase
      .from("AlumniContact")
      .select("warmthScore")
      .eq("importedByUserId", userId);

    let avgWarmth = 0;
    if (scoreData && scoreData.length > 0) {
      const validScores = scoreData
        .map((c) => c.warmthScore)
        .filter((s): s is number => s !== null && s !== undefined && s > 0);
      if (validScores.length > 0) {
        avgWarmth = Math.round(
          validScores.reduce((sum, s) => sum + s, 0) / validScores.length,
        );
      }
    }

    const { data: pipelineEntries } = await supabase
      .from("PipelineEntry")
      .select("*")
      .eq("userId", userId)
      .order("addedAt", { ascending: false });

    const pipelineTotal = pipelineEntries?.length || 0;
    const pipelineByStage: Record<string, number> = {};
    for (const entry of pipelineEntries || []) {
      const stage = (entry.stage || "researched").toLowerCase();
      pipelineByStage[stage] = (pipelineByStage[stage] || 0) + 1;
    }

    // Response rate: responded + meeting_set / total
    const respondedCount =
      (pipelineByStage["responded"] || 0) + (pipelineByStage["meeting_set"] || 0);
    const responseRate =
      pipelineTotal > 0 ? Math.round((respondedCount / pipelineTotal) * 100) : 0;

    // Overdue list: pipeline entries >=7 days not in responded/meeting_set
    const overdueEntries = (pipelineEntries || []).filter((e) => {
      const stage = (e.stage || "researched").toLowerCase();
      if (stage === "responded" || stage === "meeting_set") return false;
      const days =
        (Date.now() - new Date(e.addedAt || Date.now()).getTime()) / 86_400_000;
      return days >= 7;
    });

    const remindersCount = overdueEntries.length;

    const topOverdueIds = overdueEntries
      .map((e) => ({
        id: e.contactId,
        stage: (e.stage || "researched").toLowerCase(),
        days: Math.floor(
          (Date.now() - new Date(e.addedAt || Date.now()).getTime()) /
            86_400_000,
        ),
      }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    let topOverdue: OverdueContact[] = [];
    if (topOverdueIds.length > 0) {
      const { data: overdueContacts } = await supabase
        .from("AlumniContact")
        .select("id, name, firmName, importedByUserId")
        .in(
          "id",
          topOverdueIds.map((e) => e.id),
        );
      topOverdue = topOverdueIds
        .map((e) => {
          const c = (overdueContacts || []).find((x) => x.id === e.id);
          if (!c) return null;
          // Pipeline entries can reference contacts another user imported (via Discover).
          // Redact PII for those.
          const isOwn = c.importedByUserId === userId;
          return {
            contactId: c.id,
            contactName: isOwn ? (c.name || "") : redactName(c.name || ""),
            firmName: c.firmName || "",
            stage: e.stage,
            days: e.days,
            ...(isOwn ? {} : { isRedacted: true }),
          };
        })
        .filter((x): x is OverdueContact => x !== null);
    }

    // Recent activity: last 5 rates + last 5 pipeline entries
    const { data: recentRatings } = await supabase
      .from("UserDiscover")
      .select("contactId, rating, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(5);

    const recentPipeline = (pipelineEntries || []).slice(0, 5);

    const activityContactIds = new Set<string>();
    for (const r of recentRatings || []) activityContactIds.add(r.contactId);
    for (const p of recentPipeline) activityContactIds.add(p.contactId);

    let activityContacts: Array<{ id: string; name: string; firmName: string }> = [];
    if (activityContactIds.size > 0) {
      const { data } = await supabase
        .from("AlumniContact")
        .select("id, name, firmName")
        .in("id", Array.from(activityContactIds));
      activityContacts = data || [];
    }

    const activity: RecentActivity[] = [];
    for (const r of recentRatings || []) {
      const c = activityContacts.find((x) => x.id === r.contactId);
      if (!c) continue;
      activity.push({
        type: "rate",
        contactId: c.id,
        contactName: c.name,
        firmName: c.firmName,
        detail: r.rating === "high_value" ? "rated high value" : "skipped",
        timestamp: r.createdAt || new Date().toISOString(),
      });
    }
    for (const p of recentPipeline) {
      const c = activityContacts.find((x) => x.id === p.contactId);
      if (!c) continue;
      activity.push({
        type: "pipeline_add",
        contactId: c.id,
        contactName: c.name,
        firmName: c.firmName,
        detail: `added to ${(p.stage || "researched").toLowerCase()}`,
        timestamp: p.addedAt || new Date().toISOString(),
      });
    }
    activity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const recentActivity = activity.slice(0, 8);

    // Top unrated by warmth
    const { data: ratedIds } = await supabase
      .from("UserDiscover")
      .select("contactId")
      .eq("userId", userId);
    const ratedSet = new Set((ratedIds || []).map((r) => r.contactId));

    const { data: unratedTop } = await supabase
      .from("AlumniContact")
      .select("id, name, firmName, warmthScore, tier")
      .eq("importedByUserId", userId)
      .order("warmthScore", { ascending: false })
      .limit(30);

    const topUnrated: TopUnrated[] = (unratedTop || [])
      .filter((c) => !ratedSet.has(c.id))
      .slice(0, 5)
      .map((c) => ({
        contactId: c.id,
        contactName: c.name || "",
        firmName: c.firmName || "",
        score: c.warmthScore || 0,
        tier: c.tier || "cold",
        hasWarmPath: false,
      }));

    const { data: userRow } = await supabase
      .from("User")
      .select("recruitingDate, weeklyGoalTarget, subscriptionStatus, subscriptionPlan, trialEndsAt, subscriptionEndsAt, stripeCustomerId")
      .eq("email", userId)
      .maybeSingle();

    const recruitingDate: string | null = userRow?.recruitingDate ?? null;
    const weeklyGoalTarget: number = userRow?.weeklyGoalTarget ?? 3;
    let subscriptionStatus: string = userRow?.subscriptionStatus ?? "trial";
    const subscriptionPlan: string | null = userRow?.subscriptionPlan ?? null;
    let trialEndsAt: string | null = userRow?.trialEndsAt ?? null;
    const subscriptionEndsAt: string | null = userRow?.subscriptionEndsAt ?? null;
    const hasStripeCustomer = !!userRow?.stripeCustomerId;

    // Bootstrap trial for users created before the trial-defaults rollout.
    // Idempotent: only writes when both fields are missing.
    if (!userRow?.subscriptionStatus && !userRow?.trialEndsAt) {
      const newTrialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("User")
        .update({ subscriptionStatus: "trial", trialEndsAt: newTrialEndsAt })
        .eq("email", userId);
      subscriptionStatus = "trial";
      trialEndsAt = newTrialEndsAt;
    }

    let trialDaysLeft: number | null = null;
    if (subscriptionStatus === "trial" && trialEndsAt) {
      const diff = new Date(trialEndsAt).getTime() - Date.now();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    let daysUntilRecruiting: number | null = null;
    if (recruitingDate) {
      const diff = new Date(recruitingDate).getTime() - Date.now();
      daysUntilRecruiting = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const { count: weeklyGoalDone } = await supabase
      .from("PipelineEntry")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .in("stage", ["EMAIL_SENT", "FOLLOW_UP", "RESPONDED", "MEETING_SET"])
      .gte("addedAt", weekStart.toISOString());

    let referralCount = 0;
    const { data: waitlistRow } = await supabase
      .from("waitlist_signups")
      .select("ref_code")
      .eq("email", userId)
      .single();

    if (waitlistRow?.ref_code) {
      const { count: refCount } = await supabase
        .from("waitlist_signups")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", waitlistRow.ref_code);
      referralCount = refCount || 0;
    }

    return NextResponse.json({
      ratings: { high_value: highValue || 0, total: totalContacts || 0 },
      stats: {
        companies: 0,
        contacts: totalContacts || 0,
        scored: totalContacts || 0,
      },
      avg_warmth: avgWarmth,
      pipeline_total: pipelineTotal,
      pipeline_by_stage: pipelineByStage,
      response_rate: responseRate,
      reminders_count: remindersCount,
      top_overdue: topOverdue,
      top_unrated: topUnrated,
      recent_activity: recentActivity,
      recruiting_date: recruitingDate,
      days_until_recruiting: daysUntilRecruiting,
      weekly_goal_done: weeklyGoalDone || 0,
      weekly_goal_target: weeklyGoalTarget,
      subscription_status: subscriptionStatus,
      subscription_plan: subscriptionPlan,
      subscription_ends_at: subscriptionEndsAt,
      trial_ends_at: trialEndsAt,
      has_stripe_customer: hasStripeCustomer,
      trial_days_left: trialDaysLeft,
      referral_count: referralCount,
    });
  } catch {
    return NextResponse.json({
      ratings: { high_value: 0, total: 0 },
      stats: { companies: 0, contacts: 0, scored: 0 },
      avg_warmth: 0,
      pipeline_total: 0,
      pipeline_by_stage: {},
      response_rate: 0,
      reminders_count: 0,
      top_overdue: [],
      top_unrated: [],
      recent_activity: [],
    });
  }
}
