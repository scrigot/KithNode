/**
 * One-way roadmap -> DB mirror sync for the Founder Cockpit.
 *
 * ops/roadmap.md is the single source of truth. This regenerates the cockpit's
 * read-mirror from it: parse -> link each milestone to a phase by gate -> REPLACE
 * the `phases` + `milestones` tables (delete + insert) via the service-role
 * Supabase client (the same project the /api/ops/overview route reads). The
 * cockpit is read-only; this sync + the agents are the only writers.
 *
 * `ops_events` (the per-lane recent-changes feed) is NOT synced here: the
 * build-log has no [Lane] tags yet, so attributing events to lanes would be a
 * guess. That path is a follow-up once OPS_LOG entries carry a lane.
 *
 * Run:
 *   npm run db:roadmap-sync            # writes the mirror
 *   npm run db:roadmap-sync -- --dry   # prints the plan, writes nothing
 *
 * The "synced Nh ago" badge reads max(phase.createdAt); a full replace stamps
 * createdAt=now, so the badge stays honest without a dedicated column.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: ".env.local" });

const DRY = process.argv.includes("--dry");

/** Stable, human-debuggable id from a phase/task label. */
function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "x";
}

async function main() {
  const { parseRoadmap } = await import("../src/lib/ops/roadmap-sync");
  const { supabase } = await import("../src/lib/supabase");

  const roadmapPath = resolve(process.cwd(), "ops/roadmap.md");
  const text = readFileSync(roadmapPath, "utf8");
  const { phases: parsedPhases, milestones: parsedMilestones } =
    parseRoadmap(text);

  const now = new Date().toISOString();

  // Phase rows: deterministic slug ids; createdAt=now keeps the freshness badge honest.
  const phaseRows = parsedPhases.map((p, i) => ({
    id: `phase-${i}-${slugify(p.name)}`,
    name: p.name,
    gate: p.gate,
    order: p.order,
    status: p.status,
    doneAt: p.status === "done" ? now : null,
    createdAt: now,
  }));

  // Link each milestone to the FIRST non-done phase whose gate matches — so G0
  // tasks land under the active phase, not the done Foundation phase. No match
  // (a future gate with no phase yet) -> null, which renders "Unphased".
  const phaseForGate = (gate: string): string | null =>
    phaseRows.find((p) => p.gate === gate && p.status !== "done")?.id ?? null;

  const msRows = parsedMilestones.map((m, i) => ({
    id: `ms-${m.lane}-${m.gate}-${m.order}-${i}`,
    title: m.title,
    lane: m.lane,
    phaseId: phaseForGate(m.gate),
    gate: m.gate,
    status: m.status,
    order: m.order,
    doneAt: m.status === "done" ? now : null,
    createdAt: now,
  }));

  // Report
  console.log(
    `Parsed ${phaseRows.length} phases, ${msRows.length} milestones from ops/roadmap.md`,
  );
  for (const p of phaseRows) {
    console.log(`  phase  ${p.status.padEnd(8)} ${(p.gate || "--").padEnd(3)}  ${p.name}`);
  }
  const linked = msRows.filter((m) => m.phaseId).length;
  console.log(
    `  milestones linked to a phase: ${linked}/${msRows.length} (unlinked = future gate, shows Unphased)`,
  );
  const active = phaseRows.find((p) => p.status === "active");
  if (active) {
    const open = msRows.filter(
      (m) => m.phaseId === active.id && m.status !== "done",
    ).length;
    console.log(`  next-up under active "${active.name}": ${open} open task(s)`);
  } else {
    console.log("  WARNING: no active phase -> the next-10 list will be empty");
  }

  if (DRY) {
    console.log("\n--dry: parsed and validated, no writes performed.");
    return;
  }

  // REPLACE phases + milestones. Delete milestones first (FK on phaseId).
  // ops_events is intentionally left untouched.
  const delM = await supabase.from("milestones").delete().neq("id", "");
  if (delM.error) throw new Error(`delete milestones: ${delM.error.message}`);
  const delP = await supabase.from("phases").delete().neq("id", "");
  if (delP.error) throw new Error(`delete phases: ${delP.error.message}`);

  const insP = await supabase.from("phases").insert(phaseRows);
  if (insP.error) throw new Error(`insert phases: ${insP.error.message}`);
  if (msRows.length > 0) {
    const insM = await supabase.from("milestones").insert(msRows);
    if (insM.error) throw new Error(`insert milestones: ${insM.error.message}`);
  }

  console.log(
    `\nSynced ${phaseRows.length} phases + ${msRows.length} milestones -> Supabase. Cockpit reflects ops/roadmap.md.`,
  );
}

main().catch((e) => {
  console.error("roadmap sync failed:", e);
  process.exit(1);
});
