import { describe, it, expect } from "vitest";
import { buildDraftStyle, DRAFT_SIGNATURE_MAX } from "./draft-style";

describe("buildDraftStyle", () => {
  it("maps the defaults (warm / medium / casual, first-name sign-off)", () => {
    const s = buildDraftStyle({}, "Sam");
    expect(s.tonePhrase).toMatch(/warm/i);
    expect(s.wordTarget).toBe(150);
    expect(s.subjectRule).toMatch(/under 60 characters/);
    expect(s.signoffRule).toBe('Sign off with the sender\'s first name: "Sam"');
    expect(s.signature).toBe("");
  });

  it("applies each tone preset", () => {
    expect(buildDraftStyle({ draftTone: "professional" }, "Sam").tonePhrase).toMatch(/professional/i);
    expect(buildDraftStyle({ draftTone: "concise" }, "Sam").tonePhrase).toMatch(/concise/i);
  });

  it("maps length presets to word targets", () => {
    expect(buildDraftStyle({ draftLength: "short" }, "Sam").wordTarget).toBe(80);
    expect(buildDraftStyle({ draftLength: "long" }, "Sam").wordTarget).toBe(220);
  });

  it("maps the formal subject style", () => {
    expect(buildDraftStyle({ draftSubjectStyle: "formal" }, "Sam").subjectRule).toMatch(
      /under 70 characters/,
    );
  });

  it("a set signature overrides the first-name sign-off", () => {
    const s = buildDraftStyle({ draftSignature: "Best,\nSam Rigot\nUNC '29" }, "Sam");
    expect(s.signature).toBe("Best,\nSam Rigot\nUNC '29");
    expect(s.signoffRule).toContain("Best,\nSam Rigot\nUNC '29");
    expect(s.signoffRule).not.toContain("first name");
  });

  it("trims and caps the signature", () => {
    const long = "x".repeat(DRAFT_SIGNATURE_MAX + 50);
    const s = buildDraftStyle({ draftSignature: `  ${long}  ` }, "Sam");
    expect(s.signature).toHaveLength(DRAFT_SIGNATURE_MAX);
  });

  it("falls back to defaults on unknown/null values", () => {
    const s = buildDraftStyle(
      { draftTone: "spicy", draftLength: null, draftSubjectStyle: "" },
      "Sam",
    );
    expect(s.tonePhrase).toMatch(/warm/i);
    expect(s.wordTarget).toBe(150);
    expect(s.subjectRule).toMatch(/under 60 characters/);
  });

  it("defaults the sign-off name to 'Me' when sender name is blank", () => {
    expect(buildDraftStyle({}, "  ").signoffRule).toContain('"Me"');
  });
});
