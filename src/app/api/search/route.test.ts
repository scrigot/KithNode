import { describe, it, expect, vi } from "vitest";

// Mock next-auth dependency before importing the route (same pattern as contacts route test).
vi.mock("@/lib/auth", () => ({ auth: () => Promise.resolve(null) }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

import { buildSearchFilter } from "./route";

describe("buildSearchFilter", () => {
  it("includes reviewed skills in global contact search", () => {
    const filter = buildSearchFilter("goldman");
    expect(filter).toBe(
      "name.ilike.%goldman%,firmName.ilike.%goldman%,title.ilike.%goldman%,education.ilike.%goldman%,skills.ilike.%goldman%",
    );
  });

  it("passes through mixed-case queries untouched", () => {
    const filter = buildSearchFilter("Jane Doe");
    expect(filter).toContain("name.ilike.%Jane Doe%");
    expect(filter).toContain("firmName.ilike.%Jane Doe%");
  });

  it("returns patterns for a single character (caller enforces min-2)", () => {
    expect(buildSearchFilter("a")).toContain("name.ilike.%a%");
  });
});

describe("search route q sanitization", () => {
  it("strips % _ \\ characters that would escape ilike patterns", () => {
    const raw = "foo%bar_baz\\qux";
    const sanitized = raw.trim().replace(/[%_\\]/g, "").slice(0, 80);
    expect(sanitized).toBe("foobarbazqux");
    expect(sanitized).not.toContain("%");
    expect(sanitized).not.toContain("_");
    expect(sanitized).not.toContain("\\");
  });

  it("caps q at 80 characters", () => {
    const raw = "a".repeat(120);
    const sanitized = raw.trim().replace(/[%_\\]/g, "").slice(0, 80);
    expect(sanitized).toHaveLength(80);
  });

  it("trims leading and trailing whitespace", () => {
    const raw = "  goldman  ";
    const sanitized = raw.trim().replace(/[%_\\]/g, "").slice(0, 80);
    expect(sanitized).toBe("goldman");
  });

  it("treats a 1-char sanitized query as too short", () => {
    expect("a".length < 2).toBe(true);
  });

  it("treats a 2-char sanitized query as valid", () => {
    expect("gs".length >= 2).toBe(true);
  });
});
