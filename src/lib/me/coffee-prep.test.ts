import { describe, it, expect } from "vitest";
import { parsePrepBrief, fallbackBrief, memoryHash, contextHash, prepExtraFromActivities, mergePrepExtra, type PrepContext } from "./coffee-prep";

const ctx = (p: Partial<PrepContext> = {}): PrepContext => ({
  name: p.name ?? "Dana Reed",
  firmName: p.firmName ?? "Snowflake",
  title: p.title ?? "VP of Data",
  email: p.email ?? "",
  relationshipType: p.relationshipType ?? "",
  strategicValue: p.strategicValue ?? "",
  notes: p.notes ?? "",
  pipelines: p.pipelines ?? [],
  daysSinceTouch: p.daysSinceTouch ?? null,
});

describe("parsePrepBrief", () => {
  it("parses valid JSON and caps questions at 5", () => {
    const text = `sure! {"who":"A leader","ourHistory":"met once","theirFocus":"data","questions":["q1","q2","q3","q4","q5","q6"],"theAsk":"intro","redFlags":["x"]}`;
    const b = parsePrepBrief(text)!;
    expect(b.who).toBe("A leader");
    expect(b.questions).toHaveLength(5);
    expect(b.redFlags).toEqual(["x"]);
  });
  it("returns null for non-JSON / empty", () => {
    expect(parsePrepBrief("no json here")).toBeNull();
    expect(parsePrepBrief('{"questions":[]}')).toBeNull();
  });
});

describe("fallbackBrief", () => {
  it("always yields 5 questions and uses notes for history", () => {
    const b = fallbackBrief(ctx({ notes: "We met at a conference." }));
    expect(b.questions).toHaveLength(5);
    expect(b.ourHistory).toContain("conference");
  });
  it("warns not to pitch an ecosystem connector", () => {
    const b = fallbackBrief(ctx({ relationshipType: "ecosystem" }));
    expect(b.redFlags.join(" ")).toMatch(/pitch/i);
  });
});

describe("memoryHash", () => {
  it("is stable and changes when inputs change", () => {
    const a = memoryHash(ctx({ notes: "x" }));
    expect(a).toBe(memoryHash(ctx({ notes: "x" })));
    expect(a).not.toBe(memoryHash(ctx({ notes: "y" })));
  });
});

describe("contextHash", () => {
  it("is stable and changes when meeting/person/refine context changes", () => {
    const a = contextHash({ meeting: { purpose: "intro", time: "Thu" }, person: "likes infra" });
    expect(a).toBe(contextHash({ meeting: { purpose: "intro", time: "Thu" }, person: "likes infra" }));
    expect(a).not.toBe(contextHash({ meeting: { purpose: "intro", time: "Fri" }, person: "likes infra" }));
    expect(a).not.toBe(contextHash({ meeting: { purpose: "intro", time: "Thu" }, person: "likes infra", refine: "shorter" }));
  });
});

describe("prepExtraFromActivities", () => {
  it("extracts latest scheduled meeting context", () => {
    const extra = prepExtraFromActivities([
      { type: "reply", title: "Reply", detail: "older reply", occurredAt: "2026-06-20T00:00:00.000Z" },
      {
        type: "meeting_scheduled",
        title: "Coffee chat scheduled",
        detail: "When: 6/25/2026, 2:00 PM\nContext: wants to discuss data engineering career path\nReply: happy to chat",
        occurredAt: "2026-06-21T00:00:00.000Z",
      },
    ]);
    expect(extra.meeting?.purpose).toBe("Coffee chat scheduled");
    expect(extra.meeting?.time).toBe("6/25/2026, 2:00 PM");
    expect(extra.person).toContain("data engineering career path");
    expect(extra.person).toContain("happy to chat");
  });

  it("merges automatic context with manual overrides", () => {
    const merged = mergePrepExtra(
      { meeting: { purpose: "Coffee chat scheduled", time: "Thu" }, person: "auto context" },
      { meeting: { purpose: "Ask about AI consulting" }, person: "manual context", refine: "shorter" },
    );
    expect(merged.meeting).toEqual({ purpose: "Ask about AI consulting", time: "Thu" });
    expect(merged.person).toContain("auto context");
    expect(merged.person).toContain("manual context");
    expect(merged.refine).toBe("shorter");
  });
});
