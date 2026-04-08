// POST /api/discover/run — Stage 6 of the discover pipeline.
//
// Orchestrates the five lib/discover stages end-to-end for the current
// user, persists discovered contacts into AlumniContact, and returns a
// summary the dashboard can render. The flow:
//
//   1. Load user prefs (school / greek / hometown / target firms / industries / locations)
//   2. seeds = seedsForIndustries(prefs.targetIndustries) — capped per mode
//   3. findContacts(seeds) — walks team pages, falls back to DDG LinkedIn dork
//   4. For each ContactCandidate, in parallel batches:
//        signals = detectSignals(candidate, prefs)   // Stage 4
//        email   = findEmail(name, domain)            // Stage 5 (Hunter waterfall)
//        result  = rank({ signals, emailConfidence, title }) // ranker
//   5. Upsert into AlumniContact, dedupe by linkedInUrl or by (name + importedByUserId)
//
// Hunter is OPTIONAL — if HUNTER_API_KEY is unset the email finder
// gracefully falls through to pattern guessing. This lets the route
// ship before the env var is provisioned in Vercel.

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";
import { getUserPrefs } from "@/lib/user-prefs";
import { findContacts, type CompanyInput } from "@/lib/discover/contact-finder";
import { detectSignals } from "@/lib/discover/signal-detector";
import { findEmail } from "@/lib/discover/email-finder";
import { rank } from "@/lib/discover/ranker";
import { seedsForIndustries } from "@/lib/discover/seeds";

const QUICK_SEED_CAP = 5;
const DEEP_SEED_CAP = 15;
const QUICK_PER_COMPANY = 3;
const DEEP_PER_COMPANY = 5;
// Hunter free tier is 50 / month. Cap a single run so one click can't
// burn the entire monthly quota — the email-finder gracefully falls
// through to pattern guessing once Hunter is disabled.
const QUICK_HUNTER_BUDGET = 10;
const DEEP_HUNTER_BUDGET = 30;

interface DiscoverRunBody {
  mode?: "quick" | "deep";
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId || userId === "anonymous") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as DiscoverRunBody;
  const mode = body.mode === "deep" ? "deep" : "quick";

  const prefs = await getUserPrefs(userId);
  const allSeeds = seedsForIndustries(prefs.targetIndustries);
  if (allSeeds.length === 0) {
    return NextResponse.json(
      {
        error: "no_seeds",
        message:
          "Set at least one targetIndustry in Settings (Investment Banking, Private Equity, Hedge Fund, Consulting, or Big 4) to discover new contacts.",
      },
      { status: 400 },
    );
  }

  const seedCap = mode === "deep" ? DEEP_SEED_CAP : QUICK_SEED_CAP;
  const perCompany = mode === "deep" ? DEEP_PER_COMPANY : QUICK_PER_COMPANY;
  const hunterBudget = mode === "deep" ? DEEP_HUNTER_BUDGET : QUICK_HUNTER_BUDGET;
  const seeds = allSeeds.slice(0, seedCap);

  // ── Stage 3: contact extraction ──────────────────────────────────────
  const companies: CompanyInput[] = seeds.map((s) => ({
    name: s.name,
    domain: s.domain,
    website: s.website,
  }));
  const candidates = await findContacts(companies, {
    maxPerCompany: perCompany,
    throttleMs: 800,
  });

  // ── Stages 4 + 5: signals + email + rank ────────────────────────────
  // Sequential through email-finder so the Hunter budget guard fires
  // BEFORE issuing each call (parallel would race past the budget). The
  // signal detector still runs concurrently with the email finder per
  // contact since the two share no state.
  const hunterApiKey = process.env.HUNTER_API_KEY || undefined;
  let hunterCallsMade = 0;
  const enriched: Array<{
    candidate: (typeof candidates)[number];
    signals: Awaited<ReturnType<typeof detectSignals>>;
    email: Awaited<ReturnType<typeof findEmail>>;
    ranked: ReturnType<typeof rank>;
  }> = [];

  for (const candidate of candidates) {
    // Hunter is skipped for this contact when no key is set OR the
    // per-run budget is exhausted. Pattern-cached hits don't count
    // against the budget — only un-cached calls reach Hunter. We can't
    // know in advance whether findEmail will hit the cache, so we
    // optimistically reserve a budget slot per call.
    const skipHunter = !hunterApiKey || hunterCallsMade >= hunterBudget;
    const [signals, email] = await Promise.all([
      detectSignals(candidate, prefs),
      findEmail(candidate.name, candidate.companyDomain, { hunterApiKey, skipHunter }),
    ]);
    if (email.source === "hunter_verified") hunterCallsMade++;
    const ranked = rank({
      signals,
      emailConfidence: email.confidence,
      title: candidate.title,
    });
    enriched.push({ candidate, signals, email, ranked });
  }

  // ── Persistence: upsert into AlumniContact ───────────────────────────
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const persistedSummaries: Array<{
    name: string;
    company: string;
    score: number;
    tier: string;
    confidence: number;
    emailSource: string;
    signalCount: number;
  }> = [];

  for (const row of enriched) {
    try {
      const affiliationsCsv = row.signals.map((s) => s.label).join(",");
      const record = {
        name: row.candidate.name,
        title: row.candidate.title,
        firmName: row.candidate.company,
        email: row.email.email,
        linkedInUrl: row.candidate.linkedinUrl,
        university: "",
        education: "",
        location: "",
        affiliations: affiliationsCsv,
        warmthScore: row.ranked.score,
        tier: row.ranked.tier,
        source: "discover_run",
        importedByUserId: userId,
        enrichedAt: new Date().toISOString(),
        enrichmentSource: "discover_pipeline",
      };

      // Dedup: by LinkedIn URL first (canonical), then by (name + user).
      let existingId: string | undefined;
      if (record.linkedInUrl) {
        const { data } = await supabase
          .from("AlumniContact")
          .select("id")
          .eq("linkedInUrl", record.linkedInUrl)
          .maybeSingle();
        existingId = data?.id;
      }
      if (!existingId) {
        const { data } = await supabase
          .from("AlumniContact")
          .select("id")
          .eq("name", record.name)
          .eq("firmName", record.firmName)
          .eq("importedByUserId", userId)
          .maybeSingle();
        existingId = data?.id;
      }

      if (existingId) {
        const { error } = await supabase
          .from("AlumniContact")
          .update(record)
          .eq("id", existingId);
        if (error) throw new Error(error.message);
        updated++;
      } else {
        const { error } = await supabase
          .from("AlumniContact")
          .insert({ ...record, graduationYear: 0 });
        if (error) throw new Error(error.message);
        imported++;
      }

      persistedSummaries.push({
        name: row.candidate.name,
        company: row.candidate.company,
        score: row.ranked.score,
        tier: row.ranked.tier,
        confidence: row.ranked.confidence,
        emailSource: row.email.source,
        signalCount: row.signals.length,
      });
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    mode,
    seedsAttempted: seeds.length,
    candidatesFound: candidates.length,
    imported,
    updated,
    failed,
    contacts: persistedSummaries,
    hunterEnabled: !!hunterApiKey,
    hunterCallsMade,
    hunterBudget,
  });
}
