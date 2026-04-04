import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  scrapeLinkedInMeta,
  detectAffiliations,
  computeWarmthScore,
  isValidLinkedInUrl,
} from "@/lib/linkedin-import";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json({ error: "urls array is required" }, { status: 400 });
  }

  const results: {
    name: string;
    title: string;
    linkedin_url: string;
    company_name: string;
    affiliations: string[];
    total_score: number;
    tier: string;
    error?: string;
  }[] = [];

  let imported = 0;
  let failed = 0;

  for (const url of body.urls) {
    if (!isValidLinkedInUrl(url)) {
      results.push({
        name: "", title: "", linkedin_url: url, company_name: "",
        affiliations: [], total_score: 0, tier: "cold",
        error: "Invalid LinkedIn URL format",
      });
      failed++;
      continue;
    }

    try {
      const meta = await scrapeLinkedInMeta(url);
      const affiliations = detectAffiliations(meta);
      const { score, tier } = computeWarmthScore(affiliations);

      // Check if contact already exists
      const { data: existing } = await supabase
        .from("AlumniContact")
        .select("id")
        .eq("linkedInUrl", url)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("AlumniContact")
          .update({
            name: meta.name,
            title: meta.title,
            firmName: meta.experience,
            university: meta.education,
            education: meta.education,
            location: meta.location,
            affiliations: affiliations.map((a) => a.name).join(","),
            warmthScore: score,
            tier,
            source: "linkedin_import",
          })
          .eq("id", existing.id);
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from("AlumniContact")
          .insert({
            name: meta.name,
            title: meta.title,
            firmName: meta.experience,
            linkedInUrl: url,
            university: meta.education,
            graduationYear: 0,
            education: meta.education,
            location: meta.location,
            affiliations: affiliations.map((a) => a.name).join(","),
            warmthScore: score,
            tier,
            source: "linkedin_import",
          });

        if (insertError) throw new Error(insertError.message);
      }

      results.push({
        name: meta.name,
        title: meta.title,
        linkedin_url: url,
        company_name: meta.experience,
        affiliations: affiliations.map((a) => a.name),
        total_score: score,
        tier,
      });
      imported++;
    } catch (err) {
      results.push({
        name: "", title: "", linkedin_url: url, company_name: "",
        affiliations: [], total_score: 0, tier: "cold",
        error: err instanceof Error ? err.message : "Import failed",
      });
      failed++;
    }
  }

  return NextResponse.json({ imported, failed, contacts: results });
}
