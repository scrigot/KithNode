import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import {
  detectAffiliations,
  computeWarmthScore,
  isValidLinkedInUrl,
} from "@/lib/linkedin-import";
import { redactName, redactLinkedInUrl } from "@/lib/redact";
import { isUnlocked } from "@/lib/contact-access";
import { contactNeedsInfo } from "@/lib/needs-info";
import {
  engagementScore,
  relationshipClass,
  isDormantKith,
  displayTier,
} from "@/lib/relationship-score";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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
        // isFriend / lastSpokenAt / speakFrequency are the OWNER's private data on
        // the shared pool row. For a contact the viewer doesn't own (a high_value
        // pool link), never surface them — they'd imply a relationship that's the
        // importer's, not the viewer's. The viewer's own pipeline stage still
        // promotes via stageByContact (per-user). Mirrors POOL_SAFE_FIELDS in redact.
        const owns = !c.importedByUserId || c.importedByUserId === userId;
        const ownIsFriend = owns ? c.isFriend : false;
        const ownLastSpokenAt = owns ? c.lastSpokenAt : null;
        const ownSpeakFrequency = owns ? c.speakFrequency : "";
        const klass = relationshipClass({
          isFriend: ownIsFriend,
          pipelineStage: stageByContact.get(c.id),
          lastSpokenAt: ownLastSpokenAt,
          now,
        });
        const engagement = engagementScore({
          lastSpokenAt: ownLastSpokenAt,
          speakFrequency: ownSpeakFrequency,
          now,
        });
        const dormant = klass === "kith" && isDormantKith({ lastSpokenAt: ownLastSpokenAt, now });
        const displayedTier = displayTier(c.tier, klass);
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
            tier: displayedTier,
          },
          relationship_class: klass,
          dormant,
          needs_info: contactNeedsInfo(c, displayedTier),
          is_friend: !!ownIsFriend,
          speak_frequency: ownSpeakFrequency || "",
          last_spoken_at: ownLastSpokenAt || "",
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

/**
 * POST - manually create a single contact from typed fields (Import → Manual →
 * "Add by hand", and the legacy add-contact slide-over). Scopes to the caller
 * via importedByUserId (the only tenant guard, since AlumniContact is written
 * with the service-role client) and scores it with the same affiliation logic as
 * the CSV/LinkedIn import so it lands tiered, not blank.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const firmName = typeof body.firmName === "string" ? body.firmName.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const university = typeof body.university === "string" ? body.university.trim() : "";
  const linkedInUrl = typeof body.linkedInUrl === "string" ? body.linkedInUrl.trim() : "";

  const gradRaw = Number(body.graduationYear);
  const graduationYear =
    Number.isInteger(gradRaw) && gradRaw >= 1950 && gradRaw <= 2100 ? gradRaw : 0;

  // Reject a malformed URL instead of persisting it (it would later render as an
  // href on the contact page). Blank is allowed — manual contacts are URL-less.
  if (linkedInUrl && !isValidLinkedInUrl(linkedInUrl)) {
    return NextResponse.json({ error: "Invalid LinkedIn URL format" }, { status: 400 });
  }

  const prefs = await getUserPrefs(userEmail);
  const affiliations = detectAffiliations(
    { name, education: university, location: "", experience: firmName, title },
    prefs,
  );
  const { score, tier } = computeWarmthScore(affiliations);

  const record = {
    name,
    title,
    firmName,
    email: "",
    linkedInUrl,
    university,
    education: university,
    location: "",
    affiliations: affiliations.map((a) => a.name).join(","),
    warmthScore: score,
    tier,
    graduationYear,
    source: "manual",
    importedByUserId: userId,
  };

  // Owner-scoped dedup: if I already have this person by LinkedIn URL, refresh
  // the row instead of inserting a duplicate. The importedByUserId filter keeps
  // another user's same-URL row not-found (never overwritten).
  if (linkedInUrl) {
    const { data: mine } = await supabase
      .from("AlumniContact")
      .select("id")
      .eq("linkedInUrl", linkedInUrl)
      .eq("importedByUserId", userId)
      .maybeSingle();
    if (mine?.id) {
      await supabase.from("AlumniContact").update(record).eq("id", mine.id);
      return NextResponse.json({ id: mine.id, name, firmName, title, tier, warmthScore: score });
    }
  }

  const { data: inserted, error } = await supabase
    .from("AlumniContact")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    // 23505 = the LinkedIn URL is already in the shared pool (possibly another
    // user's). Don't echo the raw DB error; return a clean message.
    const conflict = error.code === "23505";
    return NextResponse.json(
      { error: conflict ? "This contact is already in the network" : "Failed to add contact" },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ id: inserted?.id, name, firmName, title, tier, warmthScore: score });
}

