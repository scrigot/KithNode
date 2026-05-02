import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { detectAffiliations, computeWarmthScore } from "@/lib/linkedin-import";
import { requireSubscription } from "@/lib/subscription";

const BATCH_LIMIT = 25;

interface EnrichedFields {
  industry: string;
  seniorityLevel: string;
  education: string;
  location: string;
}

const ALLOWED_INDUSTRIES = [
  "Investment Banking",
  "Private Equity",
  "Consulting",
  "Hedge Fund",
  "Venture Capital",
  "Corporate Finance",
  "Asset Management",
  "Other",
];

const ALLOWED_SENIORITY = ["Incoming", "Analyst", "Associate", "VP", "Senior"];

function buildPrompt(c: { name: string; title: string; firmName: string }): string {
  return `You are an enrichment engine for a finance-recruiting CRM. Given a contact's name, company, and current title, infer the most likely INDUSTRY, SENIORITY, probable UNIVERSITY (only if the name/company strongly suggests one, otherwise ""), and LOCATION (company HQ city if unknown).

Contact:
- Name: ${c.name}
- Company: ${c.firmName}
- Title: ${c.title}

Allowed INDUSTRY values (pick exactly one): ${ALLOWED_INDUSTRIES.map((s) => `"${s}"`).join(", ")}.
Allowed SENIORITY values (pick exactly one): ${ALLOWED_SENIORITY.map((s) => `"${s}"`).join(", ")}.

Return ONLY valid JSON, no prose, no markdown:
{"industry":"...","seniorityLevel":"...","education":"...","location":"..."}`;
}

async function enrichOne(contact: {
  name: string;
  title: string;
  firmName: string;
}): Promise<EnrichedFields | null> {
  try {
    const { text } = await generateText({
      model: gateway("anthropic/claude-sonnet-4.5"),
      prompt: buildPrompt(contact),
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("enrichOne: no JSON in model output", {
        name: contact.name,
        sample: text.slice(0, 200),
      });
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      industry: ALLOWED_INDUSTRIES.includes(String(parsed.industry || ""))
        ? String(parsed.industry)
        : "",
      seniorityLevel: ALLOWED_SENIORITY.includes(String(parsed.seniorityLevel || ""))
        ? String(parsed.seniorityLevel)
        : "",
      education: String(parsed.education || ""),
      location: String(parsed.location || ""),
    };
  } catch (err) {
    console.error("enrichOne: gateway call failed", {
      name: contact.name,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const gate = await requireSubscription(userId);
  if (gate) return gate;

  try {
    const body = await req.json().catch(() => ({}));
    const contactId: string | undefined = body.contactId;

    const prefs = await getUserPrefs(userId);

    // Fetch candidates: single contact OR the user's batch of unenriched rows
    let query = supabase
      .from("AlumniContact")
      .select("*")
      .eq("importedByUserId", userId);

    if (contactId) {
      query = query.eq("id", contactId);
    } else {
      query = query.is("enrichedAt", null).limit(BATCH_LIMIT);
    }

    const { data: contacts, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ enriched: 0, total: 0 });
    }

    let enriched = 0;
    let failed = 0;

    for (const c of contacts) {
      const fields = await enrichOne({
        name: c.name || "",
        title: c.title || "",
        firmName: c.firmName || "",
      });

      if (!fields) {
        failed++;
        continue;
      }

      // Build meta with enriched fields layered on top of existing data
      // Don't overwrite non-empty fields. Enrichment fills gaps, not replaces.
      const meta = {
        name: c.name || "",
        education: c.education || fields.education,
        location: c.location || fields.location,
        experience: c.firmName || "",
        title: c.title || "",
        industry: fields.industry,
        seniorityLevel: fields.seniorityLevel,
      };

      // Re-score with personalized prefs in the same loop
      const affiliations = detectAffiliations(meta, prefs);
      const { score, tier } = computeWarmthScore(affiliations);

      const { error: updateError } = await supabase
        .from("AlumniContact")
        .update({
          education: meta.education,
          location: meta.location,
          industry: fields.industry,
          seniorityLevel: fields.seniorityLevel,
          warmthScore: score,
          tier,
          affiliations: affiliations.map((a) => a.name).join(","),
          enrichedAt: new Date().toISOString(),
          enrichmentSource: "claude",
        })
        .eq("id", c.id);

      if (updateError) {
        failed++;
      } else {
        enriched++;
      }
    }

    return NextResponse.json({ enriched, failed, total: contacts.length });
  } catch (error) {
    console.error("Enrich route error:", error);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
