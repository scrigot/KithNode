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
import { applyOverlay } from "@/lib/contact-overrides";
import { contactNeedsInfo } from "@/lib/needs-info";
import {
  engagementScore,
  isDormantKith,
  displayTier,
} from "@/lib/relationship-score";
import {
  classifyRelationship,
  type RelationshipEvidenceInput,
} from "@/lib/relationships/classifier";

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

      // Layer the viewer's private overlay over each discovered (non-owned) row
      // so the list reflects their edits (e.g. a corrected title), mirroring the
      // contact detail GET. Personal columns are blanked by applyOverlay anyway,
      // and the mapping below re-blanks owner-private fields for non-owned rows.
      if (discoveredContacts.length > 0) {
        const { data: ovRows } = await supabase
          .from("contact_override")
          .select("contact_id, overrides")
          .eq("user_id", userId)
          .in("contact_id", Array.from(highValueIds));
        const ovByContact = new Map<string, Record<string, unknown>>(
          (ovRows || []).map((r) => [
            r.contact_id as string,
            (r.overrides as Record<string, unknown>) ?? {},
          ]),
        );
        // applyOverlay EVERY discovered (non-owned) row — even with no overlay it
        // blanks the canonical owner's personal columns, so the importer's
        // relationship data never leaks, AND a claimer's own overlay relationship
        // fields (isFriend / lastSpokenAt) surface, matching the detail page.
        discoveredContacts = discoveredContacts.map(
          (c) => applyOverlay(c, ovByContact.get(c.id) ?? {}) as typeof c,
        );
      }
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
    const contactIds = all.map((contact) => contact.id);
    const [connectionResult, evidenceResult] = contactIds.length
      ? await Promise.all([
          supabase
            .from("Connection")
            .select("alumniId,status")
            .eq("userId", userId)
            .in("alumniId", contactIds),
          supabase
            .from("RelationshipEvidence")
            .select("contactId,state,relationshipType,source,summary,confidence,verifiedByUser,effectiveAt,expiresAt")
            .eq("userId", userId)
            .in("contactId", contactIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    const connectionByContact = new Map<string, string>(
      (connectionResult.data || []).map((row) => [
        String(row.alumniId),
        String(row.status || ""),
      ]),
    );
    const evidenceByContact = new Map<string, RelationshipEvidenceInput[]>();
    for (const row of evidenceResult.data || []) {
      const contactId = String(row.contactId);
      evidenceByContact.set(contactId, [
        ...(evidenceByContact.get(contactId) || []),
        row as RelationshipEvidenceInput,
      ]);
    }

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
        // isFriend / lastSpokenAt / speakFrequency are the VIEWER's own here:
        // canonical for owned rows, the viewer's overlay (canonical blanked) for
        // discovered rows — every discovered row was run through applyOverlay
        // above, so the importer's private relationship data can never leak. The
        // viewer's own pipeline stage also promotes via stageByContact (per-user).
        const viewIsFriend = c.isFriend;
        const viewLastSpokenAt = c.lastSpokenAt;
        const viewSpeakFrequency = c.speakFrequency;
        const relationship = classifyRelationship({
          id: c.id,
          name: c.name || "",
          title: c.title,
          firmName: c.firmName,
          linkedInUrl: c.linkedInUrl,
          affiliations: c.affiliations,
          source: c.source,
          isFriend: viewIsFriend,
          lastSpokenAt: viewLastSpokenAt,
          connectionStatus:
            connectionByContact.get(c.id) || stageByContact.get(c.id),
          evidence: evidenceByContact.get(c.id) || [],
        }, new Date(now));
        const klass = relationship.state === "verified" ? "kith" : "";
        const engagement = engagementScore({
          lastSpokenAt: viewLastSpokenAt,
          speakFrequency: viewSpeakFrequency,
          now,
        });
        const dormant = klass === "kith" && isDormantKith({ lastSpokenAt: viewLastSpokenAt, now });
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
          skills: c.skills || "",
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
          relationship_state: relationship.state,
          relationship_type: relationship.relationshipType,
          relationship_evidence: relationship.evidence,
          relationship_confidence: relationship.confidence,
          dormant,
          needs_info: contactNeedsInfo(c, displayedTier),
          is_friend: !!viewIsFriend,
          speak_frequency: viewSpeakFrequency || "",
          last_spoken_at: viewLastSpokenAt || "",
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
