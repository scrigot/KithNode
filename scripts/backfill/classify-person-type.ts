#!/usr/bin/env tsx
/**
 * Backfill AlumniContact.personType (and graduationYear when inferable) so the
 * Discover pools (Alumni | Professor | Student) sort by what a contact IS,
 * not where they were imported from.
 *
 * Rule-assigned (no AI): faculty sources => professor; campus-club sources =>
 * student. Everything else (linkedin_*, discover_run) is classified from
 * title + firm via the AI Gateway (src/lib/discover/classify-person-type.ts).
 * Rows that already have a personType are skipped.
 *
 * Usage:
 *   npx tsx scripts/backfill/classify-person-type.ts                 # DRY RUN (prints, writes nothing)
 *   npx tsx scripts/backfill/classify-person-type.ts --limit 40      # dry run, first 40 only (sample)
 *   npx tsx scripts/backfill/classify-person-type.ts --apply         # WRITE to the DB
 *   npx tsx scripts/backfill/classify-person-type.ts --apply --limit 200
 *
 * Env (.env.local, same loader as scripts/dev/groupme-pull-once.ts):
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  — DB writes
 *   AI_GATEWAY_API_KEY                                    — gateway classification
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const PROFESSOR_SOURCES = new Set(["professor", "kenan_faculty", "industry_adjunct"]);
const STUDENT_SOURCES = new Set(["unc_greek_clubs", "unc_finance_clubs", "unc_student_orgs"]);

type Row = {
  id: string;
  name: string | null;
  title: string | null;
  firmName: string | null;
  education: string | null;
  graduationYear: number | null;
  source: string | null;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const { supabase } = await import("../../src/lib/supabase");
  const { classifyPersonType } = await import("../../src/lib/discover/classify-person-type");

  console.log(`[backfill] mode=${apply ? "APPLY (writes)" : "DRY RUN"} limit=${limit}`);

  // Pull every contact still missing a personType. Page past PostgREST's 1000-row
  // cap with a stable order so windows never skip/overlap.
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("AlumniContact")
      .select("id, name, title, firmName, education, graduationYear, source")
      .or("personType.is.null,personType.eq.")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  const work = rows.slice(0, Number.isFinite(limit) ? limit : rows.length);
  console.log(`[backfill] ${rows.length} rows missing personType; processing ${work.length}`);

  const counts = { student: 0, alum: 0, professor: 0 };
  let aiCalls = 0;
  let updated = 0;
  const sample: string[] = [];

  // Process in concurrency-bounded chunks so we don't open thousands of gateway
  // sockets at once. Rule-assigned rows resolve instantly (no AI).
  const CONCURRENCY = 6;
  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const chunk = work.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (r) => {
        const src = r.source || "";
        let personType: "student" | "alum" | "professor";
        let gradYear: number | null = r.graduationYear || null;
        let conf = 1;

        if (PROFESSOR_SOURCES.has(src)) {
          personType = "professor";
        } else if (STUDENT_SOURCES.has(src)) {
          personType = "student";
        } else {
          aiCalls++;
          const res = await classifyPersonType({
            name: r.name || "",
            title: r.title || "",
            firmName: r.firmName || "",
            education: r.education || undefined,
            graduationYear: r.graduationYear || undefined,
          });
          personType = res.personType;
          gradYear = res.graduationYear;
          conf = res.confidence;
        }

        counts[personType]++;
        if (sample.length < 40) {
          sample.push(
            `${personType.padEnd(9)} ${String(conf).padStart(4)}  ${(r.title || "?").slice(0, 38).padEnd(38)} @ ${(r.firmName || "?").slice(0, 32)}`,
          );
        }

        if (apply) {
          const patch: Record<string, unknown> = { personType };
          // Only fill graduationYear when we learned one and the row lacked it.
          if (gradYear && !r.graduationYear) patch.graduationYear = gradYear;
          const { error } = await supabase.from("AlumniContact").update(patch).eq("id", r.id);
          if (error) console.error(`[backfill] update failed id=${r.id}:`, error.message);
          else updated++;
        }
      }),
    );
    if ((i / CONCURRENCY) % 10 === 0) {
      console.log(`[backfill] ...${Math.min(i + CONCURRENCY, work.length)}/${work.length}`);
    }
  }

  console.log("\n[backfill] sample classifications (type | conf | title @ firm):");
  console.log(sample.join("\n"));
  console.log("\n[backfill] summary:", JSON.stringify({ ...counts, aiCalls, updated, apply }, null, 2));
  if (!apply) console.log("[backfill] DRY RUN — nothing written. Re-run with --apply to persist.");
}

main().catch((err) => {
  console.error("[backfill] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
