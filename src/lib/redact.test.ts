import { describe, it, expect } from "vitest";
import {
  redactName,
  redactEmail,
  redactLinkedInUrl,
  redactContact,
  poolSafeContact,
  maybeRedact,
} from "./redact";

// Private columns that belong to the importing OWNER (or are another user's
// email) and must NEVER reach a different user via the shared Discover pool —
// in EITHER the locked or unlocked shape.
const FORBIDDEN_POOL_FIELDS = [
  "importedByUserId",
  "isFriend",
  "lastSpokenAt",
  "speakFrequency",
  "hometown",
  "highSchool",
  "passions",
] as const;

// A representative pool contact carrying every private column an owner row has.
const POOL_CONTACT = {
  id: "pool-1",
  name: "Jacob Goldstein",
  email: "jacob@goldman.com",
  firmName: "Goldman Sachs",
  title: "VP",
  university: "UNC",
  linkedInUrl: "https://linkedin.com/in/jacob-goldstein",
  location: "New York, NY",
  education: "UNC 2018",
  affiliations: "Chi Phi,Finance Club",
  warmthScore: 85,
  tier: "hot",
  graduationYear: 2018,
  industry: "Investment Banking",
  // Owner's private relationship data — all of this must be stripped.
  importedByUserId: "owner@example.com",
  isFriend: true,
  lastSpokenAt: "2026-01-01",
  speakFrequency: "monthly",
  hometown: "Charlotte, NC",
  highSchool: "Myers Park",
  passions: "sailing",
};

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
    // email is always emptied for a pool contact (never the blurred form).
    expect(r.email).toBe("");
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

  it("drops every owner-private field in the LOCKED shape", () => {
    const r = redactContact(POOL_CONTACT);
    expect(r.isRedacted).toBe(true);
    for (const field of FORBIDDEN_POOL_FIELDS) {
      expect(r[field], `locked card leaked ${field}`).toBeUndefined();
    }
    // email present-but-empty, never the real or blurred address.
    expect(r.email).toBe("");
    expect(JSON.stringify(r)).not.toContain("jacob@goldman.com");
    expect(JSON.stringify(r)).not.toContain("owner@example.com");
    // Allowlisted signal still flows so the locked card stays useful.
    expect(r.firmName).toBe("Goldman Sachs");
    expect(r.warmthScore).toBe(85);
    expect(r.graduationYear).toBe(2018);
  });
});

describe("poolSafeContact (high_value unlock shape)", () => {
  it("drops every owner-private field in the UNLOCKED shape", () => {
    const r = poolSafeContact(POOL_CONTACT);
    expect(r.isRedacted).toBe(false);
    for (const field of FORBIDDEN_POOL_FIELDS) {
      expect(r[field], `unlocked card leaked ${field}`).toBeUndefined();
    }
    expect(r.email).toBe("");
    expect(JSON.stringify(r)).not.toContain("jacob@goldman.com");
    expect(JSON.stringify(r)).not.toContain("owner@example.com");
  });

  it("reveals the real identity fields the unlock is supposed to expose", () => {
    const r = poolSafeContact(POOL_CONTACT);
    // The product contract: a high_value unlock reveals name / firm / title /
    // linkedInUrl / location / education — unredacted, but still no PII columns.
    expect(r.name).toBe("Jacob Goldstein");
    expect(r.firmName).toBe("Goldman Sachs");
    expect(r.title).toBe("VP");
    expect(r.linkedInUrl).toBe("https://linkedin.com/in/jacob-goldstein");
    expect(r.location).toBe("New York, NY");
    expect(r.education).toBe("UNC 2018");
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

  it("strips owner-private fields for a pool contact (the route's actual call)", () => {
    const r = maybeRedact(POOL_CONTACT, "sam@unc.edu");
    expect("isRedacted" in r && r.isRedacted).toBe(true);
    for (const field of FORBIDDEN_POOL_FIELDS) {
      expect(
        (r as Record<string, unknown>)[field],
        `pool card leaked ${field}`,
      ).toBeUndefined();
    }
    expect(JSON.stringify(r)).not.toContain("jacob@goldman.com");
    expect(JSON.stringify(r)).not.toContain("owner@example.com");
  });

  it("redacts when contact has no importedByUserId (defensive)", () => {
    const c = { name: "Jacob Goldstein" };
    const r = maybeRedact(c, "sam@unc.edu");
    expect("isRedacted" in r && r.isRedacted).toBe(true);
  });
});
