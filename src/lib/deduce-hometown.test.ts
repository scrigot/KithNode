import { describe, it, expect } from "vitest";
import { deduceHometown } from "./deduce-hometown";

describe("deduceHometown", () => {
  it("deduces 'City, ST' for a name that matches exactly one school", async () => {
    expect(await deduceHometown("Alaska Middle College School")).toBe(
      "Eagle River, AK",
    );
  });

  it("matches on the suffix-stripped form for a unique 'High School' name", async () => {
    // "Bethel Regional High School" is the only school under both its raw and
    // suffix-stripped ("bethel regional") keys.
    expect(await deduceHometown("Bethel Regional High School")).toBe(
      "Bethel, AK",
    );
  });

  it("returns '' for an ambiguous name (Millbrook High exists in NC and VA)", async () => {
    expect(await deduceHometown("Millbrook High")).toBe("");
    // The "High School" spelling collapses to the same ambiguity.
    expect(await deduceHometown("Millbrook High School")).toBe("");
  });

  it("returns '' for an unknown school", async () => {
    expect(await deduceHometown("Zzqzz Nonexistent High School")).toBe("");
  });

  it("returns '' for empty / whitespace input", async () => {
    expect(await deduceHometown("")).toBe("");
    expect(await deduceHometown("   ")).toBe("");
  });
});
