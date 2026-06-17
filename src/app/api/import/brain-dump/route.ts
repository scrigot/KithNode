import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";
import {
  parseBrainDumpCSV,
  brainDumpRowToContact,
  buildBrainDumpPrompt,
  type BrainDumpBackground,
} from "@/lib/brain-dump";
import { slugFromLinkedInUrl } from "@/lib/mutuals";
import { randomUUID } from "node:crypto";

/**
 * /api/import/brain-dump — the AI brain-dump enrichment lane.
 *
 * GET hands the user the brain-dump prompt with their own background pre-filled
 * (so the shared-affiliation questions key off their school/Greek/clubs). POST
 * imports the enriched CSV they paste back: it parses + maps each row with the
 * PURE engine in @/lib/brain-dump, name-merges onto the caller's existing
 * contacts (captured non-empty wins, else keep), and re-scores with the same
 * shared helper enrich + ingest use — mirroring the merge+rescore in
 * /api/extension/ingest.
 */

const MAX_ROWS = 200;

/** captured non-empty value wins; otherwise keep what's already on the row. */
const prefer = (captured: string, existing: unknown): string =>
  captured.trim() || (typeof existing === "string" ? existing : "");

/** Lowercased, whitespace-collapsed name — the name-merge key. */
const normName = (name: string): string =>
  (name || "").toLowerCase().replace(/\s+/g, " ").trim();

/** friend/close → true, acquaintance/weak → explicit false, blank → keep current. */
function friendFromCloseness(closeness: string, current: boolean): boolean {
  const c = (closeness || "").toLowerCase();
  if (c === "friend" || c === "close") return true;
  if (c === "acquaintance" || c === "weak") return false;
  return current;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await getUserPrefs(session.user.email);
  const bg: BrainDumpBackground = {
    school: prefs.university,
    major: prefs.major,
    clubs: (prefs.clubs ?? []).join("; "),
    greekOrg: prefs.greekOrg,
    hometown: prefs.hometown,
    highSchool: prefs.highSchool,
    goal: (prefs.targetIndustries ?? []).join(", "),
  };

  return NextResponse.json({ prompt: buildBrainDumpPrompt(bg) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  const body = (await request.json().catch(() => ({}))) as { csvText?: string };
  const csvText = body.csvText || "";
  if (csvText.length > 500_000) {
    return NextResponse.json(
      { error: "Pasted data is too large (over 500 KB)." },
      { status: 413 },
    );
  }
  const rows = parseBrainDumpCSV(csvText).slice(0, MAX_ROWS);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in the pasted data" }, { status: 400 });
  }

  // Load the caller's existing contacts ONCE; index by normalized name so each
  // parsed row either updates a known person or inserts a fresh one.
  const { data: existingRows } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("importedByUserId", userId);
  // Index existing contacts by both LinkedIn slug (the strong key) and
  // normalized name, so an enriched row merges onto the right person.
  const byName = new Map<string, Record<string, unknown>>();
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const row of existingRows ?? []) {
    byName.set(normName(row.name as string), row);
    const slug = slugFromLinkedInUrl((row.linkedInUrl as string) || "");
    if (slug) bySlug.set(slug, row);
  }

  const prefs = await getUserPrefs(userEmail);
  const now = new Date().toISOString();

  // Collapse same-batch duplicates (last row wins) so one person can't be split
  // across an insert AND an update, or inserted twice, within a single paste.
  const deduped = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = slugFromLinkedInUrl(r.linkedin_url || "") || normName(r.name);
    if (k) deduped.set(k, r);
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const results: { name: string; tier: string; score: number }[] = [];

  for (const row of deduped.values()) {
    try {
      const patch = brainDumpRowToContact(row);
      const slug = slugFromLinkedInUrl(patch.linkedInUrl);
      let existing = slug ? bySlug.get(slug) ?? null : null;
      if (!existing) {
        // Name fallback, but only when it can't be a DIFFERENT person: merge by
        // name only if the existing row has no real LinkedIn URL, or its URL
        // agrees with the incoming one. A different real URL = different person.
        const nameMatch = byName.get(normName(patch.name)) ?? null;
        if (nameMatch) {
          const existingSlug = slugFromLinkedInUrl((nameMatch.linkedInUrl as string) || "");
          if (existingSlug === "" || existingSlug === slug) existing = nameMatch;
        }
      }

      // Captured non-empty wins, else keep the existing value (the whole point:
      // the user's first-hand knowledge fills what LinkedIn's bare CSV lacks).
      const merged = {
        name: prefer(patch.name, existing?.name),
        firmName: prefer(patch.firmName, existing?.firmName),
        title: prefer(patch.title, existing?.title),
        linkedInUrl: prefer(patch.linkedInUrl, existing?.linkedInUrl),
        education: prefer(patch.education, existing?.education),
        university: prefer(patch.university, existing?.university),
        major: prefer(patch.major, existing?.major),
        clubs: prefer(patch.clubs, existing?.clubs),
        greekOrg: prefer(patch.greekOrg, existing?.greekOrg),
        hometown: prefer(patch.hometown, existing?.hometown),
        highSchool: prefer(patch.highSchool, existing?.highSchool),
        skills: prefer(patch.skills, existing?.skills),
        passions: prefer(patch.passions, existing?.passions),
        isFriend: friendFromCloseness(patch.closeness, Boolean(existing?.isFriend)),
      };

      const tags = existing?.id ? await loadContactTags(userEmail, existing.id as string) : [];
      const { affiliations, score, tier } = rescoreContact(
        { ...(existing ?? {}), ...merged },
        prefs,
        tags,
      );
      const affiliationsCol = affiliations.map((a) => a.name).join(",");

      if (existing?.id) {
        const { error } = await supabase
          .from("AlumniContact")
          .update({
            ...merged,
            affiliations: affiliationsCol,
            warmthScore: score,
            tier,
            source: "brain_dump",
            enrichmentSource: "brain_dump",
            enrichedAt: now,
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        updated++;
      } else {
        const { error } = await supabase.from("AlumniContact").insert({
          ...merged,
          // A blank linkedInUrl collides on the global unique index; give
          // URL-less net-new contacts a unique non-URL sentinel instead.
          linkedInUrl: merged.linkedInUrl || `noprofile:${randomUUID()}`,
          university: merged.university || merged.education,
          importedByUserId: userId,
          graduationYear: 0,
          affiliations: affiliationsCol,
          warmthScore: score,
          tier,
          source: "brain_dump",
          enrichmentSource: "brain_dump",
          enrichedAt: now,
        });
        if (error) throw new Error(error.message);
        created++;
      }

      results.push({ name: merged.name, tier, score });
    } catch {
      // A single bad row is skipped, never aborts the batch.
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    imported: created + updated,
    created,
    updated,
    failed,
    contacts: results.map((r) => ({ name: r.name, tier: r.tier, score: r.score })),
  });
}
