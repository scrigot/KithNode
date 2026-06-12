import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";
import { requireSubscription } from "@/lib/subscription";
import { fetchPdlProfile, shouldAdoptPdlName } from "@/lib/enrich/pdl";
import { deduceHometown } from "@/lib/deduce-hometown";
import { classifyCareer } from "@/lib/classify-career";
import { CAREER_TRACKS, ALL_TRACKS, roleToTrack } from "@/lib/data/career-tracks";

const BATCH_LIMIT = 25;

interface EnrichedFields {
  industry: string;
  seniorityLevel: string;
  education: string;
  location: string;
  // Taxonomy track/role picked by the LLM and validated against CAREER_TRACKS.
  // "" when the model was unsure or returned an off-taxonomy value.
  track: string;
  role: string;
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

// Render the taxonomy as an allow-list block the model can map against. Only
// these exact track names and per-track role names are accepted downstream.
const TAXONOMY_BLOCK = ALL_TRACKS.map(
  (t) => `  "${t}": ${CAREER_TRACKS[t].map((r) => `"${r}"`).join(", ")}`,
).join("\n");

/**
 * Validate an LLM-proposed (track, role) pair against the taxonomy. Off-list
 * track -> both "". Role that doesn't belong to the chosen track -> keep the
 * valid track, drop the role to "". Empty role with a valid track is allowed.
 */
export function validateTrackRole(rawTrack: unknown, rawRole: unknown): { track: string; role: string } {
  const track = String(rawTrack || "");
  if (!ALL_TRACKS.includes(track as (typeof ALL_TRACKS)[number])) {
    return { track: "", role: "" };
  }
  const role = String(rawRole || "");
  if (role && roleToTrack(role) === track) {
    return { track, role };
  }
  return { track, role: "" };
}

function buildPrompt(c: { name: string; title: string; firmName: string }): string {
  return `You are an enrichment engine for a recruiting CRM. Given a contact's name, company, and current title, infer the most likely INDUSTRY, SENIORITY, probable UNIVERSITY (only if the name/company strongly suggests one, otherwise ""), LOCATION (company HQ city if unknown), and the best-fit career TRACK and ROLE from the taxonomy below.

Contact:
- Name: ${c.name}
- Company: ${c.firmName}
- Title: ${c.title}

Allowed INDUSTRY values (pick exactly one): ${ALLOWED_INDUSTRIES.map((s) => `"${s}"`).join(", ")}.
Allowed SENIORITY values (pick exactly one): ${ALLOWED_SENIORITY.map((s) => `"${s}"`).join(", ")}.

Career taxonomy (TRACK -> allowed ROLES). Pick exactly one TRACK from the keys and one ROLE from THAT track's list. Use "" for either when you are not confident:
${TAXONOMY_BLOCK}

When inferring CLUBS, write each entry as "Role — Club Name" when a leadership role is evident (e.g. "President — Investment Banking Club").

Return ONLY valid JSON, no prose, no markdown:
{"industry":"...","seniorityLevel":"...","education":"...","location":"...","track":"...","role":"..."}`;
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
    const { track, role } = validateTrackRole(parsed.track, parsed.role);
    return {
      industry: ALLOWED_INDUSTRIES.includes(String(parsed.industry || ""))
        ? String(parsed.industry)
        : "",
      seniorityLevel: ALLOWED_SENIORITY.includes(String(parsed.seniorityLevel || ""))
        ? String(parsed.seniorityLevel)
        : "",
      education: String(parsed.education || ""),
      location: String(parsed.location || ""),
      track,
      role,
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
      query = query
        .is("enrichedAt", null)
        .order("warmthScore", { ascending: false })
        .limit(BATCH_LIMIT);
    }

    const { data: contacts, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ enriched: 0, failed: 0, total: 0, remaining: 0 });
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

