import { describe, it, expect } from "vitest";
import { isUnlocked } from "./contact-access";

const VIEWER = "sam@unc.edu";
const OTHER = "other@unc.edu";
const ID = "contact-abc";

describe("isUnlocked", () => {
  it("unlocks when viewer is the importer", () => {
    expect(isUnlocked(VIEWER, VIEWER, new Set(), ID)).toBe(true);
  });

  it("unlocks when viewer rated the contact high_value", () => {
    expect(isUnlocked(OTHER, VIEWER, new Set([ID]), ID)).toBe(true);
  });

  it("locks when imported by someone else and viewer has no discover row", () => {
    expect(isUnlocked(OTHER, VIEWER, new Set(), ID)).toBe(false);
  });

  it("locks when imported by someone else and viewer only skipped (skip is not in highValueIds)", () => {
    // skip-rated contacts are never added to the highValueIds Set — stays locked
    expect(isUnlocked(OTHER, VIEWER, new Set(["other-contact-id"]), ID)).toBe(false);
  });

  it("locks when importedByUserId is null/undefined and no high_value rating", () => {
    expect(isUnlocked(null, VIEWER, new Set(), ID)).toBe(false);
    expect(isUnlocked(undefined, VIEWER, new Set(), ID)).toBe(false);
  });

  it("unlocks when importedByUserId is null but contact is in highValueIds", () => {
    expect(isUnlocked(null, VIEWER, new Set([ID]), ID)).toBe(true);
  });
});
