import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: contacts, error } = await supabase
      .from("AlumniContact")
      .select("*")
      .order("warmthScore", { ascending: false });

    if (error) throw new Error(error.message);
    if (!contacts || contacts.length === 0) return NextResponse.json([]);

    // Transform Supabase data to match RankedContact interface
    const ranked = contacts.map((c, i) => ({
      id: i + 1,
      name: c.name || "",
      title: c.title || "",
      email: "",
      email_status: "unknown",
      linkedin_url: c.linkedInUrl || "",
      education: c.education || "",
      linkedin_location: c.location || "",
      why_now: c.affiliations
        ? c.affiliations.split(",").filter(Boolean).join(", ")
        : "",
      warm_path: c.university || "",
      company: {
        name: c.firmName || "",
        domain: "",
        website: "",
        location: c.location || "",
        industry_tags: [],
      },
      score: {
        fit_score: c.warmthScore || 0,
        signal_score: 0,
        engagement_score: 0,
        total_score: c.warmthScore || 0,
        tier: c.tier || "cold",
      },
    }));

    return NextResponse.json(ranked);
  } catch {
    return NextResponse.json([]);
  }
}
