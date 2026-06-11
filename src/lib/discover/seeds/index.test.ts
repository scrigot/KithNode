import { describe, it, expect } from "vitest";
import { seedsForSchool, seedsForIndustries } from "./index";

describe("seedsForSchool", () => {
  it("returns UNC recruiting firms for 'UNC'", () => {
    const seeds = seedsForSchool("UNC");
    const names = seeds.map((s) => s.name);
    expect(names).toContain("Goldman Sachs");
    expect(names).toContain("JPMorgan");
    expect(names).toContain("Bank of America");
    expect(names).toContain("McKinsey & Company");
    expect(names).toContain("Evercore");
    expect(seeds.length).toBe(15);
  });

  it("resolves alias 'unc-chapel-hill' to UNC seeds", () => {
    const seeds = seedsForSchool("unc-chapel-hill");
    expect(seeds.map((s) => s.name)).toContain("Goldman Sachs");
    expect(seeds.length).toBe(15);
  });

  it("returns NC State recruiting firms for 'NC State'", () => {
    const seeds = seedsForSchool("NC State");
    const names = seeds.map((s) => s.name);
    expect(names).toContain("Bank of America");
    expect(names).toContain("Wells Fargo");
    expect(names).toContain("Truist");
    expect(names).toContain("First Citizens");
    expect(names).toContain("Raymond James");
    expect(seeds.length).toBe(12);
  });

  it("resolves alias 'ncsu' to NC State seeds", () => {
    const seeds = seedsForSchool("ncsu");
    expect(seeds.map((s) => s.name)).toContain("Truist");
    expect(seeds.length).toBe(12);
  });

  it("returns empty array for unknown school", () => {
    const seeds = seedsForSchool("unknown");
    expect(seeds).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    const seeds = seedsForSchool("");
    expect(seeds).toEqual([]);
  });

  it("is case-insensitive", () => {
    const a = seedsForSchool("UNC");
    const b = seedsForSchool("unc");
    expect(a).toEqual(b);
  });

  it("each seed has valid domain and website", () => {
    const seeds = seedsForSchool("UNC");
    for (const seed of seeds) {
      expect(seed.domain).toBeTruthy();
      expect(seed.website).toBe(`https://${seed.domain}`);
    }
  });
});

describe("seedsForIndustries", () => {
  it("returns seeds for Investment Banking", () => {
    const seeds = seedsForIndustries(["Investment Banking"]);
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.map((s) => s.name)).toContain("Goldman Sachs");
  });

  it("deduplicates across overlapping industries", () => {
    const seeds = seedsForIndustries(["Investment Banking", "Big 4"]);
    const domains = seeds.map((s) => s.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("returns empty for unknown industry", () => {
    const seeds = seedsForIndustries(["Underwater Basket Weaving"]);
    expect(seeds).toEqual([]);
  });
});
