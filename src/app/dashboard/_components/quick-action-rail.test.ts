import { describe, expect, it } from "vitest";
import { clampWeeklyGoal, contactsFilterHref } from "./quick-action-rail";

describe("quick action rail helpers", () => {
  it("routes a selected tier to the real contacts page", () => {
    expect(contactsFilterHref("hot")).toBe("/dashboard/contacts?tier=hot");
  });

  it("clamps weekly goals to the supported range", () => {
    expect(clampWeeklyGoal(-10)).toBe(1);
    expect(clampWeeklyGoal(7.6)).toBe(8);
    expect(clampWeeklyGoal(100)).toBe(20);
  });
});
