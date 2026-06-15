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
  parseExperiences,
  flatFromEducations,
  firmsFromExperiences,
  educationsFromFlat,
} from "@/lib/educations";
import {
  parseClubMemberships,
  clubsFlatFromMemberships,
  membershipsFromFlat,
} from "@/lib/club-memberships";
import {
  engagementScore,
  relationshipClass,
  isDormantKith,
  displayTier,
  SPEAK_FREQUENCIES,
} from "@/lib/relationship-score";
import { edgesToResolvedMutuals } from "@/lib/mutuals";
import { contactNeedsInfo } from "@/lib/needs-info";

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
  "notes",
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
  "clubMemberships",
  "experiences",
  "graduationYear",
  "isFriend",
  "speakFrequency",
  "lastSpokenAt",
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
): { fields: Record<string, string | number | boolean | null>; invalid: boolean } {
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of EDITABLE_FIELDS) {
    // Array and typed fields handled after the loop.
    if (
      key === "educations" ||
      key === "clubMemberships" ||
      key === "experiences" ||
      key === "graduationYear" ||
      key === "isFriend" ||
      key === "speakFrequency" ||
      key === "lastSpokenAt"
    ) continue;

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
    } else if (key === "notes") {
      // Notes are a free-text outreach/memory field — bounded but roomier than
      // the 160-char single-field cap, matching the capture ingest.
      out[key] = val.trim().slice(0, 280);
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

  // clubMemberships: array of ClubEntry. Flat clubs derived for matcher.
  if (Array.isArray(body.clubMemberships)) {
    const parsed = parseClubMemberships(JSON.stringify(body.clubMemberships));
    out.clubMemberships = JSON.stringify(parsed);
    out.clubs = clubsFlatFromMemberships(parsed);
  }

  // experiences: array of ExperienceEntry. Flat pastFirms derived for matcher.
  if (Array.isArray(body.experiences)) {
    const parsed = parseExperiences(JSON.stringify(body.experiences));
    out.experiences = JSON.stringify(parsed);
    out.pastFirms = firmsFromExperiences(parsed).join(", ");
  }

  // graduationYear: int 1950..2100; numeric string accepted.
  if ("graduationYear" in body) {
    const raw = Number(body.graduationYear);
    if (Number.isInteger(raw) && raw >= 1950 && raw <= 2100) {
      out.graduationYear = raw;
    }
  }

  // isFriend: boolean only.
  if (typeof body.isFriend === "boolean") {
    out.isFriend = body.isFriend;
  }

  // speakFrequency: "" to clear, or a value in SPEAK_FREQUENCIES.
  if ("speakFrequency" in body) {
    const val = body.speakFrequency;
    if (val === "") {
      out.speakFrequency = "";
    } else if (
      typeof val === "string" &&
      (SPEAK_FREQUENCIES as readonly string[]).includes(val)
    ) {
      out.speakFrequency = val;
    } else {
      return { fields: {}, invalid: true };
    }
  }

  // lastSpokenAt: "" / null clears it; ISO date string stored as-is.
  if ("lastSpokenAt" in body) {
    const val = body.lastSpokenAt;
    if (val === "" || val === null) {
      out.lastSpokenAt = null;
    } else if (typeof val === "string" && !Number.isNaN(Date.parse(val))) {
      out.lastSpokenAt = val;
    } else {
      return { fields: {}, invalid: true };
    }
  }

  // Cross-field guard: a non-empty role must belong to its track. The effective
  // track is the one being set in this patch if present, else the role's own
  // owning track (the role-only edit case). A mismatch is invalid.
  if (out.role) {
    const role = out.role as string;
    const effectiveTrack = "track" in out ? (out.track as string) : roleToTrack(role);
    if (roleToTrack(role) !== effectiveTrack) {
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

  // Mutual-connection edges, SCOPED TO THE VIEWER: a non-owner high_value rater
  // correctly sees [] (these are the owner's captured warm paths, not theirs).
  const { data: edgeRows } = await supabase
    .from("ContactConnection")
    .select("mutualName, mutualSlug, mutualContactId")
    .eq("ownerUserId", userId)
    .eq("contactId", id);
  const mutuals = edgesToResolvedMutuals(edgeRows ?? []);

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

  // Synthesize club membership rows from flat clubs when column is empty.
  const contactClubMemberships = contact.clubMemberships
    ? parseClubMemberships(contact.clubMemberships as string)
    : membershipsFromFlat(contact.clubs as string | null);

  // Synthesize experience rows from flat pastFirms when column is empty.
  const contactExperiences = contact.experiences
    ? parseExperiences(contact.experiences as string)
    : (contact.pastFirms as string | null)
        ?.split(",")
        .map((f: string) => f.trim())
        .filter(Boolean)
        .map((firm: string) => ({ title: "", firm, start: "", end: "" })) ?? [];

  // Two-axis score: fit IS the stored affiliation warmth (0..100); the
  // relationship (friend / proven pipeline stage / recent contact) promotes
  // into the KITH class above the fit tiers. Engagement only orders within a
  // class and drives the dormant reconnect nudge.
  const { data: pipelineEntry } = await supabase
    .from("PipelineEntry")
    .select("stage")
    .eq("contactId", id)
    .eq("userId", userId)
    .maybeSingle();
  const fit = (contact.warmthScore as number) || 0;
  const klass = relationshipClass({
    isFriend: contact.isFriend as boolean | undefined,
    pipelineStage: pipelineEntry?.stage as string | undefined,
    lastSpokenAt: contact.lastSpokenAt as string | null | undefined,
    now: Date.now(),
  });
  const engagement = engagementScore({
    lastSpokenAt: contact.lastSpokenAt as string | null | undefined,
    speakFrequency: contact.speakFrequency as string | null | undefined,
    now: Date.now(),
  });
  const dormant =
    klass === "kith" &&
    isDormantKith({
      lastSpokenAt: contact.lastSpokenAt as string | null | undefined,
      now: Date.now(),
    });
  const tier = displayTier(contact.tier as string | undefined, klass);

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
    notes: contact.notes || "",
    major: contact.major || "",
    minor: contact.minor || "",
    concentration: contact.concentration || "",
    degrees: contact.degrees || "",
    skills: contact.skills || "",
    past_firms: contact.pastFirms || "",
    educations: contactEducations,
    // camelCase to match the edit modal + detail page readers (which read
    // these via a Record cast, so a snake_case key would silently load blank).
    clubMemberships: contactClubMemberships,
    experiences: contactExperiences,
    graduationYear: (contact.graduationYear as number | null) ?? null,
    isFriend: !!(contact.isFriend as boolean | null),
    speakFrequency: (contact.speakFrequency as string | null) || "",
    lastSpokenAt: (contact.lastSpokenAt as string | null) || "",
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
      fit_score: fit,
      signal_score: 0,
      engagement_score: engagement,
      total_score: fit,
      tier,
    },
    relationship_class: klass,
    dormant,
    needs_info: contactNeedsInfo(contact, tier),
    pipeline_stage: (pipelineEntry?.stage as string) || "",
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
    mutuals,
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

  // The AlumniContact row is shared across the Discover pool; checkAccess admits
  // any user holding a high_value rating, but only the importer may MUTATE the
  // canonical row. A non-owner write would rewrite owner A's identity
  // (name/title/firmName) and personal relationship fields (isFriend/
  // lastSpokenAt/speakFrequency) and recompute warmth/tier from B's prefs.
  // An empty importedByUserId is legacy-owned (matches checkAccess/DELETE), so
  // gate only when a non-empty importer is someone else.
  if (contact.importedByUserId && contact.importedByUserId !== userEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    const deduced = await deduceHometown(updates.highSchool as string);
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
