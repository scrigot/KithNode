import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";

// Editable free-text contact columns. Title/firmName stay read-only — they are
// the cross-user identity dedup keys (name + firm), so editing them per-user
// would fork a shared contact's identity.
const EDITABLE_FIELDS = [
  "education",
  "location",
  "highSchool",
  "clubs",
  "passions",
] as const;

const MAX_FIELD_LEN = 160;

// Trim, collapse runs of inner whitespace, cap length. Pure — unit-tested.
export function normalizeField(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_FIELD_LEN);
}

// Pull the editable keys out of an arbitrary PATCH body. Unknown keys ignored;
// non-string values skipped. Returns {} when nothing valid was supplied so the
// route can answer 400. Pure — unit-tested without next-auth.
export function pickEditableFields(
  body: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of EDITABLE_FIELDS) {
    const val = body[key];
    if (typeof val === "string") {
      out[key] = normalizeField(val);
    }
  }
  return out;
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

  return NextResponse.json({
    id: contact.id,
    name: contact.name,
    title: contact.title,
    email: "",
    linkedin_url: contact.linkedInUrl,
    education: contact.education,
    linkedin_location: contact.location,
    high_school: contact.highSchool,
    clubs: contact.clubs,
    passions: contact.passions,
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
    affiliations: contact.affiliations
      ? contact.affiliations
          .split(",")
          .filter(Boolean)
          .map((n: string) => ({ id: 0, name: n.trim(), boost: 10 }))
      : [],
    why_now: contact.affiliations || "",
    warm_path: contact.university || "",
    outreach_history: [],
    signals: [],
    tags,
  });
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
  const updates = pickEditableFields(body);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
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
