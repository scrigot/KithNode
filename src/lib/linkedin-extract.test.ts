import { describe, it, expect } from "vitest";
import {
  linkedinProfileSchema,
  buildLinkedInPrompt,
  validateProfileText,
  MAX_PROFILE_TEXT,
} from "./linkedin-extract";

describe("validateProfileText", () => {
  it("rejects non-strings and too-short text", () => {
    expect(validateProfileText(undefined).ok).toBe(false);
    expect(validateProfileText(123).ok).toBe(false);
    expect(validateProfileText("short").ok).toBe(false);
  });

  it("accepts real text and caps length", () => {
    const ok = validateProfileText("x".repeat(100));
    expect(ok).toEqual({ ok: true, text: "x".repeat(100) });
    const capped = validateProfileText("y".repeat(MAX_PROFILE_TEXT + 5000));
    expect(capped.ok).toBe(true);
    if (capped.ok) expect(capped.text.length).toBe(MAX_PROFILE_TEXT);
  });
});

describe("buildLinkedInPrompt", () => {
  it("embeds the page text and the owner-only guardrail + pools", () => {
    const prompt = buildLinkedInPrompt("ALAN SAJ — Tech Consulting at EY");
    expect(prompt).toContain("ALAN SAJ — Tech Consulting at EY");
    expect(prompt).toContain("ONLY the person whose profile this is");
    expect(prompt).toContain("People also viewed");
    expect(prompt).toContain("SKILLS:");
    expect(prompt).toContain("CLUBS:");
  });

  it("includes mutual connections instruction", () => {
    const prompt = buildLinkedInPrompt("some page text");
    expect(prompt).toContain("mutual connections");
  });

  it("includes high-school and graduation-year instructions", () => {
    const prompt = buildLinkedInPrompt("some page text");
    expect(prompt).toContain("highSchool: their high school");
    expect(prompt).toContain("graduationYear:");
    expect(prompt).toContain("Class of 20XX");
  });

  it("hardens clubs vs experiences classification", () => {
    const prompt = buildLinkedInPrompt("some page text");
    expect(prompt).toContain("NOT under experiences");
  });
});

const validBase = {
  name: "Alan Saj",
  headline: "Tech Consulting @ EY",
  company: "EY",
  location: "Charlotte, NC",
  skills: ["Machine Learning", "Python"],
  experiences: [{ title: "Tech Consulting", firm: "EY", start: "2025", end: "Present" }],
  educations: [{ school: "UNC", degree: "BS", major: "Data Science" }],
  clubs: ["Abrams Scholar"],
};

describe("linkedinProfileSchema", () => {
  it("validates a well-formed extraction", () => {
    const parsed = linkedinProfileSchema.parse(validBase);
    expect(parsed.name).toBe("Alan Saj");
    expect(parsed.skills).toHaveLength(2);
  });

  it("keeps mutuals when provided", () => {
    const parsed = linkedinProfileSchema.parse({
      ...validBase,
      mutuals: [{ name: "Khalil Rahman" }],
    });
    expect(parsed.mutuals).toEqual([{ name: "Khalil Rahman" }]);
  });

  it("defaults mutuals to [] when omitted", () => {
    const parsed = linkedinProfileSchema.parse(validBase);
    expect(parsed.mutuals).toEqual([]);
  });

  it("parses the new highSchool/graduationYear/notes/tags fields", () => {
    const parsed = linkedinProfileSchema.parse({
      ...validBase,
      highSchool: "Charlotte Country Day School",
      graduationYear: 2027,
      notes: "Junior consultant at EY focused on tech.",
      tags: ["Consulting", "AI"],
    });
    expect(parsed.highSchool).toBe("Charlotte Country Day School");
    expect(parsed.graduationYear).toBe(2027);
    expect(parsed.notes).toBe("Junior consultant at EY focused on tech.");
    expect(parsed.tags).toEqual(["Consulting", "AI"]);
  });

  it("defaults highSchool/notes/tags and omits graduationYear when absent", () => {
    const parsed = linkedinProfileSchema.parse(validBase);
    expect(parsed.highSchool).toBe("");
    expect(parsed.notes).toBe("");
    expect(parsed.tags).toEqual([]);
    expect(parsed.graduationYear).toBeUndefined();
  });
});
