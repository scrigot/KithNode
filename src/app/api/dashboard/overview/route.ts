import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { count: totalContacts } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true });

    const { count: highValue } = await supabase
      .from("AlumniContact")
      .select("*", { count: "exact", head: true })
      .in("tier", ["hot", "warm"]);

    return NextResponse.json({
      ratings: { high_value: highValue || 0, total: totalContacts || 0 },
      stats: { companies: 0, contacts: totalContacts || 0, scored: totalContacts || 0 },
      pipeline_total: 0,
      pipeline_by_stage: {},
      reminders_count: 0,
      recent_activity: [],
    });
  } catch {
    return NextResponse.json({
      ratings: { high_value: 0, total: 0 },
      stats: { companies: 0, contacts: 0, scored: 0 },
      pipeline_total: 0,
      pipeline_by_stage: {},
      reminders_count: 0,
      recent_activity: [],
    });
  }
}
