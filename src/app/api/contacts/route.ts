import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName, redactLinkedInUrl } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";

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

    // Get contacts user discovered — select rating so we can build the unlock Set
    const { data: discoveries } = await supabase
      .from("UserDiscover")
      .select("contactId, rating")
      .eq("userId", userId);

    const highValueIds = new Set<string>(
      (discoveries || [])
        .filter((d) => d.rating === "high_value")
        .map((d) => d.contactId),
    );

    let discoveredContacts: typeof ownContacts = [];
    if (highValueIds.size > 0) {
      const { data } = await supabase
        .from("AlumniContact")
        .select("*")
        .in("id", Array.from(highValueIds));
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
    // Redact PII only when not unlocked. A contact is unlocked when the viewer
    // imported it OR has rated it high_value in Discover.
    const ranked = all.map((c) => {
      const unlocked = isUnlocked(c.importedByUserId, userId, highValueIds, c.id);
      return {
        id: c.id,
        name: unlocked ? (c.name || "") : redactName(c.name || ""),
        title: c.title || "",
        email: "",
        email_status: "unknown",
        linkedin_url: unlocked
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
        ...(unlocked ? {} : { isRedacted: true }),
      };
    });

    return NextResponse.json(ranked);
  } catch {
    return NextResponse.json([]);
  }
}
