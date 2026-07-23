import { describe, expect, it } from "vitest";
import { adjacentCuratedJobSources, findCuratedJobSource } from "./catalog";

describe("curated job-source catalog", () => {
  it("resolves canonical names and aliases", () => {
    expect(findCuratedJobSource("OpenAI")?.boardToken).toBe("openai");
    expect(findCuratedJobSource("BCG")?.boardToken).toBe("bcg");
    expect(findCuratedJobSource("Square")?.boardToken).toBe("block");
  });

  it("selects relevant AI and finance employers while respecting exclusions", () => {
    const sources = adjacentCuratedJobSources("Generative AI, financial modeling, consulting", ["OpenAI"], 5);
    expect(sources).toHaveLength(5);
    expect(sources.some((source) => source.company === "OpenAI")).toBe(false);
    expect(sources.some((source) => source.tags.includes("ai"))).toBe(true);
    expect(sources.some((source) => source.tags.includes("finance"))).toBe(true);
  });
});
