import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";

const MAX_TAGS = 10;
const MAX_TAG_LEN = 40;

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LEN);
}

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

async function recomputeScoring(
  userEmail: string,
  contact: Record<string, unknown>,
  contactId: string,
): Promise<void> {
  // warmthScore/tier/affiliations live on the shared AlumniContact row, so only
  // the importer may write them — a non-owner tagging a pool contact must not
  // corrupt the owner's score. Tags themselves are per-user (contact_tags) and
  // already saved by the caller; this guards only the shared-row scoring write.
  // Empty importedByUserId is legacy-owned (matches checkAccess), so persist.
  const importer = contact.importedByUserId as string | undefined;
  if (importer && importer !== userEmail) return;

  const [tags, prefs] = await Promise.all([
    loadContactTags(userEmail, contactId),
    getUserPrefs(userEmail),
  ]);

  const { affiliations, score, tier } = rescoreContact(contact, prefs, tags);

  await supabase
    .from("AlumniContact")
    .update({
      affiliations: affiliations.map((a) => a.name).join(","),
      warmthScore: score,
      tier,
    })
    .eq("id", contactId);
}

export async function GET(
  _req: NextRequest,
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

  const { data: rows } = await supabase
    .from("contact_tags")
    .select("tag")
    .eq("user_id", userEmail)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  const tags = (rows ?? []).map((r: { tag: string }) => r.tag);
  return NextResponse.json({ tags });
}

export async function POST(
  req: NextRequest,
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
  const { contact } = accessResult as { contact: Record<string, unknown> };

  const body = await req.json().catch(() => ({}));
  const raw: string = body.tag ?? "";
  const tag = normalizeTag(raw);

  if (!tag) {
    return NextResponse.json({ error: "tag is required" }, { status: 400 });
  }

  // Check cap
  const { count } = await supabase
    .from("contact_tags")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userEmail)
    .eq("contact_id", contactId);

  if ((count ?? 0) >= MAX_TAGS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TAGS} tags per contact` },
      { status: 400 },
    );
  }

  // Upsert — unique(user_id, contact_id, tag) handles duplicates
  const { error } = await supabase.from("contact_tags").upsert(
    { user_id: userEmail, contact_id: contactId, tag },
    { onConflict: "user_id,contact_id,tag", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recomputeScoring(userEmail, contact, contactId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
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
  const { contact } = accessResult as { contact: Record<string, unknown> };

  const body = await req.json().catch(() => ({}));
  const raw: string = body.tag ?? "";
  const tag = normalizeTag(raw);

  if (!tag) {
    return NextResponse.json({ error: "tag is required" }, { status: 400 });
  }

  await supabase
    .from("contact_tags")
    .delete()
    .eq("user_id", userEmail)
    .eq("contact_id", contactId)
    .eq("tag", tag);

  await recomputeScoring(userEmail, contact, contactId);

  return NextResponse.json({ ok: true });
}
