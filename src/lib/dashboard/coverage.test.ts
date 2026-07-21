import { describe, expect, it } from "vitest";
import { calculateCoverage } from "./coverage";

describe("calculateCoverage", () => {
  it("groups tenant-scoped pipeline entries by target firm", () => {
    expect(
      calculateCoverage(["Goldman Sachs", "Stripe"], [
        { stage: "CONTACTED", contact: { firmName: "Goldman Sachs & Co." } },
        { stage: "RESPONDED", contact: { firmName: "Goldman Sachs" } },
      ]),
    ).toEqual({
      covered: [
        { company: "Goldman Sachs", contacts: 2, stages: ["contacted", "responded"] },
      ],
      uncovered: ["Stripe"],
      total_target: 2,
      total_covered: 1,
    });
  });

  it("does not treat empty firm names as matches", () => {
    expect(calculateCoverage(["Stripe"], [{ stage: null, contact: null }]).total_covered).toBe(0);
  });
});
