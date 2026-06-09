import { describe, it, expect } from "vitest";

// The discover route imports NextAuth (@/lib/auth), which can't be imported in
// Vitest (it depends on next/server). The PostgREST filter sanitizer in
// route.ts is a self-contained expression, so we mirror it here and verify it
// strips filter-injection metacharacters while preserving normal queries.
const sanitize = (raw: string) => raw.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 100);

describe("discover q sanitization", () => {
  it("strips PostgREST metacharacters from an injection payload", () => {
    const payload = "x,importedByUserId.neq.";
    const cleaned = sanitize(payload);
    // Commas (filter separators) are removed; the safe characters remain.
    expect(cleaned).toBe("ximportedByUserId.neq.");
    expect(cleaned).not.toContain(",");
  });

  it("removes parentheses, quotes, and other PostgREST operators", () => {
    const cleaned = sanitize('name.ilike."*",or(tier.eq.1)');
    expect(cleaned).not.toMatch(/[(),"*]/);
  });

  it("preserves normal alphanumeric queries unchanged", () => {
    expect(sanitize("Goldman Sachs")).toBe("Goldman Sachs");
    expect(sanitize("J.P. Morgan")).toBe("J.P. Morgan");
    expect(sanitize("Smith-Jones")).toBe("Smith-Jones");
  });

  it("caps length at 100 characters", () => {
    expect(sanitize("a".repeat(250)).length).toBe(100);
  });
});
