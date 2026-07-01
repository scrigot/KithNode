import { describe, expect, it } from "vitest";
import { sanitizeProfileInput } from "./profile";

describe("sanitizeProfileInput", () => {
  it("whitelists and trims profile fields", () => {
    expect(
      sanitizeProfileInput({
        schools: "  UNC  ",
        clubs: " AI club ",
        pastFirms: " Comfort ",
        hometown: " Raleigh ",
        location: " Chapel Hill ",
        currentWork: " AI data services ",
        goals: " meet mentors ",
        targetRoles: " AI engineer ",
        targetExpertise: " RAG ",
        targetCompanies: " Databricks ",
        targetLocations: " NYC ",
        searchKeywords: " applied AI ",
        profileNotes: " no sales yet ",
        outreachStyle: " direct but friendly ",
        outreachLength: " medium ",
        outreachSignoff: " Sam ",
        outreachPositioning: " UNC student ",
        outreachGoals: " learn paths ",
        preferredEmailClient: " outlook ",
        ignored: "nope",
      } as Record<string, unknown>),
    ).toEqual({
      schools: "UNC",
      clubs: "AI club",
      pastFirms: "Comfort",
      hometown: "Raleigh",
      location: "Chapel Hill",
      currentWork: "AI data services",
      goals: "meet mentors",
      targetRoles: "AI engineer",
      targetExpertise: "RAG",
      targetCompanies: "Databricks",
      targetLocations: "NYC",
      searchKeywords: "applied AI",
      profileNotes: "no sales yet",
      outreachStyle: "direct but friendly",
      outreachLength: "medium",
      outreachSignoff: "Sam",
      outreachPositioning: "UNC student",
      outreachGoals: "learn paths",
      preferredEmailClient: "outlook",
    });
  });

  it("drops non-string values and clamps long strings", () => {
    const long = "x".repeat(2100);
    const p = sanitizeProfileInput({ schools: long, clubs: ["bad"], pastFirms: null });
    expect(p.schools).toHaveLength(2000);
    expect(p.clubs).toBe("");
    expect(p.pastFirms).toBe("");
  });
});
