import { describe, it, expect } from "vitest";
import { normalizeFirmName } from "./normalize-firm";

describe("normalizeFirmName", () => {
  it("strips suffixes and resolves alias: Goldman Sachs Group, Inc.", () => {
    expect(normalizeFirmName("Goldman Sachs Group, Inc.")).toBe(
      "goldman sachs"
    );
  });

  it("resolves ticker alias: GS", () => {
    expect(normalizeFirmName("GS")).toBe("goldman sachs");
  });

  it("strips '& Co.' suffix: JPMorgan Chase & Co.", () => {
    expect(normalizeFirmName("JPMorgan Chase & Co.")).toBe("jpmorgan chase");
  });

  it("lowercases without alias: Morgan Stanley", () => {
    expect(normalizeFirmName("Morgan Stanley")).toBe("morgan stanley");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeFirmName("")).toBe("");
  });

  it("strips suffix for unknown firm: Unknown Boutique LLC", () => {
    expect(normalizeFirmName("Unknown Boutique LLC")).toBe("unknown boutique");
  });

  it("resolves 'and Company' alias: McKinsey and Company", () => {
    expect(normalizeFirmName("McKinsey and Company")).toBe("mckinsey");
  });

  it("strips suffix then resolves alias: McKinsey & Company, Inc.", () => {
    expect(normalizeFirmName("McKinsey & Company, Inc.")).toBe("mckinsey");
  });

  it("resolves multi-word alias: Evercore ISI", () => {
    expect(normalizeFirmName("Evercore ISI")).toBe("evercore");
  });

  it("strips suffix then resolves alias: Blackstone Group Inc.", () => {
    expect(normalizeFirmName("Blackstone Group Inc.")).toBe("blackstone");
  });
});
