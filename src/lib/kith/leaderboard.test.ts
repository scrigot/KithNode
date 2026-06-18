import { describe, it, expect } from "vitest";
import { scoreSnapshot, parseStages, PHASE_WEIGHTS } from "./leaderboard";

describe("scoreSnapshot", () => {
  const zero = { identified: 0, contacted: 0, engaged: 0, advanced: 0 };

  it("never scores identified (pre-outreach) contacts", () => {
    expect(scoreSnapshot({ ...zero, identified: 9 }, 0)).toBe(0);
  });

  it("rewards progression: advanced > engaged > contacted", () => {
    expect(scoreSnapshot({ ...zero, contacted: 1 }, 0)).toBe(2);
    expect(scoreSnapshot({ ...zero, engaged: 1 }, 0)).toBe(5);
    expect(scoreSnapshot({ ...zero, advanced: 1 }, 0)).toBe(10);
  });

  it("adds a light per-contact-added reward", () => {
    expect(scoreSnapshot(zero, 7)).toBe(7);
  });

  it("sums phases + contacts added", () => {
    // 2 contacted (4) + 1 engaged (5) + 3 advanced (30) + 12 added (12) = 51
    expect(
      scoreSnapshot({ identified: 5, contacted: 2, engaged: 1, advanced: 3 }, 12),
    ).toBe(51);
  });

  it("weights match the documented ladder", () => {
    expect(PHASE_WEIGHTS).toEqual({ identified: 0, contacted: 2, engaged: 5, advanced: 10 });
  });
});

describe("parseStages", () => {
  it("passes through an array of stage metas", () => {
    const stages = parseStages([
      { key: "researched", universalPhase: "identified" },
      { key: "emailed", universalPhase: "contacted" },
    ]);
    expect(stages).toEqual([
      { key: "researched", universalPhase: "identified" },
      { key: "emailed", universalPhase: "contacted" },
    ]);
  });

  it("parses a JSON-string stages column", () => {
    const stages = parseStages('[{"key":"met","universalPhase":"advanced"}]');
    expect(stages).toEqual([{ key: "met", universalPhase: "advanced" }]);
  });

  it("tolerates garbage / non-arrays / bad JSON", () => {
    expect(parseStages(null)).toEqual([]);
    expect(parseStages(undefined)).toEqual([]);
    expect(parseStages("not json")).toEqual([]);
    expect(parseStages(42)).toEqual([]);
  });

  it("drops entries without a string key and keeps a missing universalPhase", () => {
    const stages = parseStages([
      { key: "ok" }, // no universalPhase -> kept, will simply never map to a phase
      { universalPhase: "engaged" }, // no key -> dropped
      { key: 123 }, // non-string key -> dropped
    ]);
    expect(stages).toEqual([{ key: "ok", universalPhase: undefined }]);
  });
});
