import { describe, it, expect } from "vitest";
import { parseRoadmap } from "./roadmap-sync";

describe("parseRoadmap — phases", () => {
  it("parses a phase ladder with done/active/planned", () => {
    const md = `
## Phases
- [x] Foundation — repo, MVP (shipped).
- [ ] **P0 — Beta with 5 users [G0] (ACTIVE)** — 5 real users onboarded.
- [ ] P1 — Beta with my PC [G0 -> G1].
- [ ] P2 — Public beta + pricing live [G1].
`;
    const { phases } = parseRoadmap(md);
    expect(phases).toHaveLength(4);
    expect(phases[0]).toMatchObject({ name: "Foundation", status: "done", order: 0 });
    expect(phases[1]).toMatchObject({
      name: "Beta with 5 users",
      gate: "G0",
      status: "active",
      order: 1,
    });
    // P1 uses a compound "[G0 -> G1]" transition token; the phase parser
    // captures the FIRST gate (G0) from it. The "Pn — " code prefix is stripped
    // so the human label (not "P1") is the phase name.
    expect(phases[2]).toMatchObject({
      name: "Beta with my PC",
      gate: "G0",
      status: "planned",
    });
    expect(phases[3]).toMatchObject({
      name: "Public beta + pricing live",
      gate: "G1",
      status: "planned",
    });
  });

  it("only one phase is active", () => {
    const md = `
## Phases
- [ ] **P0 — Beta [G0] (ACTIVE)** — x.
- [ ] P1 — Next [G1].
`;
    const { phases } = parseRoadmap(md);
    expect(phases.filter((p) => p.status === "active")).toHaveLength(1);
  });
});

describe("parseRoadmap — tasks by lane", () => {
  const md = `
## Tasks by lane x gate

### Product/Eng
- [ ] [G0] Onboard the first real beta user end-to-end.
- [x] [G0] Fix Discover scoring + the vertical pipeline UI.
- [ ] [G2] Ship a shareable product loop.

### Growth/Marketing
- [ ] [G0] Start the named-founder build-in-public audience NOW.
- [x] [G2] Content-engine built.
`;

  it("attributes tasks to the right lane key", () => {
    const { milestones } = parseRoadmap(md);
    const product = milestones.filter((m) => m.lane === "product");
    const growth = milestones.filter((m) => m.lane === "growth");
    expect(product).toHaveLength(3);
    expect(growth).toHaveLength(2);
  });

  it("captures gate + done status + title", () => {
    const { milestones } = parseRoadmap(md);
    const first = milestones[0];
    expect(first).toMatchObject({
      lane: "product",
      gate: "G0",
      status: "planned",
      title: "Onboard the first real beta user end-to-end.",
      order: 0,
    });
    const done = milestones.find((m) => m.title.startsWith("Fix Discover"));
    expect(done?.status).toBe("done");
  });

  it("orders tasks within a lane and resets per lane", () => {
    const { milestones } = parseRoadmap(md);
    expect(milestones.filter((m) => m.lane === "product").map((m) => m.order)).toEqual([
      0, 1, 2,
    ]);
    expect(milestones.filter((m) => m.lane === "growth").map((m) => m.order)).toEqual([
      0, 1,
    ]);
  });
});

describe("parseRoadmap — tolerance (skip, never throw)", () => {
  it("empty / null / undefined -> empty result", () => {
    expect(parseRoadmap("")).toEqual({ phases: [], milestones: [] });
    expect(parseRoadmap(null)).toEqual({ phases: [], milestones: [] });
    expect(parseRoadmap(undefined)).toEqual({ phases: [], milestones: [] });
  });

  it("skips an unknown lane heading", () => {
    const md = `
### Quantum Department
- [ ] [G0] Build a flux capacitor.
`;
    expect(parseRoadmap(md).milestones).toEqual([]);
  });

  it("skips a task line with no gate token", () => {
    const md = `
### Product/Eng
- [ ] A task with no gate at all.
- [ ] [G1] A valid one.
`;
    const { milestones } = parseRoadmap(md);
    expect(milestones).toHaveLength(1);
    expect(milestones[0].gate).toBe("G1");
  });

  it("skips an unknown gate token (e.g. [G9])", () => {
    const md = `
### Product/Eng
- [ ] [G9] Out-of-range gate.
- [ ] [G0] In-range.
`;
    const { milestones } = parseRoadmap(md);
    expect(milestones).toHaveLength(1);
    expect(milestones[0].gate).toBe("G0");
  });

  it("ignores non-checkbox lines and prose", () => {
    const md = `
## Phases
Some intro prose that is not a list item.
- [ ] **P0 — Beta [G0] (ACTIVE)** — x.

### Product/Eng
> a blockquote
- [ ] [G0] Real task.
`;
    const r = parseRoadmap(md);
    expect(r.phases).toHaveLength(1);
    expect(r.milestones).toHaveLength(1);
  });

  it("does not collect tasks outside a lane section", () => {
    const md = `
## Stage gates
- [ ] [G0] This is under a non-lane heading.
`;
    expect(parseRoadmap(md).milestones).toEqual([]);
  });
});
