import { describe, expect, it } from "vitest";
import { isLikelyPersonName, isValidPersonName } from "./name-validator";

describe("isValidPersonName", () => {
  it("accepts plain two-word names", () => {
    expect(isValidPersonName("John Smith")).toBe(true);
    expect(isValidPersonName("Siri Dronavalli")).toBe(true);
    expect(isValidPersonName("Elizabeth Kelly")).toBe(true);
  });

  it("accepts three- and four-token names", () => {
    expect(isValidPersonName("Maggie Anne Miller")).toBe(true);
    expect(isValidPersonName("Robert W Baird III")).toBe(true);
  });

  it("rejects single tokens and excessively long names", () => {
    expect(isValidPersonName("Madonna")).toBe(false);
    expect(isValidPersonName("John Jacob Jingleheimer Schmidt The Third")).toBe(false);
  });

  it("rejects job-title fragments scrapers commonly mistake for names", () => {
    expect(isValidPersonName("VP Marketing")).toBe(false);
    expect(isValidPersonName("Managing Director")).toBe(false);
    expect(isValidPersonName("Operations Analyst")).toBe(false);
    expect(isValidPersonName("General Partner")).toBe(false);
  });

  it("rejects city / location strings", () => {
    expect(isValidPersonName("New York")).toBe(false);
    expect(isValidPersonName("San Francisco")).toBe(false);
    expect(isValidPersonName("Bangalore India")).toBe(false);
  });

  it("rejects concatenated junk like 'Eric PoirierChief'", () => {
    expect(isValidPersonName("Eric PoirierChief")).toBe(false);
  });

  it("rejects strings containing digits or forbidden punctuation", () => {
    expect(isValidPersonName("John 2 Smith")).toBe(false);
    expect(isValidPersonName("Mr. John Smith")).toBe(false);
    expect(isValidPersonName("D'Angelo Russell")).toBe(false);
  });

  it("rejects empty / too-short input", () => {
    expect(isValidPersonName("")).toBe(false);
    expect(isValidPersonName("Jo")).toBe(false);
  });

  it("rejects marketing chrome", () => {
    expect(isValidPersonName("Learn More")).toBe(false);
    expect(isValidPersonName("About Us")).toBe(false);
    expect(isValidPersonName("Most Innovative")).toBe(false);
  });
});

describe("isLikelyPersonName", () => {
  it("accepts plain two-token names", () => {
    expect(isLikelyPersonName("Jane Doe")).toBe(true);
    expect(isLikelyPersonName("Aryan Aladar")).toBe(true);
  });

  it("accepts names with apostrophes and hyphens", () => {
    expect(isLikelyPersonName("Sarah O'Brien")).toBe(true);
    expect(isLikelyPersonName("Anne Smith-Jones")).toBe(true);
  });

  it("accepts names with single-letter middle initials", () => {
    expect(isLikelyPersonName("John J. Smith")).toBe(true);
    expect(isLikelyPersonName("Mary A. Jones")).toBe(true);
  });

  it("rejects the junk names that leaked into prod", () => {
    expect(isLikelyPersonName("We Build Safer Systems")).toBe(false);
    expect(isLikelyPersonName("Managed Agents")).toBe(false);
  });

  it("rejects all-caps / acronym tokens", () => {
    expect(isLikelyPersonName("MANAGED AGENTS")).toBe(false);
  });

  it("rejects single token (not a full name)", () => {
    expect(isLikelyPersonName("Anthropic")).toBe(false);
  });

  it("rejects names with more than 4 tokens", () => {
    expect(isLikelyPersonName("We Build Safer Systems Today Now")).toBe(false);
  });

  it("rejects names containing digits", () => {
    expect(isLikelyPersonName("John 2 Smith")).toBe(false);
  });

  it("rejects empty and too-short input", () => {
    expect(isLikelyPersonName("")).toBe(false);
    expect(isLikelyPersonName("Jo")).toBe(false);
  });
});
