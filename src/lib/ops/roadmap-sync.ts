/**
 * Pure parser: ops/roadmap.md text -> Phase[] + Milestone[].
 *
 * Markdown is the single source of truth (one-way; the DB is a derived mirror
 * the /kithnode-roadmap sync upserts from these results). Pure — no DB, no fs,
 * no React. Tolerant by contract: a malformed line, an unknown lane heading, an
 * unknown gate token, or an empty file all SKIP cleanly; the parser never
 * throws. The route never calls this at request time (Vercel can't read
 * ops/*.md at runtime) — it runs in the sync where the file is read.
 *
 * Grammar it recognises (matching ops/roadmap.md):
 *   Phases   — under a `## Phases` heading, lines like:
 *                `- [x] Foundation — ... (shipped).`
 *                `- [ ] **P0 — Beta with 5 users [G0] (ACTIVE)** — ...`
 *   Tasks    — under a `### <Lane>` heading (Product/Eng, Growth/Marketing, …),
 *              lines like: `- [ ] [G0] Onboard the first real beta user ...`
 *              `- [x] [G2] Content-engine = ... (built).`
 */

import { LANES } from "./lane-config";
import type { PhaseStatus, MilestoneStatus } from "./cockpit";

export interface ParsedPhase {
  name: string;
  gate: string;
  order: number;
  status: PhaseStatus;
}

export interface ParsedMilestone {
  title: string;
  lane: string; // a valid lane key (see lane-config)
  gate: string; // "G0".."G4"
  status: MilestoneStatus;
  order: number;
  /** Phase index hint (the active phase) — left unset here; the sync resolves
   *  phaseId by upserting phases first. Parser only emits lane/gate/status. */
}

export interface ParsedRoadmap {
  phases: ParsedPhase[];
  milestones: ParsedMilestone[];
}

const VALID_GATES: ReadonlySet<string> = new Set([
  "G0",
  "G1",
  "G2",
  "G3",
  "G4",
]);

// Map a `### Heading` line to a lane key. The roadmap uses labels like
// "Product/Eng", "Growth/Marketing", "Ops/Founder-OS"; match on the first word
// against the lane labels/keys so heading drift (extra qualifiers) still binds.
const HEADING_TO_LANE: ReadonlyMap<string, string> = new Map(
  LANES.flatMap((l) => {
    const first = l.label.split("/")[0].trim().toLowerCase();
    return [
      [l.label.toLowerCase(), l.key] as [string, string],
      [l.key.toLowerCase(), l.key] as [string, string],
      [first, l.key] as [string, string],
    ];
  }),
);

/** Resolve a `### <heading>` line to a lane key, or null if unknown. */
function laneFromHeading(heading: string): string | null {
  const h = heading.trim().toLowerCase();
  if (HEADING_TO_LANE.has(h)) return HEADING_TO_LANE.get(h)!;
  // Fall back to first-word match (e.g. "Product/Eng" -> "product").
  const first = h.split(/[\s/]+/)[0];
  return HEADING_TO_LANE.get(first) ?? null;
}

const CHECK_RE = /^- \[( |x|X)\]\s+(.*)$/;
const GATE_RE = /\[(G[0-4])\]/;
// Phase lines sometimes carry a compound transition token like "[G0 -> G1]";
// capture the FIRST gate inside any bracketed group for the phase's gate.
const PHASE_GATE_RE = /\[\s*(G[0-4])/;

/** Parse the leading `- [ ]` / `- [x]` checkbox; null if the line isn't one. */
function parseCheckbox(line: string): { done: boolean; rest: string } | null {
  const m = CHECK_RE.exec(line.trimEnd());
  if (!m) return null;
  return { done: m[1].toLowerCase() === "x", rest: m[2].trim() };
}

/**
 * Parse a phase line under `## Phases`. Recognises an optional `**P0 — Name**`
 * bold wrapper, a `[Gn]` gate, and an `(ACTIVE)` marker. Returns null to skip a
 * line that has no gate (e.g. the "Foundation" shipped row has none -> we still
 * accept it as a done phase with gate "" so the ladder shows it). Tolerant.
 */
function parsePhaseLine(rest: string, done: boolean): ParsedPhase | null {
  if (!rest) return null;
  // Strip bold wrappers.
  const text = rest.replace(/\*\*/g, "");
  const gateMatch = PHASE_GATE_RE.exec(text);
  const gate = gateMatch ? gateMatch[1] : "";
  const isActive = /\(active\)/i.test(text);

  // Strip an optional "Pn — " phase-code prefix so the human label after it is
  // the name (the roadmap labels phases "P0 — Beta with 5 users [G0]"), then take
  // the text before the first " — " / " - " / " [" / " (".
  const deprefixed = text.replace(/^P\d+\s*[—-]\s*/i, "");
  const name = deprefixed
    .split(/\s+[—-]\s+|\s+\[|\s+\(/)[0]
    .trim();
  if (!name) return null;

  const status: PhaseStatus = done
    ? "done"
    : isActive
      ? "active"
      : "planned";

  return { name, gate, order: 0, status };
}

/**
 * Parse a task line under a lane heading. Requires a recognised `[Gn]` gate;
 * skips the line (returns null) if the gate is missing or unknown. Title = the
 * text after the gate token, trimmed.
 */
function parseTaskLine(
  rest: string,
  done: boolean,
  lane: string,
  order: number,
): ParsedMilestone | null {
  if (!rest) return null;
  const gateMatch = GATE_RE.exec(rest);
  if (!gateMatch) return null;
  const gate = gateMatch[1];
  if (!VALID_GATES.has(gate)) return null;

  const title = rest.replace(GATE_RE, "").trim();
  if (!title) return null;

  return {
    title,
    lane,
    gate,
    status: done ? "done" : "planned",
    order,
  };
}

/**
 * Parse roadmap markdown text into phases + milestones. Section state machine:
 * a `## Phases` heading opens the phase section; a `### <Lane>` heading sets the
 * current lane (or clears it on an unknown heading); any other `##`/`###`
 * heading closes the active section. Empty input -> { phases:[], milestones:[] }.
 */
export function parseRoadmap(text: string | null | undefined): ParsedRoadmap {
  const phases: ParsedPhase[] = [];
  const milestones: ParsedMilestone[] = [];
  if (!text || typeof text !== "string") return { phases, milestones };

  const lines = text.split(/\r?\n/);
  let inPhases = false;
  let currentLane: string | null = null;
  let phaseOrder = 0;
  let taskOrder = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Section headings.
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      inPhases = /^##\s+phases\b/i.test(line);
      currentLane = null;
      continue;
    }
    if (/^###\s+/.test(line)) {
      const heading = line.replace(/^###\s+/, "");
      currentLane = laneFromHeading(heading);
      inPhases = false;
      taskOrder = 0;
      continue;
    }

    const cb = parseCheckbox(line);
    if (!cb) continue;

    if (inPhases) {
      const phase = parsePhaseLine(cb.rest, cb.done);
      if (phase) {
        phase.order = phaseOrder++;
        phases.push(phase);
      }
      continue;
    }

    if (currentLane) {
      const task = parseTaskLine(cb.rest, cb.done, currentLane, taskOrder);
      if (task) {
        taskOrder++;
        milestones.push(task);
      }
    }
  }

  return { phases, milestones };
}
