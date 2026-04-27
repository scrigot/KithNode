import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
    if (!rating) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    id: contact.id,
    name: contact.name,
    title: contact.title,
    email: "",
    linkedin_url: contact.linkedInUrl,
    education: contact.education,
    linkedin_location: contact.location,
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
  });
}
