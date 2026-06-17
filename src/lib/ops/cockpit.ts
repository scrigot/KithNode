/**
 * Pure logic for the Founder Cockpit v2 (phased timeline + per-lane summaries).
 *
 * Everything here is a pure function — no DB, no React, no Prisma imports — so
 * it unit-tests directly (see cockpit.test.ts). The API route (/api/ops/overview)
 * reads Phase/Milestone/OpsEvent rows + metrics signals and feeds plain objects
 * in; the client renders the output.
 *
 * Input types are defined LOCALLY (the route maps its DB rows to these shapes)
 * so the pure module never depends on the generated Prisma types. A missing or
 * malformed signal degrades to a neutral result; nothing here throws.
 */

import type { Health } from "./metrics";
import type { LaneMaturity } from "./lane-config";

// ─── Local input shapes (the route maps DB rows -> these) ────────────────────
export type PhaseStatus = "planned" | "active" | "done";
export type MilestoneStatus = "planned" | "in_progress" | "done" | "at_risk";

export interface PhaseInput {
  id: string;
  name: string;
  gate: string; // "G0".."G4"
  order: number;
  status: string; // validated to PhaseStatus; unknown -> "planned"
}

export interface MilestoneInput {
  id: string;
  title: string;
  lane: string;
  phaseId: string | null;
  gate: string;
  status: string; // validated to MilestoneStatus; unknown -> "planned"
  order: number;
  note?: string | null;
  evidence?: string | null;
}

export interface OpsEventInput {
  id: string;
  lane: string;
  kind: string; // shipped | learned | decided
  summary: string;
  ref?: string | null;
  createdAt: string; // ISO
}

/** A lane's live headline stat, already computed by the route. */
export interface LaneStat {
  label: string;
  value: string;
  health: Health;
}

// ─── Output shapes ────────────────────────────────────────────────────────────
export interface TimelinePhase {
  id: string;
  name: string;
  gate: string;
  order: number;
  status: PhaseStatus;
  active: boolean;
  chip: { label: string; health: Health };
}

export interface Timeline {
  phases: TimelinePhase[];
  /** The active phase id, or null when none/zero phases. */
  activePhaseId: string | null;
}

export interface NextTask {
  id: string;
  title: string;
  lane: string;
  gate: string;
  status: MilestoneStatus;
}

export interface LaneSummary {
  key: string;
  label: string;
  maturity: LaneMaturity;
  agents: string[];
  /** The live stat, or null -> the card renders a muted "manual". */
  stat: LaneStat | null;
  /** Count of incomplete milestones in the lane (advisory). */
  openCount: number;
  /** Most-recent change summaries for the lane (capped by the caller's input). */
  recent: OpsEventInput[];
}

const PHASE_STATUSES: ReadonlySet<string> = new Set([
  "planned",
  "active",
  "done",
]);
const MILESTONE_STATUSES: ReadonlySet<string> = new Set([
  "planned",
  "in_progress",
  "done",
  "at_risk",
]);

function asPhaseStatus(s: string | null | undefined): PhaseStatus {
  return s && PHASE_STATUSES.has(s) ? (s as PhaseStatus) : "planned";
}

function asMilestoneStatus(s: string | null | undefined): MilestoneStatus {
  return s && MILESTONE_STATUSES.has(s) ? (s as MilestoneStatus) : "planned";
}

/** A milestone counts as incomplete unless it is "done". */
function isIncomplete(status: MilestoneStatus): boolean {
  return status !== "done";
}

// ─── phaseChip — map a phase status to a chip label + Health ─────────────────
/**
 * Status chip for a phase. done=good, active=teal-ish "good"? No — active is the
 * focal/neutral-positive state, planned is neutral, at-risk has no phase status.
 * Mapping: done -> good (shipped), active -> warn? Keep it honest and semantic:
 * done=good, active=neutral (it is the current focus, not a success/failure),
 * planned=neutral. A null/unknown phase degrades to a neutral "planned" chip.
 */
export function phaseChip(
  phase: { status?: string | null } | null | undefined,
): { label: string; health: Health } {
  const status = asPhaseStatus(phase?.status);
  switch (status) {
    case "done":
      return { label: "done", health: "good" };
    case "active":
      return { label: "active", health: "neutral" };
    default:
      return { label: "planned", health: "neutral" };
  }
}

