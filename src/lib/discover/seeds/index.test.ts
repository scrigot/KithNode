import { describe, expect, it } from "vitest";
import { FIRM_SEEDS, seedsForIndustries } from "./index";

describe("FIRM_SEEDS", () => {
  it("has Goldman Sachs in Investment Banking with a website", () => {
    const ib = FIRM_SEEDS["Investment Banking"];
    const goldman = ib.find((f) => f.name === "Goldman Sachs");
    expect(goldman).toBeDefined();
    expect(goldman?.domain).toBe("goldmansachs.com");
    expect(goldman?.website).toBe("https://goldmansachs.com");
  });

  it("has every IB seed populated with a non-empty domain", () => {
    for (const seed of FIRM_SEEDS["Investment Banking"]) {
      expect(seed.domain).toMatch(/^[a-z0-9-]+\.[a-z]+/);
      expect(seed.website).toBe(`https://${seed.domain}`);
    }
  });
});

describe("seedsForIndustries", () => {
  it("returns the IB list when asked for Investment Banking", () => {
    const out = seedsForIndustries(["Investment Banking"]);
    expect(out.length).toBeGreaterThan(20);
    expect(out.some((f) => f.name === "Evercore")).toBe(true);
  });

  it("dedupes across overlapping industries by domain", () => {
    // No overlap exists today, but if a future industry shares a firm
    // we expect dedup. Smoke-test the path with the same key twice.
    const out = seedsForIndustries(["Investment Banking", "Investment Banking"]);
    const domains = out.map((f) => f.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("returns empty array for unknown industry", () => {
    expect(seedsForIndustries(["Crypto Yield Farming"])).toEqual([]);
  });

  it("merges multiple industries", () => {
    const out = seedsForIndustries(["Consulting", "Big 4"]);
    expect(out.find((f) => f.name === "McKinsey & Company")).toBeDefined();
    expect(out.find((f) => f.name === "PwC")).toBeDefined();
  });
});
