import { describe, expect, it } from "vitest";
import { assistantToolPolicy } from "./tools";

describe("assistant tool policy", () => {
  it("requires server-side approval for every currently allowed tool", () => {
    expect(assistantToolPolicy("draft_outreach")).toEqual({
      riskLevel: "write",
      requiresApproval: true,
      executable: false,
    });
    expect(assistantToolPolicy("update_goal").requiresApproval).toBe(true);
  });
});
