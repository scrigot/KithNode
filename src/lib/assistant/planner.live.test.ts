import { describe, expect, it } from "vitest";
import { planAssistantResponse } from "./planner";

const live = process.env.RUN_LIVE_INTEGRATION_TESTS === "1" ? describe : describe.skip;

live("Career Copilot live model connection", () => {
  it("returns schema-valid structured chat output", async () => {
    const result = await planAssistantResponse({
      message: "Give me one concise, grounded networking priority for today.",
      context: {
        user: { targetIndustries: "software" },
        goals: [],
        pipeline: [],
        memories: [],
        existingRecommendations: [],
        connectedCalendars: [],
        now: new Date().toISOString(),
      },
      history: [],
    });

    expect(result.plan.reply.length).toBeGreaterThan(0);
    expect(result.plan.recommendations.length).toBeLessThanOrEqual(5);
    expect(result.model.length).toBeGreaterThan(0);
  }, 30_000);
});
