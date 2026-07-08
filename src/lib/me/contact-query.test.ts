import { describe, it, expect } from "vitest";
import { parseFilters, buildContactWhere, buildContactSearchWhere } from "./contact-query";

describe("parseFilters", () => {
  it("trims q and drops blanks; only accepts in/out for inPipeline", () => {
    expect(parseFilters({ q: "  data  ", industry: "", inPipeline: "in" })).toEqual({
      q: "data",
      industry: undefined,
      relationshipType: undefined,
      source: undefined,
      inPipeline: "in",
      actions: undefined,
    });
    expect(parseFilters({ inPipeline: "garbage" }).inPipeline).toBeUndefined();
    expect(parseFilters({ actions: "open" }).actions).toBe("open");
  });
});

describe("buildContactWhere", () => {
  const U = "me@x.com";
  it("always scopes to userId", () => {
    expect(buildContactWhere(U, {}).userId).toBe(U);
  });
  it("q searches name/firm/title/education, case-insensitive", () => {
    const w = buildContactWhere(U, { q: "UNC" });
    const or = (w.AND as object[])[0] as { OR: object[] };
    expect(or.OR).toHaveLength(4);
    expect(JSON.stringify(or.OR)).toContain("education");
    expect(JSON.stringify(or.OR)).toContain("insensitive");
  });
  it("filters industry/source/relationshipType + in/out pipeline", () => {
    const w = buildContactWhere(U, { industry: "AI/ML", source: "prod_import", relationshipType: "buyer", inPipeline: "out", actions: "open" });
    const j = JSON.stringify(w.AND);
    expect(j).toContain('"industry":"AI/ML"');
    expect(j).toContain('"source":"prod_import"');
    expect(j).toContain('"relationshipType":"buyer"');
    expect(j).toContain('"none"');
    expect(j).toContain('"actionItems"');
  });
});

describe("buildContactSearchWhere", () => {
  const U = "me@x.com";

  it("searches the same contact fields and scopes to user", () => {
    const w = buildContactSearchWhere(U, "data");
    expect(w.userId).toBe(U);
    expect(JSON.stringify(w.AND)).toContain("firmName");
    expect(JSON.stringify(w.AND)).toContain("education");
    expect(JSON.stringify(w.AND)).toContain("insensitive");
  });

  it("can exclude contacts already in a pipeline", () => {
    const w = buildContactSearchWhere(U, "sam", "pipe_123");
    const j = JSON.stringify(w.AND);
    expect(j).toContain('"none"');
    expect(j).toContain('"pipelineId":"pipe_123"');
  });
});
