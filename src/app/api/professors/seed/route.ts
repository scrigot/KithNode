// POST /api/professors/seed -- Scrapes all 4 UNC departments, classifies each
// professor via AI, then upserts into the AlumniContact table with
// source="professor". Streams NDJSON progress events exactly like
// /api/discover/run so the client can render a real progress bar.
//
// Pipeline:
//   1. auth guard (plain JSON 401 if not authed)
//   2. scrapeAllDepartments     (events: stage "scraping", progress 5 -> 40)
//   3. classifyBatch            (events: stage "classifying", progress 40 -> 75)
//   4. upsert per professor     (events: stage "saving", progress 80 -> 98)
//   5. done summary             (event: type "done", progress 100)

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import { scrapeAllDepartments } from "@/lib/professors/scraper";
import { classifyBatch, type ClassifierOutput } from "@/lib/professors/classifier";
import { requireSubscription } from "@/lib/subscription";
import { upsertAlumniContact } from "@/lib/connections/upsert";
import type { AlumniSeed } from "@/lib/connections/types";
import type { Professor } from "@/lib/professors/scraper";

// ── Helpers ─────────────────────────────────────────────────────────

function professorToSeed(prof: Professor, cls: ClassifierOutput): AlumniSeed {
  const affiliations = [
    `proftype:${cls.profType}`,
    ...cls.researchAreas,
    cls.recentPaper ? `paper:${cls.recentPaper}` : "",
  ]
    .filter(Boolean)
    .join(",");

  return {
    name: prof.name,
    title: prof.title,
    firmName: prof.department,
    email: prof.email,
    sourceUrl: prof.profileUrl || "",
    bio: prof.bio,
    university: "UNC",
    location: "Chapel Hill, NC",
    affiliations,
    source: "kenan_faculty",
  };
}

// ── Event taxonomy ──────────────────────────────────────────────────

export type SeedEvent =
  | { type: "stage"; stage: string; message: string; progress: number }
  | {
      type: "done";
      progress: 100;
      scraped: number;
      classified: number;
      inserted: number;
      updated: number;
      failed: number;
      contacts: Array<{
        name: string;
        department: string;
        profType: string;
        hasEmail: boolean;
      }>;
    }
  | { type: "error"; message: string }
  | { type: "aborted" };

function makeEmitter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  return (event: SeedEvent) => {
    try {
      controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
    } catch {
      // Controller may have closed mid-emit if the client aborted.
    }
  };
}

export async function POST(request: NextRequest) {
  // ── Pre-stream validation (plain JSON) ──────────────────────────────
  const userId = await getUserId();
  if (!userId || userId === "anonymous") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const gate = await requireSubscription(userId);
  if (gate) return gate;

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
        // Stage 1: scrape
        send({
          type: "stage",
          stage: "scraping",
          message: "Scraping UNC department faculty pages",
          progress: 5,
        });

        const professors = await scrapeAllDepartments({ throttleMs: 1200 });

        if (aborted.value) {
          send({ type: "aborted" });
          return;
        }

        send({
          type: "stage",
          stage: "scraping",
          message: `Scraped ${professors.length} professors`,
          progress: 40,
        });

        // Stage 2: classify
        send({
          type: "stage",
          stage: "classifying",
          message: `Classifying ${professors.length} professors`,
          progress: 40,
        });

        const classifications = await classifyBatch(professors, { concurrency: 5 });

        if (aborted.value) {
          send({ type: "aborted" });
          return;
        }

        send({
          type: "stage",
          stage: "classifying",
          message: `Classified ${classifications.length} professors`,
          progress: 75,
        });

        // Stage 3: save
        send({
          type: "stage",
          stage: "saving",
          message: `Saving ${professors.length} professors`,
          progress: 80,
        });

        let inserted = 0;
        let updated = 0;
        let failed = 0;
        const contactSummaries: Array<{
          name: string;
          department: string;
          profType: string;
          hasEmail: boolean;
        }> = [];

        for (let i = 0; i < professors.length; i++) {
          if (aborted.value) {
            send({ type: "aborted" });
            return;
          }

          const prof = professors[i];
          const cls = classifications[i];

          try {
            const seed = professorToSeed(prof, cls);
            const result = await upsertAlumniContact(seed, userId);
            if (result === "inserted") {
              inserted++;
            } else {
              updated++;
            }

            contactSummaries.push({
              name: prof.name,
              department: prof.department,
              profType: cls.profType,
              hasEmail: prof.email.length > 0,
            });

            // Progress sweep 80 -> 98 across the save loop
            const pct =
              professors.length === 0
                ? 98
                : 80 + Math.round(((i + 1) / professors.length) * 18);
            send({
              type: "stage",
              stage: "saving",
              message: `Saved ${prof.name} (${i + 1}/${professors.length})`,
              progress: pct,
            });
          } catch {
            failed++;
          }
        }

        send({
          type: "done",
          progress: 100,
          scraped: professors.length,
          classified: classifications.length,
          inserted,
          updated,
          failed,
          contacts: contactSummaries,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "professor seed pipeline failed",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime on abort.
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
