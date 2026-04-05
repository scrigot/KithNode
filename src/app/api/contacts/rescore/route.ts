import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";
import { detectAffiliations, computeWarmthScore } from "@/lib/linkedin-import";

export async function POST() {
  try {
    const userId = await getUserId();

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
      };

      const affiliations = detectAffiliations(meta);
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
