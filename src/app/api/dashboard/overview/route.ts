import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";

export async function GET() {
  try {
    const userId = await getUserId();

    // Total contacts (this user's only)
    const { count: totalContacts } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true })
      .eq("importedByUserId", userId);

    // High-value (hot + warm tier) contacts
    const { count: highValue } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true })
      .eq("importedByUserId", userId)
      .in("tier", ["hot", "warm"]);

    // Average warmth score
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

    // Pipeline counts
    const { data: pipelineEntries } = await supabase
      .from("PipelineEntry")
      .select("stage");

    const pipelineTotal = pipelineEntries?.length || 0;
    const pipelineByStage: Record<string, number> = {};
    for (const entry of pipelineEntries || []) {
      const stage = (entry.stage || "researched").toLowerCase();
      pipelineByStage[stage] = (pipelineByStage[stage] || 0) + 1;
    }

    // Reminders / action needed (pipeline contacts older than 7 days without stage change)
    const { count: remindersCount } = await supabase
      .from("PipelineEntry")
      .select("*", { count: "exact", head: true })
      .lt("updatedAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

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
      reminders_count: remindersCount || 0,
    });
  } catch {
    return NextResponse.json({
      ratings: { high_value: 0, total: 0 },
      stats: { companies: 0, contacts: 0, scored: 0 },
      avg_warmth: 0,
      pipeline_total: 0,
      pipeline_by_stage: {},
      reminders_count: 0,
    });
  }
}
