import { describe, it, expect } from "vitest";
import {
  redactName,
  redactEmail,
  redactLinkedInUrl,
  redactContact,
  maybeRedact,
} from "./redact";

const BLOCK = "\u2588";

describe("redactName", () => {
  it("redacts a basic two-token name keeping first letter of each token", () => {
    const result = redactName("Jacob Goldstein");
    expect(result).toBe(`J${BLOCK.repeat(4)} G${BLOCK.repeat(8)}`);
    // First letter visible, no other letters leak
    expect(result.startsWith("J")).toBe(true);
    expect(result.includes("acob")).toBe(false);
    expect(result.includes("oldstein")).toBe(false);
  });

  it("redacts a single-word name", () => {
    const result = redactName("Madonna");
    expect(result).toBe(`M${BLOCK.repeat(6)}`);
    expect(result.includes("adonna")).toBe(false);
  });

  it("returns 6 blocks for empty input", () => {
    expect(redactName("")).toBe(BLOCK.repeat(6));
  });

  it("returns empty string for whitespace-only input (no real tokens to blur)", () => {
    // Whitespace-only is truthy, so the !name guard doesn't fire,
    // but split+filter leaves no tokens to blur.
    expect(redactName("   ")).toBe("");
  });

  it("redacts three-token names (first/middle/last)", () => {
    const result = redactName("Bentley Rae Scott");
    // Each token: first letter + at least 3 blocks (capped at 8)
    expect(result.startsWith("B")).toBe(true);
    expect(result.split(" ").length).toBe(3);
    expect(result.includes("entley")).toBe(false);
    expect(result.includes("ae")).toBe(false);
    expect(result.includes("cott")).toBe(false);
  });
});

describe("redactEmail", () => {
  it("redacts a standard email format", () => {
    const result = redactEmail("jacob@goldman.com");
    expect(result).toBe(`j${BLOCK.repeat(4)}@g${BLOCK.repeat(6)}.com`);
    expect(result.includes("acob")).toBe(false);
    expect(result.includes("oldman")).toBe(false);
  });

  it("returns empty string for invalid email (no @)", () => {
    expect(redactEmail("notanemail")).toBe("");
    expect(redactEmail("")).toBe("");
  });

  it("preserves multi-segment TLDs", () => {
    const result = redactEmail("user@firm.co.uk");
    expect(result.endsWith(".co.uk")).toBe(true);
  });
});

describe("redactLinkedInUrl", () => {
  it("returns a generic blurred linkedin path regardless of input", () => {
    expect(redactLinkedInUrl("https://linkedin.com/in/jacob-goldstein")).toBe(
      `linkedin.com/in/${BLOCK.repeat(8)}`,
    );
  });
});

describe("redactContact", () => {
  it("blurs PII fields and sets isRedacted=true", () => {
    const c = {
      id: "abc123",
      name: "Jacob Goldstein",
      email: "jacob@goldman.com",
      linkedInUrl: "https://linkedin.com/in/jacob",
      firmName: "Goldman Sachs",
      title: "VP",
      warmthScore: 85,
      tier: "hot",
      importedByUserId: "other@example.com",
    };
    const r = redactContact(c);
    expect(r.isRedacted).toBe(true);
    expect(r.name.includes("acob")).toBe(false);
    expect(r.email.includes("acob")).toBe(false);
    expect(r.linkedInUrl).toBe(`linkedin.com/in/${BLOCK.repeat(8)}`);
    // Aggregate-signal fields preserved
    expect(r.firmName).toBe("Goldman Sachs");
    expect(r.title).toBe("VP");
    expect(r.warmthScore).toBe(85);
    expect(r.tier).toBe("hot");
    expect(r.id).toBe("abc123");
  });

  it("handles contacts with no email or linkedInUrl", () => {
    const c = { name: "Jacob Goldstein" };
    const r = redactContact(c);
    expect(r.email).toBe("");
    expect(r.linkedInUrl).toBe("");
    expect(r.isRedacted).toBe(true);
  });
});

describe("maybeRedact", () => {
  it("returns contact unchanged when imported by current user", () => {
    const c = {
      name: "Jacob Goldstein",
      email: "jacob@goldman.com",
      importedByUserId: "sam@unc.edu",
    };
    const r = maybeRedact(c, "sam@unc.edu");
    expect(r).toBe(c);
    expect(r.name).toBe("Jacob Goldstein");
    expect("isRedacted" in r).toBe(false);
  });

  it("redacts when contact imported by a different user", () => {
    const c = {
      name: "Jacob Goldstein",
      email: "jacob@goldman.com",
      importedByUserId: "other@example.com",
    };
    const r = maybeRedact(c, "sam@unc.edu");
    expect("isRedacted" in r && r.isRedacted).toBe(true);
    expect(r.name.includes("acob")).toBe(false);
  });

  it("redacts when contact has no importedByUserId (defensive)", () => {
    const c = { name: "Jacob Goldstein" };
    const r = maybeRedact(c, "sam@unc.edu");
    expect("isRedacted" in r && r.isRedacted).toBe(true);
  });
});
