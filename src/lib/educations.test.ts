import { describe, it, expect } from "vitest";
import {
  parseEducations,
  parseExperiences,
  educationsFromFlat,
  flatFromEducations,
  firmsFromExperiences,
  MAX_EDUCATIONS,
  MAX_EXPERIENCES,
} from "./educations";

describe("parseEducations", () => {
  it("returns [] on empty, garbage, and non-array JSON", () => {
    expect(parseEducations("")).toEqual([]);
    expect(parseEducations(null)).toEqual([]);
    expect(parseEducations("not json")).toEqual([]);
    expect(parseEducations('{"major":"CS"}')).toEqual([]);
  });

  it("canonicalizes degree tokens and drops unknown degrees to ''", () => {
    const rows = parseEducations(
      JSON.stringify([
        { major: "Computer Science", degree: "bs", concentration: "" },
        { major: "Business Administration", degree: "Finance Club", concentration: "Finance" },
      ]),
    );
    expect(rows[0].degree).toBe("BS");
    expect(rows[1].degree).toBe("");
    expect(rows[1].concentration).toBe("Finance");
  });

  it("drops all-empty rows and caps at MAX_EDUCATIONS", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      major: `Major ${i}`,
      degree: "",
      concentration: "",
    }));
    expect(parseEducations(JSON.stringify(many))).toHaveLength(MAX_EDUCATIONS);
    expect(
      parseEducations(JSON.stringify([{ major: "", degree: "", concentration: "" }])),
    ).toEqual([]);
  });
});

describe("parseExperiences", () => {
  it("returns [] on garbage and drops rows with neither title nor firm", () => {
    expect(parseExperiences("nope")).toEqual([]);
    expect(
      parseExperiences(JSON.stringify([{ title: "", firm: "", dates: "Summer 2026" }])),
    ).toEqual([]);
  });

  it("keeps title/firm/dates and caps at MAX_EXPERIENCES", () => {
    const rows = parseExperiences(
      JSON.stringify([{ title: "Intern", firm: "CSUSA", dates: "Summer 2026" }]),
    );
    expect(rows).toEqual([{ title: "Intern", firm: "CSUSA", dates: "Summer 2026" }]);
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `T${i}`, firm: "F", dates: "" }));
    expect(parseExperiences(JSON.stringify(many))).toHaveLength(MAX_EXPERIENCES);
  });
});

describe("educationsFromFlat → flatFromEducations round trip", () => {
  it("single major: pairs first undergrad degree + concentration, grad degree gets its own row", () => {
    const rows = educationsFromFlat("Business Administration", "BSBA, MBA", "Finance");
    expect(rows).toEqual([
      { major: "Business Administration", degree: "BSBA", concentration: "Finance" },
      { major: "", degree: "MBA", concentration: "" },
    ]);
    expect(flatFromEducations(rows)).toEqual({
      major: "Business Administration",
      degrees: "BSBA, MBA",
      concentration: "Finance",
    });
  });

  it("two majors: no pairing guesses — degrees become degree-only rows, flat is lossless", () => {
    const rows = educationsFromFlat("Computer Science, Economics", "BS, BA", "Sports Analytics");
    expect(rows).toEqual([
      { major: "Computer Science", degree: "", concentration: "" },
      { major: "Economics", degree: "", concentration: "" },
      { major: "", degree: "BS", concentration: "" },
      { major: "", degree: "BA", concentration: "" },
      { major: "", degree: "", concentration: "Sports Analytics" },
    ]);
    expect(flatFromEducations(rows)).toEqual({
      major: "Computer Science, Economics",
      degrees: "BS, BA",
      concentration: "Sports Analytics",
    });
  });

  it("empty flat fields synthesize no rows", () => {
    expect(educationsFromFlat("", "", "")).toEqual([]);
    expect(educationsFromFlat(null, undefined, "")).toEqual([]);
  });

  it("flatFromEducations dedupes repeated majors and concentrations case-insensitively", () => {
    const flat = flatFromEducations([
      { major: "Economics", degree: "BA", concentration: "Finance" },
      { major: "economics", degree: "MS", concentration: "finance" },
    ]);
    expect(flat.major).toBe("Economics");
    expect(flat.degrees).toBe("BA, MS");
    expect(flat.concentration).toBe("Finance");
  });
});

describe("firmsFromExperiences", () => {
  it("dedupes case-insensitively, preserves order, skips empty firms", () => {
    expect(
      firmsFromExperiences([
        { title: "Intern", firm: "Goldman Sachs", dates: "" },
        { title: "Analyst", firm: "goldman sachs", dates: "" },
        { title: "Founder", firm: "", dates: "" },
        { title: "Intern", firm: "CSUSA", dates: "Summer 2026" },
      ]),
    ).toEqual(["Goldman Sachs", "CSUSA"]);
  });
});
