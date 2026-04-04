import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  scrapeLinkedInMeta,
  detectAffiliations,
  computeWarmthScore,
  isValidLinkedInUrl,
} from "@/lib/linkedin-import";

interface CsvContact {
  name: string;
  title: string;
  firmName: string;
  email: string;
  education: string;
  location: string;
  linkedInUrl?: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const hasUrls = body.urls && Array.isArray(body.urls) && body.urls.length > 0;
  const hasContacts = body.contacts && Array.isArray(body.contacts) && body.contacts.length > 0;

  if (!hasUrls && !hasContacts) {
    return NextResponse.json(
      { error: "urls array or contacts array is required" },
      { status: 400 },
    );
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

  // ── CSV contacts (direct upsert, no scraping) ────────────────────────
  if (hasContacts) {
    for (const contact of body.contacts as CsvContact[]) {
      try {
        const meta = {
          name: contact.name || "",
          education: contact.education || "",
          location: contact.location || "",
          experience: contact.firmName || "",
          title: contact.title || "",
        };

        const affiliations = detectAffiliations(meta);
        const { score, tier } = computeWarmthScore(affiliations);
        const linkedInUrl = contact.linkedInUrl || "";

        // Check if contact already exists by name or linkedInUrl
        let existing = null;
        if (linkedInUrl) {
          const { data } = await supabase
            .from("AlumniContact")
            .select("id")
            .eq("linkedInUrl", linkedInUrl)
            .single();
          existing = data;
        }
        if (!existing && contact.email) {
          const { data } = await supabase
            .from("AlumniContact")
            .select("id")
            .eq("email", contact.email)
            .single();
          existing = data;
        }

        const record = {
          name: meta.name,
          title: meta.title,
          firmName: meta.experience,
          email: contact.email || "",
          linkedInUrl,
          university: meta.education,
          education: meta.education,
          location: meta.location,
          affiliations: affiliations.map((a) => a.name).join(","),
          warmthScore: score,
          tier,
          source: "linkedin_csv",
        };

        if (existing) {
          await supabase
            .from("AlumniContact")
            .update(record)
            .eq("id", existing.id);
        } else {
          const { error: insertError } = await supabase
            .from("AlumniContact")
            .insert({ ...record, graduationYear: 0 });

          if (insertError) throw new Error(insertError.message);
        }

        results.push({
          name: meta.name,
          title: meta.title,
          linkedin_url: linkedInUrl,
          company_name: meta.experience,
          affiliations: affiliations.map((a) => a.name),
          total_score: score,
          tier,
        });
        imported++;
      } catch (err) {
        results.push({
          name: contact.name || "",
          title: "",
          linkedin_url: "",
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
          error: err instanceof Error ? err.message : "Import failed",
        });
        failed++;
      }
    }
  }

  // ── URL-based import (existing scraping flow) ─────────────────────────
  if (hasUrls) {
    for (const url of body.urls) {
      if (!isValidLinkedInUrl(url)) {
        results.push({
          name: "",
          title: "",
          linkedin_url: url,
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
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
          name: "",
          title: "",
          linkedin_url: url,
          company_name: "",
          affiliations: [],
          total_score: 0,
          tier: "cold",
          error: err instanceof Error ? err.message : "Import failed",
        });
        failed++;
      }
    }
  }

  return NextResponse.json({ imported, failed, contacts: results });
}
