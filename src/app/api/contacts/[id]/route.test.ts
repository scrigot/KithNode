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
  it("keeps known editable keys (now incl. title/firmName/university) and ignores unknown ones", () => {
    const { fields, invalid } = pickEditableFields({
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
      title: "CEO",
      firmName: "Goldman",
      university: "UNC Kenan-Flagler",
      randomKey: "nope",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
      title: "CEO",
      firmName: "Goldman",
      university: "UNC Kenan-Flagler",
    });
    expect(fields).not.toHaveProperty("randomKey");
  });

  it("normalizes each value (cap 160, collapse whitespace)", () => {
    const { fields } = pickEditableFields({
      clubs: "  a   b  ",
      passions: "y".repeat(200),
    });
    expect(fields.clubs).toBe("a b");
    expect(fields.passions).toHaveLength(160);
  });

  it("returns an empty object for a payload with no valid string keys", () => {
    expect(pickEditableFields({})).toEqual({ fields: {}, invalid: false });
    expect(
      pickEditableFields({ unknownKey: "x", education: 5 as unknown as string }),
    ).toEqual({ fields: {}, invalid: false });
  });

  it("skips non-string values for otherwise-valid keys", () => {
    const { fields } = pickEditableFields({
      education: 123 as unknown as string,
      clubs: "ok",
    });
    expect(fields).toEqual({ clubs: "ok" });
  });

  it("accepts every valid personType (incl. '' for auto) without normalizing it", () => {
    for (const pt of ["", "alum", "student", "professor"]) {
      const { fields, invalid } = pickEditableFields({ personType: pt });
      expect(invalid).toBe(false);
      expect(fields.personType).toBe(pt);
    }
  });

  it("flags an out-of-range personType as invalid and drops all fields", () => {
    const { fields, invalid } = pickEditableFields({
      personType: "wizard",
      education: "UNC",
    });
    expect(invalid).toBe(true);
    expect(fields).toEqual({});
  });
});
