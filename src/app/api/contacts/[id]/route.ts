import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";
import { deduceHometown } from "@/lib/deduce-hometown";
import { ALL_TRACKS, CAREER_TRACKS, roleToTrack } from "@/lib/data/career-tracks";
import { normalizeDegrees } from "@/lib/normalize-degrees";
import {
  parseEducations,
  flatFromEducations,
  educationsFromFlat,
} from "@/lib/educations";

// Editable free-text contact columns. title/firmName/university are now
// user-correctable: the manual-override flow lets a user fix WHO a contact is
// (personType) and the surrounding identity text the matcher keys on.
const EDITABLE_FIELDS = [
  "name",
  "education",
  "location",
  "hometown",
  "highSchool",
  "clubs",
  "passions",
  "greekOrg",
  "title",
  "firmName",
  "university",
  "personType",
  "major",
  "minor",
  "concentration",
  "degrees",
  "skills",
  "pastFirms",
  "track",
  "role",
  "educations",
] as const;

// personType is a closed enum, not free text: '' = auto (text heuristics),
// 'alum' | 'student' | 'professor' = manual identity override. Anything else
// is a 400.
const VALID_PERSON_TYPES = ["", "alum", "student", "professor"] as const;

// track/role are closed sets over the taxonomy, validated like personType. ""
// clears the field. A role must belong to the track being set in the SAME patch
// (or, if track isn't in the patch, to the role's own track) — a track/role
// mismatch is a 400, never a silent persist.
const VALID_TRACKS = ["", ...ALL_TRACKS] as const;
const ALL_ROLE_VALUES = ALL_TRACKS.flatMap((t) => [...CAREER_TRACKS[t]]);
const VALID_ROLES = ["", ...ALL_ROLE_VALUES] as const;

const MAX_FIELD_LEN = 160;

// Trim, collapse runs of inner whitespace, cap length. Pure — unit-tested.
export function normalizeField(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_FIELD_LEN);
}

// Pull the editable keys out of an arbitrary PATCH body. Unknown keys ignored;
// non-string values skipped. personType is validated against the closed enum:
// an out-of-range value sets `invalid` so the route can answer 400 instead of
// silently dropping it. Returns {} (with invalid=false) when nothing valid was
// supplied so the route still answers 400. Pure — unit-tested without next-auth.
export function pickEditableFields(
  body: Record<string, unknown>,
): { fields: Record<string, string>; invalid: boolean } {
  const out: Record<string, string> = {};
  for (const key of EDITABLE_FIELDS) {
    // educations is an array field — handled after the loop.
    if (key === "educations") continue;

    const val = body[key];
    if (typeof val !== "string") continue;
    if (key === "personType") {
      if (!VALID_PERSON_TYPES.includes(val as (typeof VALID_PERSON_TYPES)[number])) {
        return { fields: {}, invalid: true };
      }
      out[key] = val; // enum value, no whitespace normalization needed
    } else if (key === "track") {
      if (!VALID_TRACKS.includes(val as (typeof VALID_TRACKS)[number])) {
        return { fields: {}, invalid: true };
      }
      out[key] = val;
    } else if (key === "role") {
      if (!VALID_ROLES.includes(val as (typeof VALID_ROLES)[number])) {
        return { fields: {}, invalid: true };
      }
      out[key] = val;
    } else if (key === "degrees") {
      // Closed-set validation (canonical casing, dedupe, junk dropped). Like
      // clubs/skills it is forgiving — never a 400.
      out[key] = normalizeDegrees(val);
    } else {
      out[key] = normalizeField(val);
    }
  }

  // educations: array of EducationEntry. Parsed + re-stringified for storage;
  // flat major/degrees/concentration are derived so rescore sees fresh flats.
  if (Array.isArray(body.educations)) {
    const rows = parseEducations(JSON.stringify(body.educations));
    out.educations = JSON.stringify(rows);
    const flat = flatFromEducations(rows);
    out.major = flat.major;
    out.degrees = flat.degrees;
    out.concentration = flat.concentration;
  }

  // Cross-field guard: a non-empty role must belong to its track. The effective
  // track is the one being set in this patch if present, else the role's own
  // owning track (the role-only edit case). A mismatch is invalid.
  if (out.role) {
    const effectiveTrack = "track" in out ? out.track : roleToTrack(out.role);
    if (roleToTrack(out.role) !== effectiveTrack) {
      return { fields: {}, invalid: true };
    }
  }

  return { fields: out, invalid: false };
}

