import { describe, expect, it } from "vitest";
import { parseUpdateGoalInput } from "./executor";

describe("parseUpdateGoalInput", () => {
  it("accepts only a bounded, deterministic goal write", () => {
    expect(parseUpdateGoalInput({ title: "Land a product role", priority: 5 })).toMatchObject({
      title: "Land a product role",
      priority: 5,
      context: {},
    });
  });

  it("rejects missing titles and invalid priorities", () => {
    expect(() => parseUpdateGoalInput({ title: "" })).toThrow();
    expect(() => parseUpdateGoalInput({ title: "Goal", priority: 101 })).toThrow();
  });
});