// ─── buildTimeline — ordered phase ladder + the active phase ─────────────────
/**
 * Build the timeline ladder from phases (+ milestones, reserved for future
 * per-phase rollups). Phases are sorted by `order` (stable, ascending). The
 * active phase is the first phase whose status is "active"; if none is marked
 * active, activePhaseId is null (the UI then shows the ladder without a focus).
 * Zero phases -> empty ladder + null active. Never throws.
 */
export function buildTimeline(
  phases: PhaseInput[] | null | undefined,
  _milestones?: MilestoneInput[] | null,
): Timeline {
  const list = Array.isArray(phases) ? phases : [];
  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const activePhaseId =
    sorted.find((p) => asPhaseStatus(p.status) === "active")?.id ?? null;

  const out: TimelinePhase[] = sorted.map((p) => {
    const status = asPhaseStatus(p.status);
    return {
      id: p.id,
      name: p.name,
      gate: p.gate,
      order: p.order ?? 0,
      status,
      active: p.id === activePhaseId,
      chip: phaseChip({ status }),
    };
  });

  return { phases: out, activePhaseId };
}

// ─── nextTasks — next N incomplete milestones under the active phase ─────────
/**
 * The next `n` incomplete milestones under the active phase, ordered by `order`
 * then title. When activePhase is null/missing, returns []. Caps at `n`
 * (default 10). 0 incomplete -> []. Never throws.
 */
export function nextTasks(
  milestones: MilestoneInput[] | null | undefined,
  activePhaseId: string | null | undefined,
  n = 10,
): NextTask[] {
  if (!activePhaseId) return [];
  const list = Array.isArray(milestones) ? milestones : [];

  return list
    .filter((m) => m.phaseId === activePhaseId)
    .filter((m) => isIncomplete(asMilestoneStatus(m.status)))
    .sort((a, b) => {
      const byOrder = (a.order ?? 0) - (b.order ?? 0);
      if (byOrder !== 0) return byOrder;
      return (a.title ?? "").localeCompare(b.title ?? "");
    })
    .slice(0, Math.max(0, n))
    .map((m) => ({
      id: m.id,
      title: m.title,
      lane: m.lane,
      gate: m.gate,
      status: asMilestoneStatus(m.status),
    }));
}

// ─── laneSummary — one lane's roster + stat + recent changes ─────────────────
/**
 * Summarize a single lane for the OrgBand card / drill-down. An empty lane (no
 * agents) stays "manual"; a missing stat (null) degrades to a neutral card with
 * no fabricated number. `recent` is passed through as-is (the caller caps the
 * count + ordering). Never throws.
 */
export function laneSummary(
  lane: {
    key: string;
    label: string;
    phase: LaneMaturity;
    agents: string[];
  },
  milestones: MilestoneInput[] | null | undefined,
  events: OpsEventInput[] | null | undefined,
  stat: LaneStat | null | undefined,
): LaneSummary {
  const ms = Array.isArray(milestones) ? milestones : [];
  const openCount = ms.filter(
    (m) => m.lane === lane.key && isIncomplete(asMilestoneStatus(m.status)),
  ).length;

  const recent = (Array.isArray(events) ? events : []).filter(
    (e) => e.lane === lane.key,
  );

  return {
    key: lane.key,
    label: lane.label,
    maturity: lane.phase,
    agents: Array.isArray(lane.agents) ? lane.agents : [],
    stat: stat ?? null,
    openCount,
    recent,
  };
}

// ─── maturityChip — SEMANTIC colors for the lane maturity chip ───────────────
/**
 * Map a lane maturity to a chip label + Health. SEMANTIC colors only
 * (manual=warn/amber "opportunity", copilot=neutral/teal-ish, autonomous=good/
 * green), NEVER the brand tier palette — avoids the HOT/WARM data-classification
 * collision (brand/dashboard.md). copilot maps to "neutral" so healthChip uses
 * the muted token; the teal accent is applied at the component layer for the
 * staffed state.
 */
export function maturityChip(maturity: LaneMaturity): {
  label: string;
  health: Health;
} {
  switch (maturity) {
    case "autonomous":
      return { label: "autonomous", health: "good" };
    case "copilot":
      return { label: "copilot", health: "neutral" };
    default:
      return { label: "manual", health: "warn" };
  }
}
