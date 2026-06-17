import { describe, it, expect } from "vitest";
import {
  MAX_MUTUALS,
  slugFromLinkedInUrl,
  normalizeMutualName,
  mutualKey,
  parseCapturedMutuals,
  buildContactLookup,
  resolveMutualContactId,
  buildMutualEdges,
  contactMatchKeys,
  edgesToResolvedMutuals,
} from "./mutuals";

describe("slugFromLinkedInUrl", () => {
  it("extracts and lowercases the /in/ token", () => {
    expect(slugFromLinkedInUrl("https://www.linkedin.com/in/Khalil-Rahman/")).toBe(
      "khalil-rahman",
    );
    expect(slugFromLinkedInUrl("http://linkedin.com/in/alan-saj?foo=1")).toBe("alan-saj");
  });
  it("returns '' for non-profile or junk input", () => {
    expect(slugFromLinkedInUrl("https://linkedin.com/company/ey")).toBe("");
    expect(slugFromLinkedInUrl("")).toBe("");
    // @ts-expect-error guarding runtime non-strings
    expect(slugFromLinkedInUrl(null)).toBe("");
  });
});

describe("normalizeMutualName / mutualKey", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeMutualName("  Khalil   Rahman ")).toBe("khalil rahman");
  });
  it("prefers slug over name for the key", () => {
    expect(mutualKey("Khalil Rahman", "khalil-r")).toBe("khalil-r");
    expect(mutualKey("Khalil Rahman")).toBe("khalil rahman");
    expect(mutualKey("Khalil Rahman", "  ")).toBe("khalil rahman");
  });
});

describe("parseCapturedMutuals", () => {
  it("accepts objects and bare strings, drops empties", () => {
    const out = parseCapturedMutuals([
      { name: "Khalil Rahman" },
      "Maria Lopez",
      { name: "  " },
      "",
      42,
    ]);
    expect(out).toEqual([{ name: "Khalil Rahman" }, { name: "Maria Lopez" }]);
  });
  it("reduces a full URL in slug to the /in/ token and lowercases it", () => {
    const out = parseCapturedMutuals([
      { name: "Alan Saj", slug: "https://linkedin.com/in/Alan-Saj" },
    ]);
    expect(out).toEqual([{ name: "Alan Saj", slug: "alan-saj" }]);
  });
  it("dedupes by slug key then name key", () => {
    expect(
      parseCapturedMutuals([
        { name: "Khalil R", slug: "k1" },
        { name: "Different Label", slug: "k1" },
      ]),
    ).toHaveLength(1);
    expect(parseCapturedMutuals([{ name: "Maria Lopez" }, "maria   lopez"])).toHaveLength(1);
  });
  it("caps at MAX_MUTUALS and tolerates non-arrays", () => {
    const many = Array.from({ length: MAX_MUTUALS + 10 }, (_, i) => ({ name: `P${i}` }));
    expect(parseCapturedMutuals(many)).toHaveLength(MAX_MUTUALS);
    expect(parseCapturedMutuals(null)).toEqual([]);
    expect(parseCapturedMutuals("nope")).toEqual([]);
  });
});

describe("buildContactLookup + resolveMutualContactId", () => {
  const contacts = [
    { id: "c1", name: "Khalil Rahman", linkedInUrl: "https://linkedin.com/in/khalil-rahman" },
    { id: "c2", name: "Maria Lopez", linkedInUrl: "" },
  ];
  const lookup = buildContactLookup(contacts);

  it("resolves by slug, then by name", () => {
    expect(resolveMutualContactId({ name: "whatever", slug: "khalil-rahman" }, lookup)).toBe("c1");
    expect(resolveMutualContactId({ name: "Maria   Lopez" }, lookup)).toBe("c2");
  });
  it("returns null when no match, and never resolves to self", () => {
    expect(resolveMutualContactId({ name: "Nobody Here" }, lookup)).toBeNull();
    expect(
      resolveMutualContactId({ name: "Khalil Rahman", slug: "khalil-rahman" }, lookup, "c1"),
    ).toBeNull();
  });
});

describe("buildMutualEdges", () => {
  it("builds rows, resolving in-network mutuals and skipping self", () => {
    const lookup = buildContactLookup([
      { id: "c1", name: "Khalil Rahman", linkedInUrl: "https://linkedin.com/in/khalil-rahman" },
    ]);
    const rows = buildMutualEdges(
      "sam@kithnode.ai",
      "target",
      parseCapturedMutuals([{ name: "Khalil Rahman", slug: "khalil-rahman" }, "Stranger Q"]),
      lookup,
    );
    expect(rows).toEqual([
      {
        ownerUserId: "sam@kithnode.ai",
        contactId: "target",
        mutualName: "Khalil Rahman",
        mutualSlug: "khalil-rahman",
        mutualKey: "khalil-rahman",
        mutualContactId: "c1",
        source: "linkedin_extension",
      },
      {
        ownerUserId: "sam@kithnode.ai",
        contactId: "target",
        mutualName: "Stranger Q",
        mutualSlug: "",
        mutualKey: "stranger q",
        mutualContactId: null,
        source: "linkedin_extension",
      },
    ]);
  });
});

describe("contactMatchKeys", () => {
  it("returns the slug key and the name key", () => {
    expect(contactMatchKeys("Khalil Rahman", "https://linkedin.com/in/khalil-rahman")).toEqual([
      "khalil-rahman",
      "khalil rahman",
    ]);
    expect(contactMatchKeys("Maria Lopez", "")).toEqual(["maria lopez"]);
  });
});

describe("edgesToResolvedMutuals", () => {
  it("maps stored edges to the display shape", () => {
    expect(
      edgesToResolvedMutuals([
        { mutualName: "Khalil Rahman", mutualSlug: "khalil-rahman", mutualContactId: "c1" },
        { mutualName: "Stranger Q", mutualSlug: null, mutualContactId: null },
      ]),
    ).toEqual([
      { name: "Khalil Rahman", slug: "khalil-rahman", contactId: "c1" },
      { name: "Stranger Q", slug: "", contactId: null },
    ]);
  });
});
