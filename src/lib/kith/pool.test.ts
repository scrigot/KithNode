import { describe, it, expect } from "vitest";
import { dedupeKey, normalizeLinkedIn, richness, dedupePooled, type PoolContact } from "@/lib/kith/pool";

function contact(over: Partial<PoolContact>): PoolContact {
  return {
    id: "c", name: "", firmName: "", title: "", linkedInUrl: "", education: "",
    location: "", warmthScore: 0, tier: "cold", affiliations: "", graduationYear: null,
    degrees: "", concentration: "", hometown: "", enrichedAt: null,
    importedByUserId: "owner@x.com", sharedInNodes: true, ownerId: "owner@x.com", ownerName: "Owner",
    ...over,
  };
}

describe("normalizeLinkedIn", () => {
  it("strips protocol, www, query, trailing slash, and lowercases", () => {
    expect(normalizeLinkedIn("https://www.linkedin.com/in/Foo/?x=1")).toBe("linkedin.com/in/foo");
    expect(normalizeLinkedIn("")).toBe("");
  });
});

describe("dedupeKey", () => {
  it("prefers linkedIn, falls back to name|firm", () => {
    expect(dedupeKey(contact({ linkedInUrl: "https://linkedin.com/in/a" }))).toBe("li:linkedin.com/in/a");
    expect(dedupeKey(contact({ name: "Jane Doe", firmName: "Goldman" }))).toBe("nf:jane doe|goldman");
  });
});

describe("dedupePooled", () => {
  it("collapses duplicates by linkedIn, richest record wins", () => {
    const sparse = contact({ id: "1", name: "Jane", linkedInUrl: "https://linkedin.com/in/jane" });
    const rich = contact({
      id: "2", name: "Jane", firmName: "Goldman", title: "Analyst", education: "UNC",
      location: "NYC", degrees: "BS", linkedInUrl: "https://www.linkedin.com/in/jane/",
    });
    const out = dedupePooled([sparse, rich]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("2"); // richer wins
  });

  it("keeps distinct people separate", () => {
    const a = contact({ id: "1", linkedInUrl: "https://linkedin.com/in/a" });
    const b = contact({ id: "2", linkedInUrl: "https://linkedin.com/in/b" });
    expect(dedupePooled([a, b])).toHaveLength(2);
  });

  it("breaks richness ties by most recent enrichedAt", () => {
    const older = contact({ id: "1", name: "Jane", firmName: "GS", linkedInUrl: "li/x", enrichedAt: "2026-01-01T00:00:00Z" });
    const newer = contact({ id: "2", name: "Jane", firmName: "GS", linkedInUrl: "li/x", enrichedAt: "2026-06-01T00:00:00Z" });
    const out = dedupePooled([older, newer]);
    expect(out[0].id).toBe("2");
  });

  it("richness counts non-empty signal fields", () => {
    expect(richness(contact({}))).toBe(0);
    expect(richness(contact({ name: "A", firmName: "B" }))).toBe(2);
  });
});