      // PDL major/minor/skills fill ONLY when the contact's column is empty, so
      // a manual edit is never clobbered. skills is stored comma-joined.
      const major = c.major || pdl?.major || "";
      const minor = c.minor || pdl?.minor || "";
      // degrees fills only-when-empty from the PDL canonical tokens, joined
      // comma-space like the contact column stores. concentration is NOT
      // enriched (no reliable source) — manual + resume only.
      const degrees =
        c.degrees || (pdl?.degrees?.length ? pdl.degrees.join(", ") : "");
      // educations fills only-when-empty from PDL per-school rows (JSON-stringified).
      const educations =
        c.educations || (pdl?.educations?.length ? JSON.stringify(pdl.educations) : "");
      const skills =
        c.skills || (pdl?.skills?.length ? pdl.skills.join(", ") : "");
      const pastFirms =
        c.pastFirms || (pdl?.pastFirms?.length ? pdl.pastFirms.join(", ") : "");

      // High school fills from PDL only when the column is empty (manual edits
      // win). Hometown is then deduced from the high school, but ONLY when the
      // contact's hometown is empty and a high school is now known — a unique
      // school name yields "City, ST", ambiguous/unknown stays "".
      const highSchool = c.highSchool || pdl?.highSchool || "";
      const hometown =
        c.hometown || (highSchool ? await deduceHometown(highSchool) : "");

      // Adopt PDL full name when the current name is a single token (slug-derived).
      // Multi-word names (CSV imports) are considered accurate and never overwritten.
      // Empty current name is also treated as unset (single-token path).
      const currentName: string = c.name || "";
      const name =
        pdl?.fullName && shouldAdoptPdlName(currentName, pdl.fullName)
          ? pdl.fullName
          : currentName;

      // Track/role precedence: an already-set column wins (never clobber a manual
      // edit or earlier classification), else the validated LLM pick, else the
      // zero-cost heuristic. The heuristic reads the enriched title/firm so it can
      // still resolve a track when the LLM abstained. Role is gated on track: a
      // role without its owning track is dropped so the two never disagree.
      const heuristic = classifyCareer({
        title: c.title || "",
        firmName: c.firmName || "",
        skills,
      });
      let track = (c.track as string) || fields.track || heuristic.track || "";
      let role = (c.role as string) || fields.role || heuristic.role || "";
      if (role && roleToTrack(role) !== track) {
        // Role no longer matches the resolved track (e.g. existing role column but
        // a different existing track column). Trust the track, drop the role.
        role = "";
      }
      if (!track && role) {
        // Role present but no track resolved — backfill the track from the role.
        track = roleToTrack(role);
      }

      // Re-score with personalized prefs in the same loop, via the shared
      // helper so enrich stays in lockstep with the tags route. Load this
      // contact's manual tags first — omitting them is exactly the bug that
      // used to wipe tag-driven affiliations on enrich. Layer the freshly
      // enriched education/location/industry/seniority on top of the row so
      // populated education lights up Same School / CS Top School, while
      // highSchool/clubs/passions ride along from the existing columns.
      const tags = await loadContactTags(userId, c.id);
      const { affiliations, score, tier } = rescoreContact(
        { ...c, name, education, location, highSchool, hometown, major, minor, degrees, skills, pastFirms, industry: fields.industry, seniorityLevel: fields.seniorityLevel, track, role },
        prefs,
        tags,
      );

      const { error: updateError } = await supabase
        .from("AlumniContact")
        .update({
          name,
          education,
          graduationYear,
          location,
          highSchool,
          hometown,
          major,
          minor,
          degrees,
          educations,
          skills,
          pastFirms,
          track,
          role,
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

    // Count still-unenriched contacts so the client can loop without polling.
    const { count: remainingCount } = await supabase
      .from("AlumniContact")
      .select("id", { count: "exact", head: true })
      .eq("importedByUserId", userId)
      .is("enrichedAt", null);

    return NextResponse.json({
      enriched,
      failed,
      total: contacts.length,
      remaining: remainingCount ?? 0,
    });
  } catch (error) {
    console.error("Enrich route error:", error);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
