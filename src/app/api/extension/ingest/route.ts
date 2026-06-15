import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";
import { isValidLinkedInUrl } from "@/lib/linkedin-import";
import { classifyCareer } from "@/lib/classify-career";
import {
  parseExperiences,
  parseEducations,
  firmsFromExperiences,
  flatFromEducations,
} from "@/lib/educations";
import { parseClubMemberships, clubsFlatFromMemberships } from "@/lib/club-memberships";
import { classifyOrg } from "@/lib/classify-org";
import { deduceHometown } from "@/lib/deduce-hometown";
import { SPEAK_FREQUENCIES } from "@/lib/relationship-score";
import {
  parseCapturedMutuals,
  buildContactLookup,
  buildMutualEdges,
  contactMatchKeys,
} from "@/lib/mutuals";

/**
 * POST /api/extension/ingest — the LinkedIn capture extension posts ONE parsed
 * profile here. We upsert the contact by LinkedIn URL (scoped to the caller),
 * fill the rich dimensions the CSV import + PDL enrich can't get for students
 * (skills / experiences / clubs / education), derive the flat matcher columns,
 * and re-score with the same shared helper enrich uses.
 *
 * Auth is the normal session cookie (the extension fetches with credentials so
 * the kithnode.ai login is reused). The cookie is read by auth() exactly like
 * every other route — nothing extension-specific in the trust path.
 */

interface CapturedExperience {
  title?: string;
  firm?: string;
  start?: string;
  end?: string;
}
interface CapturedEducation {
  school?: string;
  major?: string;
  degree?: string;
  concentration?: string;
}
interface CapturedClub {
  club?: string;
  role?: string;
}
interface CapturedProfile {
  linkedInUrl?: string;
  name?: string;
  headline?: string;
  company?: string;
  location?: string;
  skills?: string[];
  experiences?: CapturedExperience[];
  educations?: CapturedEducation[];
  clubs?: (CapturedClub | string)[];
  mutuals?: ({ name: string; slug?: string } | string)[];
  graduationYear?: number;
  highSchool?: string;
  notes?: string;
  tags?: string[];
  isFriend?: boolean;
  speakFrequency?: string;
  lastSpokenAt?: string;
}

