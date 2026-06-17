// POST /api/connections/seed -- Orchestrates ingestion from all non-LinkedIn
// connection sources (Kenan faculty, news alumni, UNC groups) into AlumniContact.
//
// Streams NDJSON progress events identical in shape to /api/professors/seed
// so the same dashboard UI patterns can render progress.
//
// Body: { sources?: Array<"kenan_faculty" | "kenan_news_alumni" | "unc_greek_clubs"> }
// Default: all sources.
//
// Stages: kenan-faculty -> kenan-news -> unc-groups -> saving -> done

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import { requireSubscription } from "@/lib/subscription";
import { scrapeKenanFaculty } from "@/lib/professors/kenan-directory";
import { scrapeKenanNewsAlumni } from "@/lib/connections/kenan-news-alumni";
import { scrapeUncGroups } from "@/lib/connections/unc-greek-clubs";
import { upsertAlumniContact } from "@/lib/connections/upsert";
import type { AlumniSeed } from "@/lib/connections/types";
import type { Professor } from "@/lib/professors/scraper";

type SourceKey = "kenan_faculty" | "kenan_news_alumni" | "unc_greek_clubs";

const ALL_SOURCES: SourceKey[] = ["kenan_faculty", "kenan_news_alumni", "unc_greek_clubs"];

export type SeedEvent =
  | { type: "stage"; stage: string; message: string; progress: number }
  | {
      type: "done";
      progress: 100;
      scraped: number;
      inserted: number;
      updated: number;
      failed: number;
      bySource: Record<string, { scraped: number; inserted: number; updated: number; failed: number }>;
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

/** Convert a Professor (from kenan-directory scraper) to AlumniSeed. */
function professorToAlumniSeed(prof: Professor): AlumniSeed {
  return {
    name: prof.name,
    title: prof.title,
    firmName: prof.department,
    email: prof.email,
    sourceUrl: prof.profileUrl || "",
    bio: prof.bio,
    university: "UNC",
    location: "Chapel Hill, NC",
    affiliations: prof.researchAreas.length > 0 ? prof.researchAreas.join(",") : "",
    source: "kenan_faculty",
    researchAreas: prof.researchAreas,
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

  let body: { sources?: SourceKey[] } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine -- default all sources.
  }
  const sources = Array.isArray(body.sources) ? body.sources : ALL_SOURCES;

  // ── Streaming pipeline ──────────────────────────────────────────────
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = makeEmitter(controller);
      const aborted = { value: false };
      const onAbort = () => { aborted.value = true; };
      request.signal.addEventListener("abort", onAbort);

      const bySource: Record<string, { scraped: number; inserted: number; updated: number; failed: number }> = {};
      let totalScraped = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      // Progress budget: scrape phases 0-60, save phase 60-98, done 100.
      const sourceCount = sources.length;
      const scrapeProgressPerSource = sourceCount > 0 ? Math.floor(60 / sourceCount) : 60;

      try {
        let progressOffset = 0;

        for (let si = 0; si < sources.length; si++) {
          const source = sources[si];
          if (aborted.value) { send({ type: "aborted" }); return; }

          bySource[source] = { scraped: 0, inserted: 0, updated: 0, failed: 0 };

          // ── Scrape stage ──
          send({
            type: "stage",
            stage: source,
            message: `Scraping ${source}...`,
            progress: progressOffset + 2,
          });

          let seeds: AlumniSeed[] = [];

          if (source === "kenan_faculty") {
            const profs = await scrapeKenanFaculty({ throttleMs: 1200 });
            seeds = profs.map(professorToAlumniSeed);
          } else if (source === "kenan_news_alumni") {
            seeds = await scrapeKenanNewsAlumni({ throttleMs: 1200, maxPages: 5 });
          } else if (source === "unc_greek_clubs") {
            seeds = await scrapeUncGroups({ throttleMs: 1200 });
          }

          bySource[source].scraped = seeds.length;
          totalScraped += seeds.length;

          send({
            type: "stage",
            stage: source,
            message: `Scraped ${seeds.length} records from ${source}`,
            progress: progressOffset + scrapeProgressPerSource,
          });

          progressOffset += scrapeProgressPerSource;

          // ── Save stage (inline per source) ──
          if (aborted.value) { send({ type: "aborted" }); return; }

          send({
            type: "stage",
            stage: "saving",
            message: `Saving ${seeds.length} records from ${source}`,
            progress: 62,
          });

          for (const seed of seeds) {
            if (aborted.value) { send({ type: "aborted" }); return; }
            try {
              const result = await upsertAlumniContact(seed, userId);
              if (result === "inserted") {
                bySource[source].inserted++;
                totalInserted++;
              } else {
                bySource[source].updated++;
                totalUpdated++;
              }
            } catch {
              bySource[source].failed++;
              totalFailed++;
            }
          }
        }

        send({
          type: "done",
          progress: 100,
          scraped: totalScraped,
          inserted: totalInserted,
          updated: totalUpdated,
          failed: totalFailed,
          bySource,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "connections seed pipeline failed",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          // Already closed on abort.
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
