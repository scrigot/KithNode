import { describe, it, expect } from "vitest";
import {
  resolveSidebarCollapsed,
  migrateSidebarMode,
  SIDEBAR_MODE_KEY,
  LEGACY_COLLAPSED_KEY,
  type SidebarMode,
} from "./sidebar-mode";

describe("resolveSidebarCollapsed", () => {
  const cases: Array<[SidebarMode, boolean, boolean]> = [
    ["expanded", false, false],
    ["expanded", true, false],
    ["collapsed", false, true],
    ["collapsed", true, true],
    ["hover", false, true], // not hovering -> collapsed
    ["hover", true, false], // hovering -> expanded
  ];
  it.each(cases)("mode=%s hovering=%s -> collapsed=%s", (mode, hovering, expected) => {
    expect(resolveSidebarCollapsed(mode, hovering)).toBe(expected);
  });
});

describe("migrateSidebarMode", () => {
  const store = (m: Record<string, string | null>) => (k: string) => m[k] ?? null;

  it("prefers a valid new enum key", () => {
    expect(migrateSidebarMode(store({ [SIDEBAR_MODE_KEY]: "hover" }))).toBe("hover");
  });

  it("ignores an invalid new key and falls through to legacy", () => {
    expect(
      migrateSidebarMode(store({ [SIDEBAR_MODE_KEY]: "bogus", [LEGACY_COLLAPSED_KEY]: "true" })),
    ).toBe("collapsed");
  });

  it("migrates legacy 'true' -> collapsed", () => {
    expect(migrateSidebarMode(store({ [LEGACY_COLLAPSED_KEY]: "true" }))).toBe("collapsed");
  });

  it("legacy 'false' -> expanded", () => {
    expect(migrateSidebarMode(store({ [LEGACY_COLLAPSED_KEY]: "false" }))).toBe("expanded");
  });

  it("nothing stored -> expanded", () => {
    expect(migrateSidebarMode(store({}))).toBe("expanded");
  });
});