/** captured non-empty value wins; otherwise keep what's already on the row. */
const prefer = (captured: string, existing: unknown): string =>
  captured.trim() || (typeof existing === "string" ? existing : "");

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const body = (await request.json().catch(() => ({}))) as CapturedProfile;
  const linkedInUrl = (body.linkedInUrl || "").trim();
  if (!isValidLinkedInUrl(linkedInUrl)) {
    return NextResponse.json({ error: "A valid LinkedIn profile URL is required" }, { status: 400 });
  }

  // ── Normalize the captured payload through the same parsers the app uses, so
  // caps + shapes match every other write path. ──────────────────────────────
  const expRows = parseExperiences(
    JSON.stringify(
      (body.experiences ?? []).map((e) => ({
        title: e.title ?? "",
        firm: e.firm ?? "",
        start: e.start ?? "",
        end: e.end ?? "",
      })),
    ),
  );
  const eduRows = parseEducations(
    JSON.stringify(
      (body.educations ?? []).map((e) => ({
        major: e.major ?? "",
        degree: e.degree ?? "",
        concentration: e.concentration ?? "",
      })),
    ),
  );
  const capturedClubRows = parseClubMemberships(
    JSON.stringify(
      (body.clubs ?? []).map((c) =>
        typeof c === "string" ? { club: c, role: "" } : { club: c.club ?? "", role: c.role ?? "" },
      ),
    ),
  );

  // ── #4 EXPERIENCE → CLUB. LinkedIn lists fraternity/club roles under
  // "Experience"; partition the parsed rows so orgs (club/greek) MOVE OUT of
  // experiences and become club entries, leaving only real jobs in experiences.
  const companyExp: typeof expRows = [];
  const movedClubRows: { club: string; role: string }[] = [];
  let movedGreekOrg = "";
  for (const e of expRows) {
    const org = classifyOrg(e.firm);
    if (org.kind === "club" || org.kind === "greek") {
      movedClubRows.push({ club: org.name, role: e.title });
      if (org.kind === "greek" && !movedGreekOrg) movedGreekOrg = org.name;
    } else {
      companyExp.push(e);
    }
  }
  // Merge moved org rows into the captured clubs, then re-parse so the merged
  // list is capped/deduped/cleaned by the same parser every other write uses.
  const clubRows = movedClubRows.length
    ? parseClubMemberships(JSON.stringify([...capturedClubRows, ...movedClubRows]))
    : capturedClubRows;

  const skillSeen = new Set<string>();
  const skills = (body.skills ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || skillSeen.has(k)) return false;
      skillSeen.add(k);
      return true;
    })
    .slice(0, 25)
    .join(", ");
  const eduFlat = flatFromEducations(eduRows);
  // Past employers only: exclude the current role (no end / "Present") — the
  // current firm lives in firmName, mirroring the PDL enrich convention. Derived
  // from the REMAINING company experiences (org rows were moved into clubs).
  const pastExp = companyExp.filter((e) => e.end && !/present/i.test(e.end));
  const pastFirms = firmsFromExperiences(pastExp).join(", ");
  const clubsFlat = clubsFlatFromMemberships(clubRows);
  const firstSchool = (body.educations ?? []).map((e) => e.school || "").find(Boolean) || "";

  // ── Find the existing contact (own network) by the profile SLUG, so URL
  // format variants (trailing slash, http/https, www) still match and we update
  // the row instead of creating a duplicate. ───────────────────────────────────
  const slug = (linkedInUrl.match(/\/in\/([^/?#]+)/i)?.[1] || "").toLowerCase();
  const { data: matches } = await supabase
    .from("AlumniContact")
    .select("*")
    .eq("importedByUserId", userId)
    .ilike("linkedInUrl", `%/in/${slug}%`)
    .limit(1);
  const existing = matches && matches[0] ? matches[0] : null;

  const name = prefer(body.name || "", existing?.name);
  const title = prefer(body.headline || "", existing?.title);
  const firmName = prefer(body.company || "", existing?.firmName);
  const location = prefer(body.location || "", existing?.location);
  const education = prefer(firstSchool, existing?.education);
  const highSchool = prefer(body.highSchool || "", existing?.highSchool);
  const graduationYear =
    typeof body.graduationYear === "number" &&
    body.graduationYear >= 1950 &&
    body.graduationYear <= 2100
      ? body.graduationYear
      : (existing?.graduationYear as number) || 0;

  // Captured rich dimensions overwrite when present (the whole point), else keep.
  const skillsCol = skills || (existing?.skills as string) || "";
  const experiencesCol = companyExp.length ? JSON.stringify(companyExp) : (existing?.experiences as string) || "";
  const clubMembershipsCol = clubRows.length ? JSON.stringify(clubRows) : (existing?.clubMemberships as string) || "";
  const clubsCol = clubsFlat || (existing?.clubs as string) || "";
  const educationsCol = eduRows.length ? JSON.stringify(eduRows) : (existing?.educations as string) || "";
  const major = prefer(eduFlat.major, existing?.major);
  const degrees = prefer(eduFlat.degrees, existing?.degrees);
  const concentration = prefer(eduFlat.concentration, existing?.concentration);
  const pastFirmsCol = pastFirms || (existing?.pastFirms as string) || "";

  // Track/role for cohort placement: keep an existing classification, else
  // classify from the captured headline + company + skills.
  const classified = classifyCareer({ title, firmName, skills: skillsCol });
  const track = (existing?.track as string) || classified.track || "";
  const role = (existing?.role as string) || classified.role || "";

  // A fraternity/sorority moved out of experiences fills greekOrg when it would
  // otherwise be empty; an existing value always wins.
  const greekOrg = (existing?.greekOrg as string) || movedGreekOrg || "";

  // ── #3 HOMETOWN. Once the merged highSchool is known, deduce a hometown from
  // it when the contact has none yet (deduceHometown returns "" for unknown or
  // ambiguous schools, so we never guess a city). ───────────────────────────
  let hometown = (existing?.hometown as string) || "";
  if (highSchool && !hometown) {
    const d = await deduceHometown(highSchool);
    if (d) hometown = d;
  }

  // ── #5 NOTES. Captured non-empty wins, else keep the existing note. ────────
  const notes = prefer((body.notes || "").trim().slice(0, 280), existing?.notes);

  // ── RELATIONSHIP. isFriend is a plain boolean; speakFrequency only overwrites
  // when it's a known cadence; lastSpokenAt becomes an ISO string only when it
  // parses, else null. None of these feed scoring. ──────────────────────────
  const isFriend = body.isFriend === true;
  const capturedFreq = (body.speakFrequency || "").trim().toLowerCase();
  const speakFrequency = (SPEAK_FREQUENCIES as readonly string[]).includes(capturedFreq)
    ? capturedFreq
    : (existing?.speakFrequency as string) || "";
  const lastSpokenMs = body.lastSpokenAt ? Date.parse(body.lastSpokenAt) : NaN;
  const lastSpokenAt = Number.isNaN(lastSpokenMs) ? null : new Date(lastSpokenMs).toISOString();

  const merged = {
    name,
    title,
    firmName,
    location,
    education,
    university: education,
    highSchool,
    hometown,
    graduationYear,
    greekOrg,
    skills: skillsCol,
    experiences: experiencesCol,
    clubMemberships: clubMembershipsCol,
    clubs: clubsCol,
    educations: educationsCol,
    major,
    degrees,
    concentration,
    pastFirms: pastFirmsCol,
    track,
    role,
    notes,
    isFriend,
    speakFrequency,
    lastSpokenAt,
    linkedInUrl,
  };

  // ── Re-score with the shared helper (loads tags so we never wipe them) ─────
  const prefs = await getUserPrefs(userId);
  const tags = existing?.id ? await loadContactTags(userId, existing.id as string) : [];
  const { affiliations, score, tier } = rescoreContact(
    { ...(existing ?? {}), ...merged },
    prefs,
    tags,
  );

  const record = {
    ...merged,
    affiliations: affiliations.map((a) => a.name).join(","),
    warmthScore: score,
    tier,
    source: "linkedin_extension",
    importedByUserId: userId,
    enrichedAt: new Date().toISOString(),
    enrichmentSource: "linkedin_extension",
  };

  let contactId: string;
  if (existing?.id) {
    const { error } = await supabase.from("AlumniContact").update(record).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    contactId = existing.id as string;
  } else {
    const { data: inserted, error } = await supabase.from("AlumniContact").insert(record).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    contactId = inserted.id as string;
  }

  // ── Mutual-connection edges. Wrapped so a failure here NEVER fails the ingest:
  // the contact is already saved. FORWARD writes this profile's captured mutuals
  // as owner-scoped edges (resolved to AlumniContacts where name/slug matches);
  // BACK-RESOLUTION links any of the owner's dangling edges that named THIS
  // person to the contact we just upserted. ────────────────────────────────────
  try {
    const capturedMutuals = parseCapturedMutuals(body.mutuals);
    if (capturedMutuals.length > 0) {
      const { data: ownerContacts } = await supabase
        .from("AlumniContact")
        .select("id, name, linkedInUrl")
        .eq("importedByUserId", userId);
      const edges = buildMutualEdges(
        userId,
        contactId,
        capturedMutuals,
        buildContactLookup(ownerContacts ?? []),
      );
      await supabase
        .from("ContactConnection")
        .upsert(edges, { onConflict: "ownerUserId,contactId,mutualKey" });
    }

    const keys = contactMatchKeys(name, linkedInUrl);
    if (keys.length) {
      await supabase
        .from("ContactConnection")
        .update({ mutualContactId: contactId })
        .eq("ownerUserId", userId)
        .is("mutualContactId", null)
        .neq("contactId", contactId)
        .in("mutualKey", keys);
    }
  } catch {
    // Edge writes are best-effort; the contact upsert above is the source of truth.
  }

  // ── #5 TAGS. Persist each captured tag as an owner-scoped contact_tags row,
  // reusing the tags route's insert shape. onConflict makes a re-capture idempotent;
  // wrapped so a tag failure NEVER fails the ingest (the contact is already saved).
  try {
    const tagSeen = new Set<string>();
    const tagRows = (body.tags ?? [])
      .map((t) => (typeof t === "string" ? t.trim().slice(0, 40) : ""))
      .filter((t) => {
        const k = t.toLowerCase();
        if (!t || tagSeen.has(k)) return false;
        tagSeen.add(k);
        return true;
      })
      .slice(0, 20)
      .map((tag) => ({ user_id: userId, contact_id: contactId, tag }));
    if (tagRows.length) {
      await supabase
        .from("contact_tags")
        .upsert(tagRows, { onConflict: "user_id,contact_id,tag", ignoreDuplicates: true });
    }
  } catch {
    // Tag writes are best-effort; the contact upsert above is the source of truth.
  }

  return NextResponse.json({
    ok: true,
    created: !existing?.id,
    contact: {
      id: contactId,
      name,
      tier,
      score,
      affiliations: affiliations.map((a) => a.name),
      skills: skillsCol ? skillsCol.split(",").map((s) => s.trim()).filter(Boolean).length : 0,
      clubs: clubRows.length,
      experiences: expRows.length,
      mutuals: parseCapturedMutuals(body.mutuals).length,
    },
  });
}
