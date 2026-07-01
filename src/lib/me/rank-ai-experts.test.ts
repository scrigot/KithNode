import { describe, expect, it } from "vitest";
import { rankAiExperts, recommendedSearches } from "./rank-ai-experts";

describe("rankAiExperts", () => {
  it("orders AI engineering and consulting practitioners above generic contacts", () => {
    const ranked = rankAiExperts([
      { id: "generic", name: "Generic Alumni", firmName: "Bank", title: "Associate" },
      { id: "expert", name: "AI Mentor", firmName: "Scale AI", title: "Senior AI Engineering Consultant", notes: "RAG and data services" },
      { id: "builder", name: "Data Builder", firmName: "Analytics Co", title: "Data Engineer" },
    ]);

    expect(ranked.map((r) => r.id)).toEqual(["expert", "builder", "generic"]);
    expect(ranked[0].reasons).toContain("AI engineering / data expert");
    expect(ranked[0].reasons).toContain("consulting / implementation");
  });

  it("adds profile-based target expertise and location reasons", () => {
    const [ranked] = rankAiExperts(
      [{ id: "a", name: "Local Expert", firmName: "Databricks", title: "Applied AI Lead", location: "Raleigh" }],
      { targetExpertise: "applied AI", targetLocations: "Raleigh" },
    );

    expect(ranked.reasons).toContain("matches your target expertise");
    expect(ranked.reasons).toContain("location overlap");
  });
});

describe("recommendedSearches", () => {
  it("uses the profile to generate discovery prompts", () => {
    const searches = recommendedSearches({
      targetRoles: "AI engineer",
      targetExpertise: "RAG",
      targetCompanies: "Databricks",
      targetLocations: "Raleigh",
    });

    expect(searches).toHaveLength(4);
    expect(searches[0].query).toContain("RAG");
    expect(searches[1].query).toContain("AI engineer");
    expect(searches[2].query).toContain("Databricks");
    expect(searches[3].query).toContain("Raleigh");
  });
});
