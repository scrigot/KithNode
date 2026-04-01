import { describe, it, expect } from "vitest";
import { isAutomationAllowed, isAutoGuardActive } from "./autoguard";

describe("AutoGuard utilities", () => {
  it("allows automation for drafted status", () => {
    expect(isAutomationAllowed("drafted")).toBe(true);
  });

  it("allows automation for sent status", () => {
    expect(isAutomationAllowed("sent")).toBe(true);
  });

  it("blocks automation for replied status", () => {
    expect(isAutomationAllowed("replied")).toBe(false);
  });

  it("allows automation for bounced status", () => {
    expect(isAutomationAllowed("bounced")).toBe(true);
  });

  it("detects AutoGuard active on replied", () => {
    expect(isAutoGuardActive("replied")).toBe(true);
  });

  it("detects AutoGuard inactive on sent", () => {
    expect(isAutoGuardActive("sent")).toBe(false);
  });
});
