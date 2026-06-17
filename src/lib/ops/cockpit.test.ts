import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  nextTasks,
  laneSummary,
  phaseChip,
  maturityChip,
  type PhaseInput,
  type MilestoneInput,
  type OpsEventInput,
  type LaneStat,
} from "./cockpit";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function phase(
  id: string,
  order: number,
  status: string,
  name = id,
  gate = "G0",
): PhaseInput {
  return { id, name, gate, order, status };
}

function milestone(
  id: string,
  phaseId: string | null,
  lane: string,
  order: number,
  status = "planned",
  title = id,
): MilestoneInput {
  return { id, title, lane, phaseId, gate: "G0", status, order };
}

// ─── buildTimeline ────────────────────────────────────────────────────────────
describe("buildTimeline", () => {
  it("0 phases -> empty ladder + null active", () => {
    const t = buildTimeline([]);
    expect(t.phases).toEqual([]);
    expect(t.activePhaseId).toBeNull();
  });

  it("handles null/undefined input without throwing", () => {
    expect(buildTimeline(null).phases).toEqual([]);
    expect(buildTimeline(undefined).activePhaseId).toBeNull();
  });

  it("selects the phase marked active", () => {
    const t = buildTimeline([
      phase("p0", 0, "done"),
      phase("p1", 1, "active"),
      phase("p2", 2, "planned"),
    ]);
    expect(t.activePhaseId).toBe("p1");
    expect(t.phases.find((p) => p.id === "p1")?.active).toBe(true);
    expect(t.phases.find((p) => p.id === "p0")?.active).toBe(false);
  });

  it("null active when no phase is marked active", () => {
    const t = buildTimeline([phase("p0", 0, "planned"), phase("p1", 1, "done")]);
    expect(t.activePhaseId).toBeNull();
    expect(t.phases.every((p) => !p.active)).toBe(true);
  });

  it("orders phases by `order` ascending (stable)", () => {
    const t = buildTimeline([
      phase("c", 2, "planned"),
      phase("a", 0, "planned"),
      phase("b", 1, "planned"),
    ]);
    expect(t.phases.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("an unknown status degrades to a planned chip", () => {
    const t = buildTimeline([phase("p", 0, "garbage")]);
    expect(t.phases[0].status).toBe("planned");
    expect(t.phases[0].chip.label).toBe("planned");
  });
});

// ─── nextTasks ────────────────────────────────────────────────────────────────
describe("nextTasks", () => {
  const ms: MilestoneInput[] = [
    milestone("m1", "p1", "product", 1, "planned"),
    milestone("m2", "p1", "growth", 0, "in_progress"),
    milestone("m3", "p1", "sales", 2, "done"), // complete -> excluded
    milestone("m4", "p2", "product", 0, "planned"), // other phase -> excluded
  ];

  it("returns [] when there is no active phase", () => {
    expect(nextTasks(ms, null)).toEqual([]);
    expect(nextTasks(ms, undefined)).toEqual([]);
  });

  it("filters to the active phase + drops completed, ordered by order", () => {
    const out = nextTasks(ms, "p1");
    expect(out.map((t) => t.id)).toEqual(["m2", "m1"]); // order 0 then 1; m3 done, m4 other phase
  });

  it("0 incomplete under the active phase -> []", () => {
    const allDone: MilestoneInput[] = [
      milestone("d1", "p1", "product", 0, "done"),
      milestone("d2", "p1", "growth", 1, "done"),
    ];
    expect(nextTasks(allDone, "p1")).toEqual([]);
  });

  it("caps at n (default 10) and respects a smaller n", () => {
    const many: MilestoneInput[] = Array.from({ length: 15 }, (_, i) =>
      milestone(`x${i}`, "p1", "product", i, "planned"),
    );
    expect(nextTasks(many, "p1")).toHaveLength(10);
    expect(nextTasks(many, "p1", 3)).toHaveLength(3);
    expect(nextTasks(many, "p1", 3).map((t) => t.id)).toEqual([
      "x0",
      "x1",
      "x2",
    ]);
  });

  it("returns fewer than n when fewer incomplete exist", () => {
    expect(nextTasks(ms, "p1", 10)).toHaveLength(2);
  });

  it("handles null/undefined milestones without throwing", () => {
    expect(nextTasks(null, "p1")).toEqual([]);
    expect(nextTasks(undefined, "p1")).toEqual([]);
  });
});

// ─── laneSummary ──────────────────────────────────────────────────────────────
describe("laneSummary", () => {
  const lane = {
    key: "product",
    label: "Product / Eng",
    phase: "copilot" as const,
    agents: ["kithnode-shipper"],
  };
  const manualLane = {
    key: "finance",
    label: "Finance",
    phase: "manual" as const,
    agents: [] as string[],
  };
  const ms: MilestoneInput[] = [
    milestone("a", "p1", "product", 0, "planned"),
    milestone("b", "p1", "product", 1, "done"),
    milestone("c", "p1", "finance", 0, "in_progress"),
  ];
  const events: OpsEventInput[] = [
    {
      id: "e1",
      lane: "product",
      kind: "shipped",
      summary: "shipped cockpit",
      createdAt: "2026-06-15T00:00:00.000Z",
    },
    {
      id: "e2",
      lane: "finance",
      kind: "decided",
      summary: "set burn",
      createdAt: "2026-06-14T00:00:00.000Z",
    },
  ];
  const stat: LaneStat = { label: "Signup→swipe", value: "100%", health: "good" };

  it("empty lane (no agents) stays manual maturity", () => {
    const s = laneSummary(manualLane, ms, events, null);
    expect(s.maturity).toBe("manual");
    expect(s.agents).toEqual([]);
  });

  it("a missing stat (null) degrades to a neutral card with no number", () => {
    const s = laneSummary(lane, ms, events, null);
    expect(s.stat).toBeNull();
  });

  it("passes through a provided stat", () => {
    const s = laneSummary(lane, ms, events, stat);
    expect(s.stat).toEqual(stat);
  });

  it("counts only incomplete milestones in the lane", () => {
    const s = laneSummary(lane, ms, events, stat);
    expect(s.openCount).toBe(1); // "a" planned; "b" done excluded; "c" other lane excluded
  });

  it("filters recent events to the lane", () => {
    const s = laneSummary(lane, ms, events, stat);
    expect(s.recent.map((e) => e.id)).toEqual(["e1"]);
  });

  it("handles null milestones/events without throwing", () => {
    const s = laneSummary(lane, null, null, null);
    expect(s.openCount).toBe(0);
    expect(s.recent).toEqual([]);
  });
});

// ─── phaseChip ────────────────────────────────────────────────────────────────
describe("phaseChip", () => {
  it("maps each status", () => {
    expect(phaseChip({ status: "done" })).toEqual({ label: "done", health: "good" });
    expect(phaseChip({ status: "active" })).toEqual({
      label: "active",
      health: "neutral",
    });
    expect(phaseChip({ status: "planned" })).toEqual({
      label: "planned",
      health: "neutral",
    });
  });

  it("null / unknown -> planned neutral", () => {
    expect(phaseChip(null)).toEqual({ label: "planned", health: "neutral" });
    expect(phaseChip(undefined)).toEqual({ label: "planned", health: "neutral" });
    expect(phaseChip({ status: "???" })).toEqual({
      label: "planned",
      health: "neutral",
    });
  });
});

// ─── maturityChip (semantic colors, never the tier palette) ──────────────────
describe("maturityChip", () => {
  it("manual -> amber/warn opportunity", () => {
    expect(maturityChip("manual")).toEqual({ label: "manual", health: "warn" });
  });
  it("copilot -> neutral (teal applied at component layer)", () => {
    expect(maturityChip("copilot")).toEqual({
      label: "copilot",
      health: "neutral",
    });
  });
  it("autonomous -> green/good", () => {
    expect(maturityChip("autonomous")).toEqual({
      label: "autonomous",
      health: "good",
    });
  });
});
