import { describe, expect, it } from "vitest";
import { mergePrimaryPosition, researchPayloadSchema } from "./schema";

describe("guided research payload", () => {
  it("preserves multiple concurrent positions and removes empty draft rows", () => {
    const parsed = researchPayloadSchema.parse({
      name: "Arth Vijaywargia",
      linkedInUrl: "https://www.linkedin.com/in/arthvijay",
      positions: [
        { title: "Junior Solutions Architect", firm: "Red Hat", employmentType: "Full-time", start: "Jun 2026", end: "Present" },
        { title: "Claude Partner", firm: "Anthropic", employmentType: "Freelance", start: "Jun 2026", end: "Present" },
        { title: "", firm: "", employmentType: "", start: "", end: "Present" },
      ],
    });

    expect(parsed.positions).toHaveLength(2);
    expect(parsed.positions[1]).toMatchObject({ firm: "Anthropic", employmentType: "Freelance", end: "Present" });
  });

  it("keeps every reviewed skill and deduplicates LinkedIn variants", () => {
    const parsed = researchPayloadSchema.parse({
      name: "Arth Vijaywargia",
      linkedInUrl: "https://www.linkedin.com/in/arthvijay",
      skills: [
        "Artificial Intelligence (AI)",
        "Generative AI",
        "Data Science",
        "Consulting",
        "Agentic AI",
        "generative ai",
      ],
    });

    expect(parsed.skills).toEqual([
      "Artificial Intelligence (AI)",
      "Generative AI",
      "Data Science",
      "Consulting",
      "Agentic AI",
    ]);
  });

  it("merges the primary headline role into the timeline without duplicates", () => {
    expect(mergePrimaryPosition({
      title: "Junior Solutions Architect",
      firmName: "Red Hat",
      positions: [
        { title: "Claude Partner", firm: "Anthropic", employmentType: "Freelance", start: "Jun 2026", end: "Present" },
        { title: "Junior Solutions Architect", firm: "Red Hat", employmentType: "", start: "", end: "Present" },
      ],
    })).toEqual([
      { title: "Junior Solutions Architect", firm: "Red Hat", employmentType: "", start: "", end: "Present" },
      { title: "Claude Partner", firm: "Anthropic", employmentType: "Freelance", start: "Jun 2026", end: "Present" },
    ]);
  });
});
