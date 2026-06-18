import { describe, it, expect } from "vitest";
import { applyOverlay, PERSONAL_OVERRIDE_FIELDS } from "./contact-overrides";

const canonical = {
  id: "c1",
  name: "Greyson Harris",
  title: "Analyst",
  firmName: "Goldman Sachs",
  // owner-private / personal columns:
  notes: "owner's private note",
  hometown: "Charlotte, NC",
  highSchool: "West Forsyth HS",
  passions: "sailing",
  isFriend: true,
  speakFrequency: "weekly",
  lastSpokenAt: "2026-06-01T12:00:00.000Z",
};

describe("applyOverlay", () => {
  it("falls through to canonical for profile fields the overlay omits", () => {
    const v = applyOverlay(canonical, { title: "Associate" });
    expect(v.title).toBe("Associate"); // overridden
    expect(v.name).toBe("Greyson Harris"); // canonical
    expect(v.firmName).toBe("Goldman Sachs"); // canonical
  });

  it("never leaks the canonical owner's personal fields", () => {
    const v = applyOverlay(canonical, {}); // browse: empty overlay
    for (const f of PERSONAL_OVERRIDE_FIELDS) {
      expect(v[f]).not.toBe((canonical as Record<string, unknown>)[f]);
    }
    expect(v.notes).toBe("");
    expect(v.hometown).toBe("");
    expect(v.isFriend).toBe(false);
    expect(v.lastSpokenAt).toBeNull();
  });

  it("applies the viewer's OWN personal overlay values on top of the blanked base", () => {
    const v = applyOverlay(canonical, {
      notes: "my note",
      isFriend: true,
      hometown: "Raleigh, NC",
    });
    expect(v.notes).toBe("my note");
    expect(v.isFriend).toBe(true);
    expect(v.hometown).toBe("Raleigh, NC");
    // a personal field NOT in the overlay stays blanked (no canonical leak)
    expect(v.passions).toBe("");
  });

  it("does not mutate the canonical input", () => {
    const before = { ...canonical };
    applyOverlay(canonical, { title: "VP", notes: "x" });
    expect(canonical).toEqual(before);
  });

  it("treats null/undefined overrides as an empty overlay", () => {
    expect(applyOverlay(canonical, null).notes).toBe("");
    expect(applyOverlay(canonical, undefined).title).toBe("Analyst");
  });
});
