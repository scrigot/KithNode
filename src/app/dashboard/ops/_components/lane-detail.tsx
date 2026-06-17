import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileText,
  Activity,
} from "lucide-react";
import { healthColor } from "@/lib/ops/metrics";
import {
  maturityChip,
  type LaneSummary,
  type MilestoneInput,
  type MilestoneStatus,
} from "@/lib/ops/cockpit";
import { LANE_REFS } from "@/lib/ops/lane-config";
import { healthChip, relativeTime } from "./state";
import { OpsTile, OpsEmpty } from "./ops-tile";

/**
 * The [lane] drill-down: a 2-pane CEO view. Primary left (~65%) = the lane's
 * roadmap + goals (its milestones grouped by phase/gate = what to do). Right
 * sidebar = the live stat (top), then recent changes (OpsEvent feed), then
 * reference files (LANE_REFS links). Read-only. brand/dashboard.md compliant:
 * sharp 0px, teal-only + semantic chips, mono tabular-nums, dense. Stacks to a
 * single column below 1024px.
 *
 * Server component (no interactivity) — takes already-fetched data props.
 */
export function LaneDetail({
  lane,
  milestones,
  phaseNames,
}: {
  lane: LaneSummary;
  milestones: MilestoneInput[];
  /** phaseId -> phase name, for grouping the roadmap pane. */
  phaseNames: Record<string, string>;
}) {
  const chip = maturityChip(lane.maturity);
  const copilotish = lane.maturity === "copilot";
  const refs = LANE_REFS[lane.key] ?? [];

  // Group this lane's milestones by phase, then by gate within each phase.
  const groups = groupByPhaseGate(milestones, phaseNames);

  return (
    <div className="min-h-full bg-bg-primary p-4">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <Link
            href="/dashboard/ops"
            className="mb-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-muted hover:text-accent-teal focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-teal"
          >
            <ArrowLeft size={11} /> Cockpit
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
            {lane.label.toUpperCase()}
          </h1>
        </div>
        <span
          className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            copilotish
              ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal"
              : healthChip(chip.health)
          }`}
        >
          {chip.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.85fr_1fr]">
        {/* ─── Primary (left ~65%): roadmap + goals ─────────────────────── */}
        <div>
          <OpsTile
            label="Roadmap & Goals"
            subtitle="Milestones by phase / gate"
            badge={lane.openCount > 0 ? `${lane.openCount} open` : "all clear"}
            badgeHealth={lane.openCount > 0 ? "neutral" : "good"}
          >
            {groups.length === 0 ? (
              <OpsEmpty
                icon={<Circle size={20} />}
                heading="No milestones yet"
                description="Agents fill this as you ship. Start with the active phase."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <div key={g.key}>
                    <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      <span className="text-text-secondary">{g.phaseName}</span>
                      <span className="font-mono text-accent-teal">{g.gate}</span>
                    </p>
                    <div className="flex flex-col divide-y divide-white/[0.06]">
                      {g.items.map((m) => (
                        <MilestoneRow key={m.id} milestone={m} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OpsTile>
        </div>

        {/* ─── Sidebar (right): stat -> recent changes -> reference files ── */}
        <div className="flex flex-col gap-4">
          {/* Live stat */}
          <OpsTile label="Live Stat" subtitle="From metrics.ts">
            {lane.stat ? (
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
                  {lane.stat.value}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-wider ${healthColor(lane.stat.health)}`}
                >
                  {lane.stat.label}
                </span>
              </div>
            ) : (
              <p className="font-mono text-[11px] lowercase tracking-wider text-text-muted">
                manual · no live signal for this lane
              </p>
            )}
          </OpsTile>

          {/* Recent changes (OpsEvent feed) */}
          <OpsTile label="Recent Changes" subtitle="Shipped · learned · decided">
            {lane.recent.length === 0 ? (
              <OpsEmpty
                icon={<Activity size={20} />}
                heading="No recent activity"
                description="Lane-tagged build-log entries appear here after a sync."
              />
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.06]">
                {lane.recent.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="mt-px shrink-0 border border-white/[0.12] px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-text-muted">
                      {e.kind}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-text-primary">
                        {e.summary}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                        {relativeTime(e.createdAt)}
                        {e.ref && <span className="ml-1.5">· {e.ref}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </OpsTile>

          {/* Reference files (LANE_REFS) */}
          <OpsTile label="Reference Files" subtitle="Lane docs">
            {refs.length === 0 ? (
              <OpsEmpty icon={<FileText size={20} />} heading="No reference docs" />
            ) : (
              <div className="flex flex-col gap-1">
                {refs.map((path) => (
                  <span
                    key={path}
                    className="flex items-center gap-2 border border-white/[0.06] px-2 py-1 font-mono text-[11px] text-text-secondary"
                  >
                    <FileText size={11} className="shrink-0 text-text-muted" />
                    <span className="truncate">{path}</span>
                  </span>
                ))}
              </div>
            )}
          </OpsTile>
        </div>
      </div>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: MilestoneInput }) {
  const status = milestone.status as MilestoneStatus;
  return (
    <div className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <p
          className={`text-[12px] ${
            status === "done"
              ? "text-text-muted line-through"
              : "text-text-primary"
          }`}
        >
          {milestone.title}
        </p>
        {milestone.note && (
          <p className="mt-0.5 text-[10px] text-text-muted">{milestone.note}</p>
        )}
        {milestone.evidence && (
          <p className="mt-0.5 font-mono text-[10px] text-accent-teal">
            {milestone.evidence}
          </p>
        )}
      </div>
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-text-muted">
        {milestone.gate}
      </span>
    </div>
  );
}

function StatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === "done")
    return <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent-green" />;
  if (status === "at_risk")
    return (
      <AlertTriangle size={13} className={`mt-0.5 shrink-0 ${healthColor("warn")}`} />
    );
  if (status === "in_progress")
    return (
      <Circle
        size={13}
        className="mt-0.5 shrink-0 fill-accent-teal/20 text-accent-teal"
      />
    );
  return <Circle size={13} className="mt-0.5 shrink-0 text-text-muted" />;
}

interface PhaseGateGroup {
  key: string;
  phaseName: string;
  gate: string;
  items: MilestoneInput[];
}

/** Group a lane's milestones by (phase, gate), preserving order. */
function groupByPhaseGate(
  milestones: MilestoneInput[],
  phaseNames: Record<string, string>,
): PhaseGateGroup[] {
  const map = new Map<string, PhaseGateGroup>();
  for (const m of milestones) {
    const phaseName = m.phaseId
      ? (phaseNames[m.phaseId] ?? "Unphased")
      : "Unphased";
    const key = `${m.phaseId ?? "none"}::${m.gate}`;
    let group = map.get(key);
    if (!group) {
      group = { key, phaseName, gate: m.gate, items: [] };
      map.set(key, group);
    }
    group.items.push(m);
  }
  return Array.from(map.values());
}
