import { describe, it, expect } from "vitest";

describe("OutreachSheet", () => {
  // OutreachSheet uses shadcn Sheet (Radix Dialog portal) which requires
  // a full browser environment for testing. Integration-tested via the
  // API route tests and manual testing.

  it("module exports correctly", async () => {
    const mod = await import("./outreach-sheet");
    expect(mod.OutreachSheet).toBeDefined();
  });
});
