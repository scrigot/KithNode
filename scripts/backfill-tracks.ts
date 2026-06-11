#!/usr/bin/env tsx
/**
 * One-shot backfill: classify every AlumniContact that has no track yet into the
 * career-track taxonomy using the HEURISTIC classifier only (no LLM, no network
 * beyond Supabase). Pages through rows where track='', runs classifyCareer on
 * title + firmName + skills, and batch-updates ONLY the rows that classified to
 * a non-empty track. Idempotent: re-running it only touches still-blank rows.
 *
 * Usage:
 *   npx tsx scripts/backfill-tracks.ts
 *
 * Env: reads SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * from .env.local (same names as src/lib/supabase.ts). The service-role key is
 * required so the update bypasses RLS.
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { classifyCareer } from "../src/lib/classify-career";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — aborting.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 500;

async function main() {
  let scanned = 0;
  let classified = 0;
  let updated = 0;
  let failed = 0;

  // Cursor over the still-blank set. Updated rows leave the track='' filter, so
  // we never re-fetch them; rows we classified-blank stay in the set, so we keep
  // an offset that skips exactly those. This walks every row once, stably.
  let offset = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from("AlumniContact")
      .select("id, title, firmName, skills")
      .eq("track", "")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Fetch failed:", error.message);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    scanned += rows.length;

    // Classify in-memory; keep only rows that resolved to a non-empty track.
    const updates = rows
      .map((r) => {
        const { track, role } = classifyCareer({
          title: r.title || "",
          firmName: r.firmName || "",
          skills: r.skills || "",
        });
        return { id: r.id as string, track, role };
      })
      .filter((u) => u.track !== "");

    classified += updates.length;

    for (const u of updates) {
      const { error: upErr } = await supabase
        .from("AlumniContact")
        .update({ track: u.track, role: u.role })
        .eq("id", u.id);
      if (upErr) {
        failed++;
        console.error(`  update failed for ${u.id}: ${upErr.message}`);
      } else {
        updated++;
      }
    }

    // Rows that stayed blank this page remain in the filter — step the cursor
    // past them so the next page is fresh. Updated rows already dropped out.
    offset += rows.length - updates.length;

    if (rows.length < PAGE_SIZE) break; // last (partial) page processed
  }

  console.log("Backfill complete:", {
    scanned,
    classified,
    updated,
    failed,
    leftBlank: scanned - classified,
  });
}

main().catch((err) => {
  console.error("Backfill crashed:", err);
  process.exit(1);
});
