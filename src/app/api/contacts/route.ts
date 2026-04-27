import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName, redactLinkedInUrl } from "@/lib/redact";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  try {
    // Get user's own imports
    const { data: ownContacts } = await supabase
      .from("AlumniContact")
      .select("*")
      .eq("importedByUserId", userId)
      .order("warmthScore", { ascending: false });

    // Get contacts user discovered and rated high_value
    const { data: discoveries } = await supabase
      .from("UserDiscover")
      .select("contactId")
      .eq("userId", userId)
      .eq("rating", "high_value");

    let discoveredContacts: typeof ownContacts = [];
    if (discoveries && discoveries.length > 0) {
      const discoveredIds = discoveries.map((d) => d.contactId);
      const { data } = await supabase
        .from("AlumniContact")
        .select("*")
        .in("id", discoveredIds);
      discoveredContacts = data || [];
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const all = [...(ownContacts || []), ...(discoveredContacts || [])]
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .sort((a, b) => (b.warmthScore || 0) - (a.warmthScore || 0));

    // Transform Supabase data to match RankedContact interface.
    // Redact PII when the underlying contact wasn't imported by the current user
    // (e.g. high_value-rated discoveries from the shared pool).
    const ranked = all.map((c) => {
      const isOwn = c.importedByUserId === userId;
      return {
        id: c.id,
        name: isOwn ? (c.name || "") : redactName(c.name || ""),
        title: c.title || "",
        email: "",
        email_status: "unknown",
        linkedin_url: isOwn
          ? (c.linkedInUrl || "")
          : (c.linkedInUrl ? redactLinkedInUrl(c.linkedInUrl) : ""),
        education: c.education || "",
        linkedin_location: c.location || "",
        why_now: c.affiliations
          ? c.affiliations.split(",").filter(Boolean).join(", ")
          : "",
        warm_path: c.university || "",
        affiliations: c.affiliations
          ? c.affiliations
              .split(",")
              .filter(Boolean)
              .map((name: string) => ({ name: name.trim(), boost: 10 }))
          : [],
        company: {
          name: c.firmName || "",
          domain: "",
          website: "",
          location: c.location || "",
          industry_tags: [],
        },
        score: {
          fit_score: c.warmthScore || 0,
          signal_score: 0,
          engagement_score: 0,
          total_score: c.warmthScore || 0,
          tier: c.tier || "cold",
        },
        ...(isOwn ? {} : { isRedacted: true }),
      };
    });

    return NextResponse.json(ranked);
  } catch {
    return NextResponse.json([]);
  }
}
