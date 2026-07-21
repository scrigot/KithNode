import { describe, expect, it } from "vitest";
import { fallbackAssistantPlan } from "./planner";

describe("fallbackAssistantPlan", () => {
  it("is explicit that no action was taken", () => {
    const plan = fallbackAssistantPlan("Help me follow up with Alex");
    expect(plan.reply).toContain("No action was taken");
    expect(plan.proposedActions).toEqual([]);
    expect(plan.recommendations).toEqual([]);
  });

  it("bounds reflected user input", () => {
    const plan = fallbackAssistantPlan("x".repeat(1_000));
    expect(plan.reply.length).toBeLessThan(400);
  });
});
