import { describe, it, expect } from "vitest";
import { anthropicCost } from "./ai-cost";

describe("anthropicCost", () => {
  it("computes Sonnet cost from known tokens (gateway slug)", () => {
    // 1M in @ $3 + 1M out @ $15 = $18
    expect(
      anthropicCost("anthropic/claude-sonnet-4.5", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBeCloseTo(18.0, 6);
  });

  it("computes a realistic small draft cost", () => {
    // 1200 in @ $3/MTok + 400 out @ $15/MTok
    const cost = anthropicCost("claude-sonnet-4-20250514", {
      inputTokens: 1200,
      outputTokens: 400,
    });
    expect(cost).toBeCloseTo(0.0036 + 0.006, 9); // 0.0096
  });

  it("falls back to Sonnet pricing for an unknown model id", () => {
    expect(
      anthropicCost("some-unknown-model", {
        inputTokens: 1_000_000,
        outputTokens: 0,
      }),
    ).toBeCloseTo(3.0, 6);
  });

  it("treats missing model / usage as zero tokens (cost 0)", () => {
    expect(anthropicCost(undefined, undefined)).toBe(0);
    expect(anthropicCost("claude-sonnet-4.5", {})).toBe(0);
    expect(
      anthropicCost(undefined, { inputTokens: undefined, outputTokens: undefined }),
    ).toBe(0);
  });
});
