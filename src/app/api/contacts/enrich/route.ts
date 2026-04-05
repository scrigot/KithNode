import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  scrapeLinkedInMeta,
  detectAffiliations,
  computeWarmthScore,
} from "@/lib/linkedin-import";

const BATCH_LIMIT = 50;
const DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    // Fetch CSV-imported contacts missing education data that have a LinkedIn URL
    const { data: contacts, error } = await supabase
      .from("AlumniContact")
      .select("*")
      .eq("source", "linkedin_csv")
      .eq("education", "")
      .neq("linkedInUrl", "")
      .limit(BATCH_LIMIT);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ enriched: 0, total: 0, skipped: 0 });
    }

    let enriched = 0;
    let skipped = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      try {
        const meta = await scrapeLinkedInMeta(contact.linkedInUrl);

        // Skip if scrape returned no useful data
        if (!meta.education && !meta.location && !meta.title) {
          skipped++;
          if (i < contacts.length - 1) await delay(DELAY_MS);
          continue;
        }

        const affiliations = detectAffiliations(meta);
        const { score, tier } = computeWarmthScore(affiliations);

        const updates: Record<string, string | number> = {
          warmthScore: score,
          tier,
          affiliations: affiliations.map((a) => a.name).join(","),
        };

        // Only overwrite empty fields
        if (!contact.education && meta.education) {
          updates.education = meta.education;
        }
        if (!contact.location && meta.location) {
          updates.location = meta.location;
        }
        if (!contact.title && meta.title) {
          updates.title = meta.title;
        }

        const { error: updateError } = await supabase
          .from("AlumniContact")
          .update(updates)
          .eq("id", contact.id);

        if (updateError) {
          skipped++;
        } else {
          enriched++;
        }
      } catch {
        skipped++;
      }

      // Rate-limit delay between requests
      if (i < contacts.length - 1) {
        await delay(DELAY_MS);
      }
    }

    return NextResponse.json({
      enriched,
      total: contacts.length,
      skipped,
    });
  } catch {
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
