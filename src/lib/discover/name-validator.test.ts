import { describe, expect, it } from "vitest";
import { isValidPersonName } from "./name-validator";

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
