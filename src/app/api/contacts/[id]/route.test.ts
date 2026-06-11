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
  it("keeps known editable keys (incl. name/title/firmName/university) and ignores unknown ones", () => {
    const { fields, invalid } = pickEditableFields({
      name: "Aryan Aladar",
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
      name: "Aryan Aladar",
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

  it("accepts a valid track + role pair from the taxonomy", () => {
    const { fields, invalid } = pickEditableFields({
      track: "AI",
      role: "AI Engineer",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "AI", role: "AI Engineer" });
  });

  it("accepts clearing track + role to empty strings", () => {
    const { fields, invalid } = pickEditableFields({ track: "", role: "" });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "", role: "" });
  });

  it("accepts a role alone and infers nothing extra (track stays absent)", () => {
    const { fields, invalid } = pickEditableFields({ role: "Private Equity" });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ role: "Private Equity" });
  });

  it("flags an off-taxonomy track as invalid and drops all fields", () => {
    const { fields, invalid } = pickEditableFields({ track: "Crypto", education: "UNC" });
    expect(invalid).toBe(true);
    expect(fields).toEqual({});
  });

  it("flags an off-taxonomy role as invalid", () => {
    const { invalid } = pickEditableFields({ role: "Degen Trader" });
    expect(invalid).toBe(true);
  });

  it("flags a track/role mismatch as invalid (role not in the set track)", () => {
    // AI Engineer is an AI role, not a Finance role.
    const { invalid } = pickEditableFields({ track: "Finance", role: "AI Engineer" });
    expect(invalid).toBe(true);
  });

  it("flags a role-only edit whose owning track conflicts only when inconsistent", () => {
    // role alone is always self-consistent (track inferred from the role).
    const { invalid } = pickEditableFields({ role: "Quant" });
    expect(invalid).toBe(false);
  });

  it("keeps canonical degrees, rewrites casing, and drops junk tokens (no 400)", () => {
    const { fields, invalid } = pickEditableFields({
      degrees: "bs, mba, finance club, wizard",
    });
    expect(invalid).toBe(false);
    expect(fields.degrees).toBe("BS, MBA");
  });

  it("normalizes concentration like other free text (cap 160, collapse whitespace)", () => {
    const { fields } = pickEditableFields({
      concentration: "  Finance   Concentration  ",
    });
    expect(fields.concentration).toBe("Finance Concentration");

    const { fields: capped } = pickEditableFields({
      concentration: "z".repeat(300),
    });
    expect(capped.concentration).toHaveLength(160);
  });

  it("drops a degrees field with no valid tokens to empty string (still no 400)", () => {
    const { fields, invalid } = pickEditableFields({ degrees: "history, finance" });
    expect(invalid).toBe(false);
    expect(fields.degrees).toBe("");
  });

  it("accepts educations array, stores JSON-stringified rows, and derives flat columns", () => {
    const { fields, invalid } = pickEditableFields({
      educations: [
        { major: "Computer Science", degree: "BS", concentration: "AI" },
        { major: "", degree: "MBA", concentration: "" },
      ],
    });
    expect(invalid).toBe(false);
    // educations stored as JSON string
    const rows = JSON.parse(fields.educations);
    expect(rows).toHaveLength(2);
    expect(rows[0].major).toBe("Computer Science");
    // flat fields derived
    expect(fields.major).toBe("Computer Science");
    expect(fields.degrees).toBe("BS, MBA");
    expect(fields.concentration).toBe("AI");
  });

  it("drops all-empty educations rows and still sets flat fields", () => {
    const { fields, invalid } = pickEditableFields({
      educations: [
        { major: "", degree: "", concentration: "" },
        { major: "Economics", degree: "BA", concentration: "" },
      ],
    });
    expect(invalid).toBe(false);
    const rows = JSON.parse(fields.educations);
    expect(rows).toHaveLength(1);
    expect(fields.major).toBe("Economics");
  });

  it("sets flat fields to empty strings when educations array is empty", () => {
    const { fields, invalid } = pickEditableFields({ educations: [] });
    expect(invalid).toBe(false);
    expect(JSON.parse(fields.educations)).toHaveLength(0);
    expect(fields.major).toBe("");
    expect(fields.degrees).toBe("");
    expect(fields.concentration).toBe("");
  });

  it("ignores educations when the value is not an array (string body ignored)", () => {
    const { fields } = pickEditableFields({
      education: "UNC",
      // educations as a string is invalid; only arrays are processed
    });
    expect(fields).not.toHaveProperty("educations");
  });
});
