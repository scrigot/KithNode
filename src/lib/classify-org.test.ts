import { describe, it, expect } from "vitest";
import { classifyOrg, isClubOrg } from "./classify-org";
import clubs from "@/lib/data/college-clubs.json";
import greekOrgs from "@/lib/data/greek-orgs.json";

describe("classifyOrg", () => {
  it("treats a real employer as a company", () => {
    expect(classifyOrg("Goldman Sachs").kind).toBe("company");
    expect(classifyOrg("Mizuho").kind).toBe("company");
    expect(isClubOrg("Goldman Sachs")).toBe(false);
  });

  it("flags a fraternity/sorority by keyword", () => {
    expect(classifyOrg("Chi Phi Fraternity").kind).toBe("greek");
    expect(classifyOrg("Kappa Delta Sorority").kind).toBe("greek");
    expect(isClubOrg("Chi Phi Fraternity")).toBe(true);
  });

  it("recognizes a canonical pool greek org and club", () => {
    expect(classifyOrg((greekOrgs as string[])[0]).kind).toBe("greek");
    expect(classifyOrg((clubs as string[])[0]).kind).toBe("club");
  });

  it("is blank-safe and returns the trimmed display name", () => {
    expect(classifyOrg("").kind).toBe("company");
    expect(classifyOrg("   ").name).toBe("");
    expect(classifyOrg("  Goldman Sachs  ").name).toBe("Goldman Sachs");
  });
});
