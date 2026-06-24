import { describe, it, expect } from "vitest";
import { parsePrepBrief, fallbackBrief, memoryHash, type PrepContext } from "./coffee-prep";

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
