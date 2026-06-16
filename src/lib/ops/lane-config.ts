/**
 * The 8 business lanes of the Founder OS backbone (ops/roadmap.md), reused by
 * the cockpit's OrgBand + the /dashboard/ops/[lane] drill-down.
 *
 * Pure static config — no DB, no React. The lane KEYS are the canonical
 * identifiers stored on Milestone.lane / OpsEvent.lane and used as the [lane]
 * route param. Keeping this list here makes it the single source the route
 * validates against (unknown lane -> 404) and the sync attributes tasks to.
 *
 * `metricKey` says which already-computed metrics.ts signal feeds a lane's
 * headline stat (null = no live number; the card shows a muted "manual",
 * never a fabricated figure — the org-band honesty rule). `phase` is the
 * honest maturity self-audit (manual / copilot / autonomous); the amber
 * "manual" cells are the agent-deployment roadmap.
 */

// Which computed metrics.ts signal can feed a lane headline. Kept as a string
// union (not an import of metrics types) so this module stays dependency-free.
export type LaneMetricKey =
  | "velocity"
  | "funnel"
  | "totalBurn"
  | "taskHealth"
  | "revenue"
  | "activeUsers";

export type LaneMaturity = "manual" | "copilot" | "autonomous";

export interface LaneConfig {
  /** Canonical key — stored on Milestone.lane/OpsEvent.lane, the [lane] param. */
  key: string;
  /** Display label. */
  label: string;
  /** Computed signal that feeds the headline stat, or null for a phase-led card. */
  metricKey: LaneMetricKey | null;
  /** Honest maturity self-audit; drives the semantic chip (manual=amber). */
  phase: LaneMaturity;
  /** Agent(s) staffing the lane, or [] for an honest "manual" roster. */
  agents: string[];
}

/**
 * The 8 lanes, in the roadmap's scroll order. Maturity + agents are Sam's
 * honest self-audit (the strategic act, not a formality): a lane with a real
 * agent is copilot/teal; a 100%-manual lane is amber, i.e. where the next
 * agent pays off.
 */
export const LANES: readonly LaneConfig[] = [
  {
    key: "product",
    label: "Product / Eng",
    metricKey: "funnel",
    phase: "copilot",
    agents: ["kithnode-shipper"],
  },
  {
    key: "growth",
    label: "Growth / Marketing",
    metricKey: "velocity",
    phase: "copilot",
    agents: ["kithnode-content-engine"],
  },
  {
    key: "sales",
    label: "Sales",
    metricKey: "revenue",
    phase: "manual",
    agents: [],
  },
  {
    key: "finance",
    label: "Finance",
    metricKey: "totalBurn",
    phase: "manual",
    agents: [],
  },
  {
    key: "legal",
    label: "Legal / Compliance",
    metricKey: null,
    phase: "copilot",
    agents: ["kithnode-rls-checker"],
  },
  {
    key: "people",
    label: "People / Hiring",
    metricKey: null,
    phase: "manual",
    agents: [],
  },
  {
    key: "fundraising",
    label: "Fundraising",
    metricKey: null,
    phase: "manual",
    agents: [],
  },
  {
    key: "ops",
    label: "Ops / Founder-OS",
    metricKey: "taskHealth",
    phase: "copilot",
    agents: ["kithnode-roadmap-keeper", "kithnode-prioritizer"],
  },
] as const;

/** Set of valid lane keys — the route validates the [lane] param against this. */
export const LANE_KEYS: ReadonlySet<string> = new Set(LANES.map((l) => l.key));

/** Look up a lane config by key (undefined for an unknown lane). */
export function getLane(key: string): LaneConfig | undefined {
  return LANES.find((l) => l.key === key);
}

/**
 * Per-lane reference docs, rendered as links in the [lane] drill-down's right
 * sidebar. Repo-relative paths (the cockpit shows them as code-styled labels;
 * they are not fetched at request time — Vercel can't read ops/*.md at runtime).
 */
export const LANE_REFS: Readonly<Record<string, readonly string[]>> = {
  product: ["AGENTS.md", "ops/roadmap.md", "scripts/ralph/progress.txt"],
  growth: ["marketing/strategy.md", "ops/playbook.md", "marketing/reddit-playbook.md"],
  sales: ["ops/roadmap.md", "ops/playbook.md"],
  finance: ["src/lib/ops/metrics.ts", "ops/roadmap.md"],
  legal: ["ops/ETHOS.md", "ops/decisions.md"],
  people: ["ops/roadmap.md", "ops/founder-research.md"],
  fundraising: ["ops/founder-research.md", "ops/roadmap.md"],
  ops: ["ops/roadmap.md", "ops/build-log.md", "ops/playbook.md", "ops/ETHOS.md"],
} as const;
