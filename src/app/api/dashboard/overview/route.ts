import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";
import { selectOverdueLeads } from "@/lib/leads/overdue";

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
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

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

    // Overdue leads: >=7 days, not responded/meeting_set. Shared with the
    // follow-up reminder email via selectOverdueLeads so they never disagree.
    const overdueLeads = selectOverdueLeads(pipelineEntries || [], Date.now());
    const remindersCount = overdueLeads.length;
    const topOverdueIds = overdueLeads
      .slice(0, 5)
      .map((e) => ({ id: e.contactId, stage: e.stage, days: e.days }));

    let topOverdue: OverdueContact[] = [];
    if (topOverdueIds.length > 0) {
      const [{ data: overdueContacts }, { data: overdueDiscovers }] =
        await Promise.all([
          supabase
            .from("AlumniContact")
            .select("id, name, firmName, importedByUserId")
            .in(
              "id",
              topOverdueIds.map((e) => e.id),
            ),
          supabase
            .from("UserDiscover")
            .select("contactId, rating")
            .eq("userId", userId)
            .in(
              "contactId",
              topOverdueIds.map((e) => e.id),
            ),
        ]);

      const overdueHighValueIds = new Set<string>(
        (overdueDiscovers || [])
          .filter((d) => d.rating === "high_value")
          .map((d) => d.contactId),
      );

      topOverdue = topOverdueIds
        .map((e) => {
          const c = (overdueContacts || []).find((x) => x.id === e.id);
          if (!c) return null;
          // Redact PII only when not unlocked (own or high_value-rated).
          const unlocked = isUnlocked(c.importedByUserId, userId, overdueHighValueIds, c.id);
          return {
            contactId: c.id,
            contactName: unlocked ? (c.name || "") : redactName(c.name || ""),
            firmName: c.firmName || "",
            stage: e.stage,
            days: e.days,
            ...(unlocked ? {} : { isRedacted: true }),
          };
        })
        .filter((x): x is OverdueContact => x !== null);
    }

    // Tier distribution + top firms (single fetch for efficiency)
    const { data: allTieredContacts } = await supabase
      .from("AlumniContact")
      .select("tier, firmName")
      .eq("importedByUserId", userId);

    const tierCounts = { hot: 0, warm: 0, monitor: 0, cold: 0 };
    const firmMap = new Map<string, { count: number; hotCount: number }>();
    for (const c of allTieredContacts || []) {
      const tier = (c.tier || "cold").toLowerCase();
      if (tier === "hot") tierCounts.hot++;
      else if (tier === "warm") tierCounts.warm++;
      else if (tier === "monitor") tierCounts.monitor++;
      else tierCounts.cold++;

      const firm = (c.firmName || "").trim();
      if (!firm) continue;
      const cur = firmMap.get(firm) || { count: 0, hotCount: 0 };
      cur.count++;
      if (tier === "hot") cur.hotCount++;
      firmMap.set(firm, cur);
    }
    const topFirms = Array.from(firmMap.entries())
      .map(([firmName, v]) => ({ firmName, count: v.count, hotCount: v.hotCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

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
    const recentActivity = activity.slice(0, 12);

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
      .eq("email", userEmail)
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
        .eq("email", userEmail);
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

    const { data: opportunities = [] } = await supabase
      .from("Opportunity")
      .select("id,company,role,status,deadline,nextAction,nextActionDue,updatedAt")
      .eq("userId", userId)
      .neq("status", "archived")
      .order("updatedAt", { ascending: false })
      .limit(300);
    const terminalStatuses = new Set(["accepted", "rejected", "withdrawn"]);
    const activeApplications = (opportunities || []).filter((item) => !terminalStatuses.has(item.status)).length;
    const twoWeeksFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const applicationDeadlines = (opportunities || []).filter((item) => {
      if (!item.deadline) return false;
      const timestamp = new Date(item.deadline).getTime();
      return timestamp >= Date.now() && timestamp <= twoWeeksFromNow;
    }).length;
    const interviews = (opportunities || []).filter((item) => item.status === "interview").length;
    const offers = (opportunities || []).filter((item) => item.status === "offer" || item.status === "accepted").length;
    const overdueApplication = (opportunities || [])
      .filter((item) => item.nextAction && item.nextActionDue && new Date(item.nextActionDue).getTime() < Date.now())
      .sort((a, b) => new Date(a.nextActionDue).getTime() - new Date(b.nextActionDue).getTime())[0];
    const urgentDeadline = (opportunities || [])
      .filter((item) => item.deadline && new Date(item.deadline).getTime() >= Date.now())
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
    const doNow = overdueApplication
      ? { kind: "application_action", title: overdueApplication.nextAction, detail: `${overdueApplication.role} at ${overdueApplication.company} is overdue.`, href: `/dashboard/applications?opportunity=${encodeURIComponent(overdueApplication.id)}` }
      : urgentDeadline
        ? { kind: "application_deadline", title: `Advance ${urgentDeadline.company}`, detail: `${urgentDeadline.role} has the nearest application deadline.`, href: `/dashboard/applications?opportunity=${encodeURIComponent(urgentDeadline.id)}` }
        : topOverdue[0]
          ? { kind: "relationship_follow_up", title: `Follow up with ${topOverdue[0].contactName}`, detail: `${topOverdue[0].days} days since the last ${topOverdue[0].stage.toLowerCase()} action.`, href: "/dashboard/contacts" }
          : activeApplications === 0
            ? { kind: "find_jobs", title: "Find five matching roles", detail: "Start with official listings scored against your profile and network.", href: "/dashboard/assistant?skill=find-jobs" }
            : { kind: "network", title: "Strengthen your next warm path", detail: "Review the three highest-value relationship actions below.", href: "/dashboard/contacts" };

    let referralCount = 0;
    const { data: waitlistRow } = await supabase
      .from("waitlist_signups")
      .select("ref_code")
      .eq("email", userEmail)
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
      tier_counts: tierCounts,
      top_firms: topFirms,
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
      application_metrics: {
        active: activeApplications,
        deadlines_14d: applicationDeadlines,
        interviews,
        offers,
        offer_conversion: activeApplications > 0 ? Math.round((offers / activeApplications) * 100) : 0,
      },
      do_now: doNow,
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
      tier_counts: { hot: 0, warm: 0, monitor: 0, cold: 0 },
      top_firms: [],
      application_metrics: { active: 0, deadlines_14d: 0, interviews: 0, offers: 0, offer_conversion: 0 },
      do_now: { kind: "recovery", title: "Review your recruiting workspace", detail: "Core actions remain available while live metrics recover.", href: "/dashboard/applications" },
    });
  }
}
