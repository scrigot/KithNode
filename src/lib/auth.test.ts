import { describe, it, expect } from "vitest";
import { isEmailAllowed } from "./auth-allowlist";

describe("isEmailAllowed", () => {
  it("allows @unc.edu emails", () => {
    expect(isEmailAllowed("student@unc.edu", undefined)).toBe(true);
  });

  it("allows @ad.unc.edu emails", () => {
    expect(isEmailAllowed("staff@ad.unc.edu", undefined)).toBe(true);
  });

  it("allows a gmail explicitly in the env list (case-insensitive)", () => {
    expect(isEmailAllowed("Tester@Gmail.com", "tester@gmail.com,other@gmail.com")).toBe(true);
  });

  it("blocks a gmail NOT in the env list", () => {
    expect(isEmailAllowed("random@gmail.com", "tester@gmail.com")).toBe(false);
  });

  it("blocks empty / undefined email", () => {
    expect(isEmailAllowed("", undefined)).toBe(false);
    expect(isEmailAllowed(null, undefined)).toBe(false);
    expect(isEmailAllowed(undefined, undefined)).toBe(false);
  });
});
