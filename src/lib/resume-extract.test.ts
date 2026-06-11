import { describe, it, expect } from "vitest";
import {
  validateResumePdf,
  buildResumePrompt,
  resumeSchema,
  MAX_RESUME_BYTES,
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

  it("embeds the canonical INDUSTRIES, GREEK ORGS, CLUBS, and MAJORS pools", () => {
    expect(prompt).toContain("INDUSTRIES:");
    expect(prompt).toContain("GREEK ORGS:");
    expect(prompt).toContain("CLUBS:");
    expect(prompt).toContain("MAJORS:");
    // Spot-check known canonical entries from each pool.
    expect(prompt).toContain("Investment Banking");
    expect(prompt).toContain("Chi Phi");
    expect(prompt).toContain("Accounting");
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
      targetIndustries: ["Investment Banking"],
      pastFirms: ["Goldman Sachs", "Evercore"],
    });
    expect(parsed.university).toBe("UNC Chapel Hill");
    expect(parsed.majors).toEqual(["Economics"]);
    expect(parsed.pastFirms).toEqual(["Goldman Sachs", "Evercore"]);
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
      targetIndustries: [],
      pastFirms: [],
    });
    expect(result.success).toBe(false);
  });
});
