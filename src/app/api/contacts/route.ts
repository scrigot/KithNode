import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redactName, redactLinkedInUrl } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";
import {
  engagementScore,
  relationshipClass,
  isDormantKith,
  displayTier,
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

    // Pipeline stages prove relationships: responded/meeting_set promotes a
    // contact into the KITH class (see relationshipClass).
    const { data: pipelineRows } = await supabase
      .from("PipelineEntry")
      .select("contactId, stage")
      .eq("userId", userId);
    const stageByContact = new Map<string, string>(
      (pipelineRows || []).map((p) => [p.contactId as string, (p.stage as string) || ""]),
    );

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
        // Two-axis model: score IS the stored affiliation fit (0..100);
        // relationship promotes into the KITH class above the fit tiers.
        // Engagement only orders contacts within a class + flags dormancy.
        const fit = c.warmthScore || 0;
        const klass = relationshipClass({
          isFriend: c.isFriend,
          pipelineStage: stageByContact.get(c.id),
          lastSpokenAt: c.lastSpokenAt,
          now,
        });
        const engagement = engagementScore({
          lastSpokenAt: c.lastSpokenAt,
          speakFrequency: c.speakFrequency,
          now,
        });
        const dormant = klass === "kith" && isDormantKith({ lastSpokenAt: c.lastSpokenAt, now });
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
            signal_score: 0,
            engagement_score: engagement,
            total_score: fit,
            tier: displayTier(c.tier, klass),
          },
          relationship_class: klass,
          dormant,
          is_friend: !!c.isFriend,
          speak_frequency: c.speakFrequency || "",
          last_spoken_at: c.lastSpokenAt || "",
          graduation_year: c.graduationYear ?? null,
          created_at: c.createdAt || "",
          ...(unlocked ? {} : { isRedacted: true }),
        };
      })
      .sort((a, b) => {
        // KITH class outranks every fit tier; fit orders within a class;
        // engagement breaks fit ties (most-recently-engaged first).
        const ak = a.relationship_class === "kith" ? 1 : 0;
        const bk = b.relationship_class === "kith" ? 1 : 0;
        if (ak !== bk) return bk - ak;
        if (b.score.total_score !== a.score.total_score) {
          return b.score.total_score - a.score.total_score;
        }
        return b.score.engagement_score - a.score.engagement_score;
      });

    return NextResponse.json(ranked);
  } catch {
    return NextResponse.json([]);
  }
}

