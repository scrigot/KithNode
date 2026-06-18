import { describe, it, expect } from "vitest";
import { pipelineAdvanceEvent } from "./events";

// A pipeline whose native stages map onto the 4 universal phases.
const stages = [
  { key: "researched", universalPhase: "identified" },
  { key: "emailed", universalPhase: "contacted" },
  { key: "replied", universalPhase: "engaged" },
  { key: "met", universalPhase: "advanced" },
];

describe("pipelineAdvanceEvent", () => {
  it("emits 'contacted' moving forward into contacted", () => {
    expect(pipelineAdvanceEvent("researched", "emailed", stages)).toBe("contacted");
  });

  it("emits 'engaged' moving contacted -> engaged", () => {
    expect(pipelineAdvanceEvent("emailed", "replied", stages)).toBe("engaged");
  });

  it("returns null on a regress (engaged -> contacted)", () => {
    expect(pipelineAdvanceEvent("replied", "emailed", stages)).toBeNull();
  });

  it("returns null for a same-stage move", () => {
    expect(pipelineAdvanceEvent("emailed", "emailed", stages)).toBeNull();
  });

  it("emits 'contacted' advancing from an unmapped/null old stage", () => {
    expect(pipelineAdvanceEvent(null, "emailed", stages)).toBe("contacted");
    expect(pipelineAdvanceEvent("unknown", "emailed", stages)).toBe("contacted");
  });

  it("returns null when the move lands on identified (pre-outreach, never tracked)", () => {
    expect(pipelineAdvanceEvent(null, "researched", stages)).toBeNull();
  });
});
