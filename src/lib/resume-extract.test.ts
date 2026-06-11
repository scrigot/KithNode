import { describe, it, expect } from "vitest";
import {
  validateResumePdf,
  buildResumePrompt,
  resumeSchema,
  buildResumeResult,
  MAX_RESUME_BYTES,
  type ResumeExtract,
} from "./resume-extract";

// Helper: base64 of an arbitrary byte array.
const toB64 = (bytes: number[]): string =>
  Buffer.from(Uint8Array.from(bytes)).toString("base64");

// "%PDF" magic header + a little body.
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46];

describe("validateResumePdf", () => {
  it("accepts a base64 payload that starts with the %PDF magic header", () => {
    const result = validateResumePdf(toB64([...PDF_HEADER, 0x2d, 0x31, 0x2e, 0x37]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
    }
  });

  it("rejects a payload missing the %PDF magic bytes", () => {
    // Starts with "PK" (a zip/docx), not a PDF.
    const result = validateResumePdf(toB64([0x50, 0x4b, 0x03, 0x04, 0x00]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Not a PDF");
  });

  it("rejects a payload larger than MAX_RESUME_BYTES (decoded)", () => {
    // Build a valid-headed buffer one byte over the cap, base64 it.
    const big = Buffer.alloc(MAX_RESUME_BYTES + 1);
    big[0] = 0x25;
    big[1] = 0x50;
    big[2] = 0x44;
    big[3] = 0x46;
    const result = validateResumePdf(big.toString("base64"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("PDF too large (max 4MB)");
  });

  it("accepts a payload exactly at the size cap", () => {
    const atCap = Buffer.alloc(MAX_RESUME_BYTES);
    atCap[0] = 0x25;
    atCap[1] = 0x50;
    atCap[2] = 0x44;
    atCap[3] = 0x46;
    const result = validateResumePdf(atCap.toString("base64"));
    expect(result.ok).toBe(true);
  });

  it("rejects a missing payload", () => {
    expect(validateResumePdf(undefined).ok).toBe(false);
    expect(validateResumePdf(null).ok).toBe(false);
  });

  it("rejects a non-string payload", () => {
    expect(validateResumePdf(12345).ok).toBe(false);
    expect(validateResumePdf({ pdf: "x" }).ok).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = validateResumePdf("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("pdf is required");
  });

  it("MAX_RESUME_BYTES is 4MB", () => {
    expect(MAX_RESUME_BYTES).toBe(4 * 1024 * 1024);
  });
});

describe("buildResumePrompt", () => {
  const prompt = buildResumePrompt();

  it("embeds the canonical INDUSTRIES, GREEK ORGS, CLUBS, MAJORS, MINORS, CONCENTRATIONS, and SKILLS pools", () => {
    expect(prompt).toContain("INDUSTRIES:");
    expect(prompt).toContain("GREEK ORGS:");
    expect(prompt).toContain("CLUBS:");
    expect(prompt).toContain("MAJORS:");
    expect(prompt).toContain("MINORS:");
    expect(prompt).toContain("CONCENTRATIONS:");
    expect(prompt).toContain("SKILLS:");
    // Spot-check known canonical entries from each pool.
    expect(prompt).toContain("Investment Banking");
    expect(prompt).toContain("Chi Phi");
    expect(prompt).toContain("Accounting");
    expect(prompt).toContain("Bloomberg Terminal");
  });

  it("maps minors against MINORS (not MAJORS) and embeds the degree designations", () => {
    expect(prompt).toMatch(/minors.*mapped to the MINORS list/);
    // Degree designations are embedded inline for the degrees field.
    expect(prompt).toContain("MBA");
    expect(prompt).toContain("PhD");
    // Finance is a known Business Administration concentration.
    expect(prompt).toContain("Finance");
  });

  it("instructs the model to extract the candidate's own attributes only", () => {
    expect(prompt).toMatch(/CANDIDATE'S OWN attributes/i);
  });

  it("instructs canonical mapping with resume-wording fallback", () => {
    expect(prompt).toMatch(/closest canonical name/i);
    expect(prompt).toMatch(/empty string or empty array/i);
  });
});

describe("resumeSchema", () => {
  it("parses a well-formed extraction object", () => {
    const parsed = resumeSchema.parse({
      university: "UNC Chapel Hill",
      highSchool: "East Chapel Hill High School",
      hometown: "Charlotte, NC",
      greekOrg: "Chi Phi",
      clubs: ["Accounting Society"],
      skills: ["Python", "Excel"],
      majors: ["Economics"],
      minors: ["Computer Science"],
      degrees: ["BS", "MBA"],
      concentration: "Finance",
      targetIndustries: ["Investment Banking"],
      pastFirms: ["Goldman Sachs", "Evercore"],
      educations: [],
      experiences: [],
    });
    expect(parsed.university).toBe("UNC Chapel Hill");
    expect(parsed.majors).toEqual(["Economics"]);
    expect(parsed.degrees).toEqual(["BS", "MBA"]);
    expect(parsed.concentration).toBe("Finance");
    expect(parsed.pastFirms).toEqual(["Goldman Sachs", "Evercore"]);
    expect(parsed.educations).toEqual([]);
    expect(parsed.experiences).toEqual([]);
  });

  it("rejects more than 3 degrees", () => {
    const result = resumeSchema.safeParse({
      university: "",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      clubs: [],
      skills: [],
      majors: [],
      minors: [],
      degrees: ["BS", "MS", "MBA", "PhD"],
      concentration: "",
      targetIndustries: [],
      pastFirms: [],
      educations: [],
      experiences: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 2 majors", () => {
    const result = resumeSchema.safeParse({
      university: "",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      clubs: [],
      skills: [],
      majors: ["A", "B", "C"],
      minors: [],
      degrees: [],
      concentration: "",
      targetIndustries: [],
      pastFirms: [],
      educations: [],
      experiences: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 educations", () => {
    const row = { major: "Economics", degree: "BS", concentration: "" };
    const result = resumeSchema.safeParse({
      university: "",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      clubs: [],
      skills: [],
      majors: [],
      minors: [],
      degrees: [],
      concentration: "",
      targetIndustries: [],
      pastFirms: [],
      educations: [row, row, row, row, row],
      experiences: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 8 experiences", () => {
    const row = { title: "Analyst", firm: "Goldman Sachs", dates: "Summer 2026" };
    const result = resumeSchema.safeParse({
      university: "",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      clubs: [],
      skills: [],
      majors: [],
      minors: [],
      degrees: [],
      concentration: "",
      targetIndustries: [],
      pastFirms: [],
      educations: [],
      experiences: [row, row, row, row, row, row, row, row, row],
    });
    expect(result.success).toBe(false);
  });
});

// Minimal well-formed raw extract for buildResumeResult tests.
const BASE_RAW: ResumeExtract = {
  university: "UNC Chapel Hill",
  highSchool: "",
  hometown: "",
  greekOrg: "",
  clubs: [],
  skills: [],
  majors: [],
  minors: [],
  degrees: [],
  concentration: "",
  targetIndustries: [],
  pastFirms: [],
  educations: [],
  experiences: [],
};

describe("buildResumeResult", () => {
  it("paired education rows yield canonical degree and derived flat arrays", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      educations: [
        { major: "Economics", degree: "BS", concentration: "Finance" },
      ],
    };
    const result = buildResumeResult(raw);
    expect(result.educations).toHaveLength(1);
    expect(result.educations[0].degree).toBe("BS");
    expect(result.educations[0].major).toBe("Economics");
    // Flat fields derived from rows.
    expect(result.majors).toContain("Economics");
    expect(result.degrees).toContain("BS");
    expect(result.concentration).toBe("Finance");
  });

  it("invalid degree token inside an education row is dropped to empty string", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      educations: [
        // "BADTOKEN" is not in ALL_DEGREES; parseEducations -> normalizeDegrees -> "".
        { major: "Economics", degree: "BADTOKEN", concentration: "" },
      ],
    };
    const result = buildResumeResult(raw);
    expect(result.educations[0].degree).toBe("");
    // Row still survives because major is non-empty.
    expect(result.educations[0].major).toBe("Economics");
  });

  it("experience rows derive pastFirms via firmsFromExperiences", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      // Legacy flat pastFirms should be overridden when rows are present.
      pastFirms: ["Legacy Corp"],
      experiences: [
        { title: "Summer Analyst", firm: "Goldman Sachs", dates: "Summer 2026" },
        { title: "Intern", firm: "Evercore", dates: "Summer 2025" },
      ],
    };
    const result = buildResumeResult(raw);
    expect(result.pastFirms).toEqual(["Goldman Sachs", "Evercore"]);
    expect(result.pastFirms).not.toContain("Legacy Corp");
    expect(result.experiences).toHaveLength(2);
  });

  it("empty education rows leave legacy flat majors/degrees/concentration untouched", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      majors: ["Economics"],
      degrees: ["BS"],
      concentration: "Finance",
      educations: [],
    };
    const result = buildResumeResult(raw);
    expect(result.majors).toEqual(["Economics"]);
    expect(result.degrees).toEqual(["BS"]);
    expect(result.concentration).toBe("Finance");
    expect(result.educations).toEqual([]);
  });

  it("empty experience rows leave legacy flat pastFirms untouched", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      pastFirms: ["Goldman Sachs"],
      experiences: [],
    };
    const result = buildResumeResult(raw);
    expect(result.pastFirms).toEqual(["Goldman Sachs"]);
  });

  it("all-empty rows with no content are filtered out by parseEducations", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      // A row with all empty strings: parseEducations filters it (no major/degree/concentration).
      educations: [{ major: "", degree: "", concentration: "" }],
    };
    const result = buildResumeResult(raw);
    // Filtered to empty, so legacy flat fields stand.
    expect(result.educations).toHaveLength(0);
  });

  it("duplicate firms are deduped in pastFirms derived from experiences", () => {
    const raw: ResumeExtract = {
      ...BASE_RAW,
      experiences: [
        { title: "Analyst", firm: "Goldman Sachs", dates: "Summer 2026" },
        { title: "Associate", firm: "Goldman Sachs", dates: "Summer 2025" },
        { title: "Intern", firm: "Evercore", dates: "Summer 2024" },
      ],
    };
    const result = buildResumeResult(raw);
    expect(result.pastFirms).toEqual(["Goldman Sachs", "Evercore"]);
  });
});
