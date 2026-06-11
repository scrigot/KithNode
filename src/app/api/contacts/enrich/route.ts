import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";
import { requireSubscription } from "@/lib/subscription";
import { fetchPdlProfile } from "@/lib/enrich/pdl";

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
    let pdlOk = 0;
    let pdlFail = 0;

    for (const c of contacts) {
      // ── PDL first: real structured education by LinkedIn URL ──
      // Only spend a lookup when the contact has a LinkedIn URL (cost guard) and
      // the API key is configured. fetchPdlProfile no-ops to null when the
      // key is unset, so this stays graceful with zero config.
      const linkedInUrl: string = c.linkedInUrl || "";
      let pdl: Awaited<ReturnType<typeof fetchPdlProfile>> = null;
      if (linkedInUrl && process.env.PDL_API_KEY) {
        pdl = await fetchPdlProfile(linkedInUrl);
        if (pdl) {
          pdlOk++;
        } else {
          pdlFail++;
        }
      }

      const fields = await enrichOne({
        name: c.name || "",
        title: c.title || "",
        firmName: c.firmName || "",
      });

      if (!fields) {
        failed++;
        continue;
      }

      // Real PDL data wins over the LLM guess for education + grad year.
      // Location only fills when the contact's is empty (don't clobber a value).
      const education = pdl?.education || c.education || fields.education;
      const graduationYear =
        pdl && pdl.graduationYear > 0
          ? pdl.graduationYear
          : c.graduationYear || 0;
      const location =
        c.location || pdl?.location || fields.location;

      // Re-score with personalized prefs in the same loop, via the shared
      // helper so enrich stays in lockstep with the tags route. Load this
      // contact's manual tags first — omitting them is exactly the bug that
      // used to wipe tag-driven affiliations on enrich. Layer the freshly
      // enriched education/location/industry/seniority on top of the row so
      // populated education lights up Same School / CS Top School, while
      // highSchool/clubs/passions ride along from the existing columns.
      const tags = await loadContactTags(userId, c.id);
      const { affiliations, score, tier } = rescoreContact(
        { ...c, education, location, industry: fields.industry, seniorityLevel: fields.seniorityLevel },
        prefs,
        tags,
      );

      const { error: updateError } = await supabase
        .from("AlumniContact")
        .update({
          education,
          graduationYear,
          location,
          industry: fields.industry,
          seniorityLevel: fields.seniorityLevel,
          warmthScore: score,
          tier,
          affiliations: affiliations.map((a) => a.name).join(","),
          enrichedAt: new Date().toISOString(),
          enrichmentSource: pdl ? "pdl+claude" : "claude",
        })
        .eq("id", c.id);

      if (updateError) {
        failed++;
      } else {
        enriched++;
      }
    }

    console.log("Enrich batch: PDL lookups", {
      succeeded: pdlOk,
      failed: pdlFail,
      total: contacts.length,
    });

    return NextResponse.json({ enriched, failed, total: contacts.length });
  } catch (error) {
    console.error("Enrich route error:", error);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
