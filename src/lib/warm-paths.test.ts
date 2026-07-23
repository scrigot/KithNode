import { beforeEach, describe, expect, it, vi } from "vitest";

const relationshipsAtCompanies = vi.fn();
vi.mock("@/lib/relationships/repository", () => ({
  relationshipsAtCompanies: (...args: unknown[]) => relationshipsAtCompanies(...args),
}));

import { findWarmPaths } from "./warm-paths";

const relationship = (overrides: Record<string, unknown> = {}) => ({
  contactId: "contact-1",
  name: "Maya Chen",
  title: "Forward Deployed Engineer",
  firmName: "Scale AI",
  linkedInUrl: "https://www.linkedin.com/in/maya",
  state: "verified",
  relationshipType: "former teammate",
  confidence: 1,
  evidence: ["User confirmed they worked together."],
  source: "user_confirmed",
  effectiveAt: null,
  ...overrides,
});

describe("findWarmPaths", () => {
  beforeEach(() => {
    relationshipsAtCompanies.mockReset();
  });

  it("returns only relationships classified as verified", async () => {
    relationshipsAtCompanies.mockResolvedValue(new Map([
      ["scaleai", [
        relationship(),
        relationship({
          contactId: "contact-2",
          name: "Potential Alum",
          state: "potential",
          relationshipType: "shared school",
          evidence: ["Same school; no interaction confirmed."],
        }),
      ]],
    ]));

    await expect(findWarmPaths("user-1", "Scale AI")).resolves.toEqual([{
      intermediaryName: "Maya Chen",
      intermediaryRelation: "former teammate",
      intermediaryLinkedInUrl: "https://www.linkedin.com/in/maya",
      firmName: "Scale AI",
      title: "Forward Deployed Engineer",
      evidence: ["User confirmed they worked together."],
    }]);
  });

  it("does not promote an imported or shared-school contact to a warm path", async () => {
    relationshipsAtCompanies.mockResolvedValue(new Map([
      ["databricks", [
        relationship({
          state: "potential",
          relationshipType: "shared school",
          evidence: ["Both profiles list UNC; no interaction has been confirmed."],
        }),
      ]],
    ]));

    await expect(findWarmPaths("user-1", "Databricks")).resolves.toEqual([]);
  });

  it("returns an empty result when the company has no relationship evidence", async () => {
    relationshipsAtCompanies.mockResolvedValue(new Map());
    await expect(findWarmPaths("user-1", "Unknown Company")).resolves.toEqual([]);
  });

  it("does not query for a blank company", async () => {
    await expect(findWarmPaths("user-1", "")).resolves.toEqual([]);
    expect(relationshipsAtCompanies).not.toHaveBeenCalled();
  });
});
