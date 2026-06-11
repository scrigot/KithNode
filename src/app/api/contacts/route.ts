import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName, redactLinkedInUrl } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";
import {
  engagementScore,
  signalScore,
  combinedTotal,
  tierFromTotal,
} from "@/lib/relationship-score";

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
    const now = Date.now();

    const seen = new Set<string>();
    const all = [...(ownContacts || []), ...(discoveredContacts || [])]
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

    // Transform Supabase data to match RankedContact interface.
    // Redact PII only when not unlocked. A contact is unlocked when the viewer
    // imported it OR has rated it high_value in Discover.
    const ranked = all
      .map((c) => {
        const unlocked = isUnlocked(c.importedByUserId, userId, highValueIds, c.id);
        const affiliationNames: string[] = c.affiliations
          ? c.affiliations.split(",").filter(Boolean).map((n: string) => n.trim())
          : [];
        const fit = c.warmthScore || 0;
        const signal = signalScore({
          isFriend: c.isFriend,
          affiliationNames,
        });
        const engagement = engagementScore({
          lastSpokenAt: c.lastSpokenAt,
          speakFrequency: c.speakFrequency,
          now,
        });
        const total = combinedTotal(fit, signal, engagement);
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
          track: c.track || "",
          role: c.role || "",
          why_now: affiliationNames.join(", "),
          warm_path: c.university || "",
          affiliations: affiliationNames.map((name: string) => ({ name, boost: 10 })),
          company: {
            name: c.firmName || "",
            domain: "",
            website: "",
            location: c.location || "",
            industry_tags: [],
          },
          score: {
            fit_score: fit,
            signal_score: signal,
            engagement_score: engagement,
            total_score: total,
            tier: tierFromTotal(total),
          },
          is_friend: !!c.isFriend,
          speak_frequency: c.speakFrequency || "",
          last_spoken_at: c.lastSpokenAt || "",
          graduation_year: c.graduationYear ?? null,
          created_at: c.createdAt || "",
          ...(unlocked ? {} : { isRedacted: true }),
        };
      })
      .sort((a, b) => b.score.total_score - a.score.total_score);

    return NextResponse.json(ranked);
  } catch {
    return NextResponse.json([]);
  }
}

