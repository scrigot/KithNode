import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
      // Scrape LinkedIn profile meta tags
      const meta = await scrapeLinkedInMeta(url);

      // Detect affiliations
      const affiliations = detectAffiliations(meta);

      // Compute warmth score
      const { score, tier } = computeWarmthScore(affiliations);

      // Upsert into database
      const contact = await prisma.alumniContact.upsert({
        where: { linkedInUrl: url },
        update: {
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
        },
        create: {
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
        },
      });

      results.push({
        name: contact.name,
        title: contact.title,
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

  return NextResponse.json({ imported, failed, contacts: results });
}
