import { describe, it, expect } from "vitest";
import { normalizeDegrees } from "./normalize-degrees";

describe("normalizeDegrees", () => {
  it("keeps canonical degrees and rewrites to canonical casing", () => {
    expect(normalizeDegrees("bs, mba")).toBe("BS, MBA");
  });

  it("matches case-insensitively and stores the canonical casing", () => {
    expect(normalizeDegrees("Phd, jD, md")).toBe("PhD, JD, MD");
  });

  it("drops tokens not present in ALL_DEGREES", () => {
    expect(normalizeDegrees("BS, Finance Club, MBA, wizard")).toBe("BS, MBA");
  });

  it("dedupes repeated degrees (case-insensitive)", () => {
    expect(normalizeDegrees("BS, bs, MBA, mba")).toBe("BS, MBA");
  });

  it("trims whitespace around each token", () => {
    expect(normalizeDegrees("  BS  ,   MBA ")).toBe("BS, MBA");
  });

  it("returns empty string when no token is valid", () => {
    expect(normalizeDegrees("history, finance, anything")).toBe("");
  });

  it("returns empty string for empty / non-string input", () => {
    expect(normalizeDegrees("")).toBe("");
    expect(normalizeDegrees(undefined as unknown as string)).toBe("");
    expect(normalizeDegrees(null as unknown as string)).toBe("");
  });
});
