import { describe, expect, it } from "vitest";
import { classifyRelationship } from "./classifier";

const base = {
  id: "contact-1",
  name: "Taylor Example",
  title: "AI Engineer",
  firmName: "Example AI",
};

describe("classifyRelationship", () => {
  it("does not turn an imported profile or score into a verified relationship", () => {
    const result = classifyRelationship({
      ...base,
      source: "linkedin_extension",
      affiliations: "Same school",
    });
    expect(result.state).toBe("potential");
    expect(result.evidence[0]).toContain("no direct interaction");
  });

  it("treats a recorded interaction as verified", () => {
    const result = classifyRelationship({
      ...base,
      lastSpokenAt: "2026-07-01T12:00:00.000Z",
    });
    expect(result.state).toBe("verified");
    expect(result.relationshipType).toBe("recorded interaction");
  });

  it("accepts explicit user-verified evidence", () => {
    const result = classifyRelationship({
      ...base,
      evidence: [{
        state: "verified",
        relationshipType: "former coworker",
        source: "user_confirmed",
        summary: "Worked together at Comfort Systems.",
        confidence: 1,
        verifiedByUser: true,
      }],
    });
    expect(result.state).toBe("verified");
    expect(result.relationshipType).toBe("former coworker");
    expect(result.evidence).toEqual(["Worked together at Comfort Systems."]);
  });

  it("keeps shared-school evidence potential", () => {
    const result = classifyRelationship({
      ...base,
      evidence: [{
        state: "potential",
        relationshipType: "shared school",
        source: "profile_match",
        summary: "Both attended UNC.",
        confidence: 0.65,
      }],
    });
    expect(result.state).toBe("potential");
    expect(result.confidence).toBe(0.65);
  });
});
