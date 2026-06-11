import { describe, it, expect, vi } from "vitest";

// The route module imports auth (next-auth → next/server) at load. Mock it and
// the other module-level deps so we can import the PURE helpers without ever
// pulling next-auth's runtime. We assert only on pickEditableFields /
// normalizeField — no route handler, no session.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/rescore-contact", () => ({
  rescoreContact: vi.fn(),
  loadContactTags: vi.fn(),
}));

import { normalizeField, pickEditableFields } from "./route";

describe("normalizeField", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizeField("  East   Chapel  Hill  ")).toBe("East Chapel Hill");
  });

  it("caps at 160 characters", () => {
    const long = "x".repeat(500);
    expect(normalizeField(long)).toHaveLength(160);
  });
});

describe("pickEditableFields", () => {
  it("keeps only known editable keys and ignores unknown ones", () => {
    const out = pickEditableFields({
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
      title: "CEO",
      firmName: "Goldman",
      randomKey: "nope",
    });
    expect(out).toEqual({
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
    });
    expect(out).not.toHaveProperty("title");
    expect(out).not.toHaveProperty("firmName");
    expect(out).not.toHaveProperty("randomKey");
  });

  it("normalizes each value (cap 160, collapse whitespace)", () => {
    const out = pickEditableFields({
      clubs: "  a   b  ",
      passions: "y".repeat(200),
    });
    expect(out.clubs).toBe("a b");
    expect(out.passions).toHaveLength(160);
  });

  it("returns an empty object for a payload with no valid string keys", () => {
    expect(pickEditableFields({})).toEqual({});
    expect(pickEditableFields({ title: "x", education: 5 as unknown as string })).toEqual({});
  });

  it("skips non-string values for otherwise-valid keys", () => {
    const out = pickEditableFields({ education: 123 as unknown as string, clubs: "ok" });
    expect(out).toEqual({ clubs: "ok" });
  });
});
