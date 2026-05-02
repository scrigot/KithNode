#!/usr/bin/env tsx
// Local CLI for seeding Kenan-Flagler + supplementary connections into AlumniContact.
//
// Usage:
//   npx tsx scripts/seed-kenan.ts --user-id <email> [--source kenan_faculty|kenan_news_alumni|unc_greek_clubs|all] [--dry-run]
//
// No auth, no subscription gate. Intended for local backfills against a dev/branch DB.
// Run against prod only when Sam explicitly confirms.

import { scrapeKenanFaculty } from "../src/lib/professors/kenan-directory";
import { scrapeKenanNewsAlumni } from "../src/lib/connections/kenan-news-alumni";
import { scrapeUncGroups } from "../src/lib/connections/unc-greek-clubs";
import { upsertAlumniContact } from "../src/lib/connections/upsert";
import type { AlumniSeed } from "../src/lib/connections/types";
import type { Professor } from "../src/lib/professors/scraper";

type SourceKey = "kenan_faculty" | "kenan_news_alumni" | "unc_greek_clubs";

const ALL_SOURCES: SourceKey[] = ["kenan_faculty", "kenan_news_alumni", "unc_greek_clubs"];

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

function parseArgs(): { userId: string; sources: SourceKey[]; dryRun: boolean } {
  const args = process.argv.slice(2);
  let userId = "";
  let sourceArg = "all";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user-id" && args[i + 1]) {
      userId = args[++i];
    } else if (args[i] === "--source" && args[i + 1]) {
      sourceArg = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  if (!userId) {
    console.error("Error: --user-id is required");
    process.exit(1);
  }

  const sources: SourceKey[] =
    sourceArg === "all"
      ? ALL_SOURCES
      : [sourceArg as SourceKey];

  return { userId, sources, dryRun };
}

interface SourceStats {
  scraped: number;
  inserted: number;
  updated: number;
  failed: number;
}

async function runSource(
  source: SourceKey,
  userId: string,
  dryRun: boolean,
): Promise<SourceStats> {
  const stats: SourceStats = { scraped: 0, inserted: 0, updated: 0, failed: 0 };

  let seeds: AlumniSeed[] = [];

  if (source === "kenan_faculty") {
    console.log(`[${source}] Scraping Kenan-Flagler faculty directory...`);
    const profs = await scrapeKenanFaculty({ throttleMs: 1200 });
    seeds = profs.map(professorToAlumniSeed);
  } else if (source === "kenan_news_alumni") {
    console.log(`[${source}] Scraping Kenan-Flagler news alumni (5 pages)...`);
    seeds = await scrapeKenanNewsAlumni({ throttleMs: 1200, maxPages: 5 });
  } else if (source === "unc_greek_clubs") {
    console.log(`[${source}] Scraping UNC Greek/club groups...`);
    seeds = await scrapeUncGroups({ throttleMs: 1200 });
  }

  stats.scraped = seeds.length;
  console.log(`[${source}] Scraped ${seeds.length} records`);

  if (dryRun) {
    console.log(`[${source}] Dry run -- skipping upsert`);
    return stats;
  }

  for (const seed of seeds) {
    try {
      const result = await upsertAlumniContact(seed, userId);
      if (result === "inserted") {
        stats.inserted++;
      } else {
        stats.updated++;
      }
    } catch (err) {
      stats.failed++;
      console.warn(`[${source}] Upsert failed for "${seed.name}":`, err instanceof Error ? err.message : err);
    }
  }

  return stats;
}

function printSummary(results: Record<string, SourceStats>): void {
  const border = "─".repeat(60);
  console.log("\n" + border);
  console.log(
    "  source".padEnd(24) +
    "scraped".padEnd(10) +
    "inserted".padEnd(10) +
    "updated".padEnd(10) +
    "failed",
  );
  console.log(border);

  let totScraped = 0, totInserted = 0, totUpdated = 0, totFailed = 0;

  for (const [source, s] of Object.entries(results)) {
    totScraped += s.scraped;
    totInserted += s.inserted;
    totUpdated += s.updated;
    totFailed += s.failed;
    console.log(
      `  ${source}`.padEnd(24) +
      String(s.scraped).padEnd(10) +
      String(s.inserted).padEnd(10) +
      String(s.updated).padEnd(10) +
      String(s.failed),
    );
  }

  console.log(border);
  console.log(
    "  TOTAL".padEnd(24) +
    String(totScraped).padEnd(10) +
    String(totInserted).padEnd(10) +
    String(totUpdated).padEnd(10) +
    String(totFailed),
  );
  console.log(border + "\n");
}

async function main(): Promise<void> {
  const { userId, sources, dryRun } = parseArgs();

  console.log(`\nSeed Kenan pipeline`);
  console.log(`  user-id : ${userId}`);
  console.log(`  sources : ${sources.join(", ")}`);
  console.log(`  dry-run : ${dryRun}\n`);

  const results: Record<string, SourceStats> = {};

  for (const source of sources) {
    results[source] = await runSource(source, userId, dryRun);
  }

  printSummary(results);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
