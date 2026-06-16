import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { supabase } from "@/lib/supabase";
import { getLane, LANE_KEYS } from "@/lib/ops/lane-config";
import {
  laneSummary,
  type MilestoneInput,
  type OpsEventInput,
  type LaneStat,
} from "@/lib/ops/cockpit";
import { LaneDetail } from "../_components/lane-detail";

// Founder-only CEO drill-down for one business lane. notFound() (404, not
// redirect) so non-founders cannot confirm the route exists; the lane param is
// validated against the known lane set (404 for an unknown lane). The supabase
// client is service-role (RLS bypassed), so isFounder(await auth()) is the only
// real guard — re-checked here server-side, the same as the API route.
export default async function LanePage({
  params,
}: {
  params: Promise<{ lane: string }>;
}) {
  const session = await auth();
  if (!isFounder(session)) notFound();

  const { lane: laneKey } = await params;
  if (!LANE_KEYS.has(laneKey)) notFound();
  const laneConfig = getLane(laneKey)!;

  // Read this lane's milestones + events + the phase names for grouping. Each
  // read degrades independently (empty on error) so the page still renders 200.
  const [milestoneRows, eventRows, phaseRows] = await Promise.all([
    supabase
      .from("milestones")
      .select("id, title, lane, phaseId, gate, status, order, note, evidence")
      .eq("lane", laneKey)
      .order("order", { ascending: true }),
    supabase
      .from("ops_events")
      .select("id, lane, kind, summary, ref, createdAt")
      .eq("lane", laneKey)
      .order("createdAt", { ascending: false })
      .limit(20),
    supabase.from("phases").select("id, name"),
  ]);

  const milestones: MilestoneInput[] = milestoneRows.error
    ? []
    : (milestoneRows.data ?? []).map((m) => ({
        id: m.id as string,
        title: (m.title as string) ?? "",
        lane: (m.lane as string) ?? "",
        phaseId: (m.phaseId as string | null) ?? null,
        gate: (m.gate as string) ?? "",
        status: (m.status as string) ?? "planned",
        order: (m.order as number) ?? 0,
        note: (m.note as string | null) ?? null,
        evidence: (m.evidence as string | null) ?? null,
      }));

  const events: OpsEventInput[] = eventRows.error
    ? []
    : (eventRows.data ?? []).map((e) => ({
        id: e.id as string,
        lane: (e.lane as string) ?? "",
        kind: (e.kind as string) ?? "",
        summary: (e.summary as string) ?? "",
        ref: (e.ref as string | null) ?? null,
        createdAt: (e.createdAt as string) ?? new Date().toISOString(),
      }));

  const phaseNames: Record<string, string> = {};
  if (!phaseRows.error) {
    for (const p of phaseRows.data ?? []) {
      phaseNames[p.id as string] = (p.name as string) ?? "";
    }
  }

  // The OrgBand card carries the lane's metrics.ts headline (computed in the
  // overview route alongside every other signal). The detail page's "Live Stat"
  // panel shows roadmap progress — a real DB-traceable number (done / total
  // milestones), never a fabricated figure. An empty roadmap degrades to a
  // neutral "0 / 0" rather than a fake percentage.
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "done").length;
  const stat: LaneStat | null =
    total > 0
      ? {
          label: "milestones done",
          value: `${done} / ${total}`,
          health: done === total ? "good" : done > 0 ? "neutral" : "warn",
        }
      : null;

  const lane = laneSummary(laneConfig, milestones, events, stat);

  return <LaneDetail lane={lane} milestones={milestones} phaseNames={phaseNames} />;
}
