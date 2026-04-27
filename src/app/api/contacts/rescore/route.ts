import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { detectAffiliations, computeWarmthScore } from "@/lib/linkedin-import";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  try {
    const prefs = await getUserPrefs(userId);

    const { data: contacts, error } = await supabase
      .from("AlumniContact")
      .select("*")
      .eq("importedByUserId", userId);

    if (error) throw new Error(error.message);
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ rescored: 0, total: 0 });
    }

    let rescored = 0;

    for (const c of contacts) {
      const meta = {
        name: c.name || "",
        education: c.education || "",
        location: c.location || "",
        experience: c.firmName || "",
        title: c.title || "",
        industry: c.industry || "",
        seniorityLevel: c.seniorityLevel || "",
      };

      const affiliations = detectAffiliations(meta, prefs);
      const { score, tier } = computeWarmthScore(affiliations);

      const { error: updateError } = await supabase
        .from("AlumniContact")
        .update({
          warmthScore: score,
          tier,
          affiliations: affiliations.map((a) => a.name).join(","),
        })
        .eq("id", c.id);

      if (!updateError) rescored++;
    }

    return NextResponse.json({ rescored, total: contacts.length });
  } catch {
    return NextResponse.json({ error: "Rescore failed" }, { status: 500 });
  }
}
