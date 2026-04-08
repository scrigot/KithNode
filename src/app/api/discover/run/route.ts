// POST /api/discover/run — Stage 6 of the discover pipeline.
//
// Streams NDJSON progress events back to the dashboard so the user sees
// the pipeline advancing in real time (one line per event, content-type
// application/x-ndjson). Quick mode runs ~60–100s end-to-end so a
// blocking single-fetch with no feedback is unacceptable; the streamed
// shape lets the modal overlay render a real progress bar and a kill
// switch wired to AbortController on the client side.
//
// Pipeline:
//   1. auth → load prefs            (event: stage "prefs")
//   2. resolve seeds                  (event: stage "seeds")
//   3. findContacts(seeds)            (event: stage "scanning" per company)
//   4. detectSignals + findEmail + rank per candidate
//                                     (event: stage "enriching" per contact)
//   5. Supabase upsert per contact    (event: stage "saving")
//   6. final summary                  (event: type "done", progress 100)
//
// Early validation errors (401 unauthorized, 400 no_seeds) still return
// as plain JSON Responses so the client can branch before opening the
// streaming reader. Anything past validation is streamed.

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
const QUICK_HUNTER_BUDGET = 10;
const DEEP_HUNTER_BUDGET = 30;

interface DiscoverRunBody {
  mode?: "quick" | "deep";
}

// ── Event taxonomy ──────────────────────────────────────────────────
//
// Every line emitted on the wire is one of these JSON shapes followed by
// a newline. The client treats `progress` (0–100) as monotonically
// non-decreasing within a single run.

export type DiscoverEvent =
  | { type: "stage"; stage: string; message: string; progress: number }
  | {
      type: "done";
      progress: 100;
      mode: "quick" | "deep";
      seedsAttempted: number;
      candidatesFound: number;
      imported: number;
      updated: number;
      failed: number;
      hunterEnabled: boolean;
      hunterCallsMade: number;
      hunterBudget: number;
      contacts: Array<{
        name: string;
        company: string;
        score: number;
        tier: string;
        confidence: number;
        emailSource: string;
        signalCount: number;
      }>;
    }
  | { type: "error"; message: string }
  | { type: "aborted" };

// Internal helper to keep `start()` readable.
function makeEmitter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  return (event: DiscoverEvent) => {
    try {
      controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
    } catch {
      // Controller may have closed mid-emit if the client aborted —
      // swallow so the pipeline can exit cleanly without an unhandled
      // rejection.
    }
  };
}

export async function POST(request: NextRequest) {
  // ── Pre-stream validation (still plain JSON) ────────────────────────
  const userId = await getUserId();
  if (!userId || userId === "anonymous") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as DiscoverRunBody;
  const mode: "quick" | "deep" = body.mode === "deep" ? "deep" : "quick";

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
  const hunterApiKey = process.env.HUNTER_API_KEY || undefined;

  // ── Streaming pipeline ──────────────────────────────────────────────
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = makeEmitter(controller);
      const aborted = { value: false };
      const onAbort = () => {
        aborted.value = true;
      };
      request.signal.addEventListener("abort", onAbort);

      try {
        send({ type: "stage", stage: "prefs", message: "Loading preferences", progress: 5 });

        send({
          type: "stage",
          stage: "seeds",
          message: `Resolving ${seeds.length} target firms`,
          progress: 10,
        });
        if (aborted.value) {
          send({ type: "aborted" });
          return;
        }

        // ── Stage 3: contact extraction with per-firm progress ──────
        const companies: CompanyInput[] = seeds.map((s) => ({
          name: s.name,
          domain: s.domain,
          website: s.website,
        }));
        const candidates = await findContacts(companies, {
          maxPerCompany: perCompany,
          throttleMs: 800,
          signal: request.signal,
          onProgress: ({ index, total, company, foundForCompany, foundTotal }) => {
            // Allocate 10% → 65% of the bar to scanning.
            const pct = 10 + Math.round(((index + 1) / total) * 55);
            send({
              type: "stage",
              stage: "scanning",
              message: `Scanned ${company.name} (${index + 1}/${total}) — found ${foundForCompany}, ${foundTotal} total`,
              progress: pct,
            });
          },
        });
        if (aborted.value) {
          send({ type: "aborted" });
          return;
        }

        // ── Stages 4 + 5: signals + email + rank ────────────────────
        let hunterCallsMade = 0;
        const enriched: Array<{
          candidate: (typeof candidates)[number];
          signals: Awaited<ReturnType<typeof detectSignals>>;
          email: Awaited<ReturnType<typeof findEmail>>;
          ranked: ReturnType<typeof rank>;
        }> = [];

        for (let i = 0; i < candidates.length; i++) {
          if (aborted.value) {
            send({ type: "aborted" });
            return;
          }
          const candidate = candidates[i];
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
          // Allocate 65% → 90% of the bar to enrichment.
          const pct =
            candidates.length === 0
              ? 90
              : 65 + Math.round(((i + 1) / candidates.length) * 25);
          send({
            type: "stage",
            stage: "enriching",
            message: `Enriched ${candidate.name} (${i + 1}/${candidates.length}) — ${email.source}`,
            progress: pct,
          });
        }

        // ── Persistence ─────────────────────────────────────────────
        send({
          type: "stage",
          stage: "saving",
          message: `Saving ${enriched.length} contacts`,
          progress: 92,
        });

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
          if (aborted.value) {
            send({ type: "aborted" });
            return;
          }
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

        send({
          type: "done",
          progress: 100,
          mode,
          seedsAttempted: seeds.length,
          candidatesFound: candidates.length,
          imported,
          updated,
          failed,
          hunterEnabled: !!hunterApiKey,
          hunterCallsMade,
          hunterBudget,
          contacts: persistedSummaries,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "discover pipeline failed",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime on abort — ignore.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
