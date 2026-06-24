import { describe, it, expect } from "vitest";
import { buildDraftPrompt, parseDraft, fallbackDraft, type DraftContext } from "./draft";

const ctx = (p: Partial<DraftContext> = {}): DraftContext => ({
  name: p.name ?? "Dana Reed",
  firmName: p.firmName ?? "Snowflake",
  title: p.title ?? "VP of Data",
  relationshipType: p.relationshipType ?? "",
  strategicValue: p.strategicValue ?? "",
  notes: p.notes ?? "",
  stage: p.stage ?? null,
  daysSinceTouch: p.daysSinceTouch ?? null,
});

describe("parseDraft", () => {
  it("extracts subject + body from JSON", () => {
    const d = parseDraft('ok {"subject":"Hi","body":"Hello there"}')!;
    expect(d.subject).toBe("Hi");
    expect(d.body).toBe("Hello there");
  });
  it("returns null without a body", () => {
    expect(parseDraft("no json")).toBeNull();
    expect(parseDraft('{"subject":"x","body":""}')).toBeNull();
  });
});

describe("fallbackDraft", () => {
  it("uses first name, references firm, signs off as sender", () => {
    const d = fallbackDraft(ctx(), "Sam");
    expect(d.body).toContain("Hi Dana");
    expect(d.body).toContain("Snowflake");
    expect(d.body.trim().endsWith("Sam")).toBe(true);
  });
  it("references prior history when notes exist", () => {
    const d = fallbackDraft(ctx({ notes: "met at conf" }), "Sam");
    expect(d.body.toLowerCase()).toContain("reconnect");
  });
});

describe("buildDraftPrompt", () => {
  it("includes the AI-consulting framing and JSON instruction", () => {
    const p = buildDraftPrompt(ctx(), "Sam");
    expect(p).toContain("AI consulting for data services");
    expect(p).toContain('{"subject"');
  });
});