// Access check: own contact OR high_value-rated UserDiscover row.
// skip-only or no relationship returns 404 — never leak contact existence.
async function checkAccess(
  userEmail: string,
  contactId: string,
): Promise<{ contact: Record<string, unknown> } | NextResponse> {
  const { data: contact, error } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.importedByUserId && contact.importedByUserId !== userEmail) {
    const { data: discover } = await supabase
      .from("UserDiscover")
      .select("rating")
      .eq("userId", userEmail)
      .eq("contactId", contactId)
      .maybeSingle();
    if (!discover || discover.rating !== "high_value") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  return { contact };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const { id } = await params;

  // Scope reads to contacts the user owns OR has rated as high_value.
  // Anything outside that set is treated as not-found to avoid leaking IDs.
  const { data: contact, error } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.importedByUserId && contact.importedByUserId !== userId) {
    const { data: rating } = await supabase
      .from("UserDiscover")
      .select("rating")
      .eq("userId", userId)
      .eq("contactId", id)
      .maybeSingle();
    if (!rating || rating.rating !== "high_value") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  // Fetch per-user manual tags for this contact
  const { data: tagRows } = await supabase
    .from("contact_tags")
    .select("tag")
    .eq("user_id", userId)
    .eq("contact_id", id)
    .order("created_at", { ascending: true });
  const tags = (tagRows ?? []).map((r: { tag: string }) => r.tag);

  // Recompute affiliations live so each chip carries its REAL boost — the
  // stored column is names-only and the UI used to fake a uniform +10.
  const prefs = await getUserPrefs(userId);
  const { affiliations: liveAffiliations } = rescoreContact(contact, prefs, tags);

  // Synthesize structured rows from flat columns when the educations column is
  // empty (old profiles render rows immediately without requiring a re-save).
  const contactEducations = contact.educations
    ? parseEducations(contact.educations as string)
    : educationsFromFlat(
        contact.major as string | null,
        contact.degrees as string | null,
        contact.concentration as string | null,
      );

  return NextResponse.json({
    id: contact.id,
    name: contact.name,
    title: contact.title,
    email: "",
    linkedin_url: contact.linkedInUrl,
    education: contact.education,
    linkedin_location: contact.location,
    hometown: contact.hometown || "",
    high_school: contact.highSchool,
    greek_org: contact.greekOrg,
    clubs: contact.clubs,
    passions: contact.passions,
    major: contact.major || "",
    minor: contact.minor || "",
    concentration: contact.concentration || "",
    degrees: contact.degrees || "",
    skills: contact.skills || "",
    past_firms: contact.pastFirms || "",
    educations: contactEducations,
    person_type: contact.personType || "",
    track: contact.track || "",
    role: contact.role || "",
    university: contact.university || "",
    company: {
      name: contact.firmName,
      domain: "",
      website: "",
      location: contact.location,
      industry_tags: [],
    },
    score: {
      fit_score: contact.warmthScore,
      signal_score: 0,
      engagement_score: 0,
      total_score: contact.warmthScore,
      tier: contact.tier,
    },
    affiliations: liveAffiliations.map((a, i) => ({
      id: i,
      name: a.name,
      boost: a.boost,
    })),
    why_now: contact.affiliations || "",
    warm_path: contact.university || "",
    outreach_history: [],
    signals: [],
    tags,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;
  const { id: contactId } = await params;

  const { data: contact, error: loadError } = await supabase
    .from("AlumniContact")
    .select("id, importedByUserId")
    .eq("id", contactId)
    .single();

  if (loadError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.importedByUserId === userId) {
    // Hard delete: no FK cascades — delete children first, then the row.
    await supabase.from("Connection").delete().eq("alumniId", contactId);
    await supabase.from("PipelineEntry").delete().eq("contactId", contactId);
    await supabase.from("UserDiscover").delete().eq("contactId", contactId);
    await supabase.from("AuditLog").delete().eq("contactId", contactId);
    const { error: deleteError } = await supabase
      .from("AlumniContact")
      .delete()
      .eq("id", contactId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, removed: "deleted" });
  }

  // Shared/discovered contact: check if this user has any relationship at all.
  const [{ data: discoverRow }, { data: pipelineRow }] = await Promise.all([
    supabase
      .from("UserDiscover")
      .select("id")
      .eq("userId", userId)
      .eq("contactId", contactId)
      .maybeSingle(),
    supabase
      .from("PipelineEntry")
      .select("id")
      .eq("userId", userId)
      .eq("contactId", contactId)
      .maybeSingle(),
  ]);

  if (!discoverRow && !pipelineRow) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Unlink: remove only this user's rows; the pool contact survives.
  await Promise.all([
    supabase
      .from("UserDiscover")
      .delete()
      .eq("userId", userId)
      .eq("contactId", contactId),
    supabase
      .from("PipelineEntry")
      .delete()
      .eq("userId", userId)
      .eq("contactId", contactId),
  ]);

  return NextResponse.json({ ok: true, removed: "unlinked" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const { id: contactId } = await params;

  const accessResult = await checkAccess(userEmail, contactId);
  if (accessResult instanceof NextResponse) return accessResult;
  const { contact } = accessResult;

  const body = await request.json().catch(() => ({}));
  const { fields: updates, invalid } = pickEditableFields(body);

  if (invalid) {
    return NextResponse.json(
      { error: "Invalid field value" },
      { status: 400 },
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Auto-deduce hometown from a newly-set highSchool, but ONLY when the user did
  // not also set hometown in this PATCH (manual edits win) AND the contact's
  // stored hometown is empty (never overwrite an existing value). A unique
  // school name yields "City, ST"; ambiguous/unknown leaves it unset.
  if (
    updates.highSchool &&
    updates.hometown === undefined &&
    !(contact.hometown as string)
  ) {
    const deduced = await deduceHometown(updates.highSchool);
    if (deduced) updates.hometown = deduced;
  }

  // Persist only the provided columns, then recompute affiliations/warmth from
  // the merged row via the shared helper (with the user's tags) so an edit to
  // highSchool/clubs/etc. immediately re-tiers the contact.
  const merged = { ...contact, ...updates };

  const [tags, prefs] = await Promise.all([
    loadContactTags(userEmail, contactId),
    getUserPrefs(userEmail),
  ]);
  const { affiliations, score, tier } = rescoreContact(merged, prefs, tags);

  const { error } = await supabase
    .from("AlumniContact")
    .update({
      ...updates,
      affiliations: affiliations.map((a) => a.name).join(","),
      warmthScore: score,
      tier,
    })
    .eq("id", contactId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...updates, score, tier });
}
