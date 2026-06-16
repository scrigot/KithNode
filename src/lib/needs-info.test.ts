import { describe, it, expect } from "vitest";
import { hasPersonalData, contactNeedsInfo } from "./needs-info";

describe("hasPersonalData", () => {
  it("is false for a bare CSV stub (only name/company/title)", () => {
    expect(hasPersonalData({ name: "A", firmName: "Co", title: "Analyst" })).toBe(false);
  });
  it("is true when any personal field is populated", () => {
    expect(hasPersonalData({ education: "UNC Chapel Hill" })).toBe(true);
    expect(hasPersonalData({ greekOrg: "Chi Phi" })).toBe(true);
    expect(hasPersonalData({ skills: "Python, SQL" })).toBe(true);
  });
  it("treats empty strings and empty JSON arrays as no data", () => {
    expect(
      hasPersonalData({ education: "  ", experiences: "[]", clubMemberships: "[]" }),
    ).toBe(false);
    expect(hasPersonalData({ experiences: '[{"title":"Analyst"}]' })).toBe(true);
  });
});

describe("contactNeedsInfo", () => {
  it("is true for a cold contact with no personal data", () => {
    expect(contactNeedsInfo({ name: "A", firmName: "Co" }, "cold")).toBe(true);
  });
  it("is false when the contact has personal data (genuine cold)", () => {
    expect(contactNeedsInfo({ education: "Duke" }, "cold")).toBe(false);
  });
  it("is false for any non-cold tier, even with no data", () => {
    expect(contactNeedsInfo({ name: "A" }, "warm")).toBe(false);
    expect(contactNeedsInfo({ name: "A" }, "kith")).toBe(false);
    expect(contactNeedsInfo({ name: "A" }, "monitor")).toBe(false);
  });
});
