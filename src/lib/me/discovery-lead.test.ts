import { describe, expect, it } from "vitest";
import { sanitizeDiscoveryLeadInput, validateDiscoveryLead } from "./discovery-lead";

describe("sanitizeDiscoveryLeadInput", () => {
  it("trims fields, normalizes LinkedIn URLs, and ranks AI mentors", () => {
    const lead = sanitizeDiscoveryLeadInput(
      {
        name: "  Jason Example  ",
        title: " Senior AI Engineering Consultant ",
        firmName: " Databricks ",
        linkedInUrl: "linkedin.com/in/Jason-Example/?trk=abc",
        location: " New York ",
        education: " UNC ",
        industry: " AI consulting ",
        notes: " Builds RAG systems for data teams ",
        sourceQuery: " applied AI ",
        ignored: "nope",
      } as Record<string, unknown>,
      { targetExpertise: "RAG data engineering", targetCompanies: "Databricks" },
    );

    expect(lead).toMatchObject({
      name: "Jason Example",
      title: "Senior AI Engineering Consultant",
      firmName: "Databricks",
      linkedInUrl: "https://www.linkedin.com/in/jason-example",
      location: "New York",
      sourceQuery: "applied AI",
    });
    expect(lead.score).toBeGreaterThan(50);
    expect(lead.reasons).toContain("AI engineering / data expert");
    expect(lead.reasons).toContain("consulting / implementation");
  });

  it("uses the LinkedIn slug as a fallback name and rejects empty leads", () => {
    const fromUrl = sanitizeDiscoveryLeadInput({ linkedInUrl: "https://linkedin.com/in/jane-doe" });
    expect(fromUrl.name).toBe("jane doe");
    expect(validateDiscoveryLead(fromUrl)).toBeNull();

    const empty = sanitizeDiscoveryLeadInput({ linkedInUrl: "not linkedin", name: " " });
    expect(validateDiscoveryLead(empty)).toMatch(/name or LinkedIn/);
  });

  it("only accepts supported statuses", () => {
    expect(sanitizeDiscoveryLeadInput({ name: "A", status: "dismissed" }).status).toBe("dismissed");
    expect(sanitizeDiscoveryLeadInput({ name: "A", status: "bad" }).status).toBe("researching");
  });
});
