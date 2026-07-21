import { describe, expect, it } from "vitest";
import { assistantPlanSchema, assistantRequestSchema } from "./schemas";

describe("assistant schemas", () => {
  it("rejects empty and oversized chat messages", () => {
    expect(assistantRequestSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ message: "x".repeat(4_001) }).success).toBe(false);
  });

  it("rejects tools outside the allowlist", () => {
    const result = assistantPlanSchema.safeParse({
      reply: "I can help.",
      proposedActions: [
        { toolName: "send_email", label: "Send it", input: {}, riskLevel: "external" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires calibrated recommendation confidence", () => {
    const result = assistantPlanSchema.safeParse({
      reply: "Try this.",
      recommendations: [
        {
          kind: "networking",
          title: "Reach out",
          rationale: "You have shared context.",
          confidence: 1.2,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
