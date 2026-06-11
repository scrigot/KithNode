import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isValidLinkedInUrl,
  scrapeLinkedInMeta,
  detectAffiliations,
  type ContactMeta,
} from "./linkedin-import";

const baseMeta = (overrides: Partial<ContactMeta> = {}): ContactMeta => ({
  name: "Test Person",
  education: "",
  location: "",
  experience: "",
  title: "",
  ...overrides,
});

describe("isValidLinkedInUrl", () => {
  it("rejects SSRF payload with linkedin URL in query param", () => {
    expect(
      isValidLinkedInUrl("https://attacker.test/?u=https://linkedin.com/in/bar")
    ).toBe(false);
  });

  it("rejects subdomain spoof", () => {
    expect(isValidLinkedInUrl("https://linkedin.com.attacker.test/in/bar")).toBe(
      false
    );
  });

  it("rejects http (non-https) scheme", () => {
    expect(isValidLinkedInUrl("http://www.linkedin.com/in/jane-doe")).toBe(false);
  });

  it("accepts a clean profile URL", () => {
    expect(isValidLinkedInUrl("https://www.linkedin.com/in/jane-doe")).toBe(true);
  });
});

describe("scrapeLinkedInMeta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws on a SSRF payload and never fetches", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      scrapeLinkedInMeta("https://attacker.test/?u=https://linkedin.com/in/bar")
    ).rejects.toThrow("Invalid LinkedIn URL");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches the canonical URL with redirect disabled for a clean URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html></html>", { status: 200 })
    );

    const meta = await scrapeLinkedInMeta("https://www.linkedin.com/in/jane-doe");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe("https://www.linkedin.com/in/jane-doe");
    expect((init as RequestInit).redirect).toBe("error");
    expect(meta.name).toBe("Jane Doe");
  });
});

describe("detectAffiliations: manual tags", () => {
  it("Same Greek Org fires when greekOrg matches a manual tag", () => {
    const prefs = {
      university: "",
      hometown: "",
      greekOrg: "Chi Phi",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      recruitingDate: null,
      weeklyGoalTarget: 3,
    };
    const affs = detectAffiliations(baseMeta({ tags: ["chi phi"] }), prefs);
    expect(affs.some((a) => a.name === "Same Greek Org")).toBe(true);
  });

  it("Same School fires when a tag matches a university alias", () => {
    const prefs = {
      university: "University of North Carolina at Chapel Hill",
      hometown: "",
      greekOrg: "",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      recruitingDate: null,
      weeklyGoalTarget: 3,
    };
    // "kenan flagler" is a registered alias for UNC
    const affs = detectAffiliations(baseMeta({ tags: ["Kenan Flagler"] }), prefs);
    expect(affs.some((a) => a.name === "Same School")).toBe(true);
  });

  it("a 'high school friend' tag does NOT flag the contact as Pre-College", () => {
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        experience: "Goldman Sachs",
        title: "Analyst",
        tags: ["high school friend"],
      }),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
    expect(affs.some((a) => a.name.includes("(Incoming)"))).toBe(false);
  });

  it("no tags = unchanged behavior (regression)", () => {
    const prefs = {
      university: "Duke University",
      hometown: "",
      greekOrg: "Chi Phi",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      recruitingDate: null,
      weeklyGoalTarget: 3,
    };
    const affsWithout = detectAffiliations(baseMeta({ education: "Yale University" }), prefs);
    const affsWith = detectAffiliations(baseMeta({ education: "Yale University", tags: [] }), prefs);
    expect(affsWithout).toEqual(affsWith);
  });
});

describe("detectAffiliations seniority: student-org vs firm officer", () => {
  it("does NOT credit a club VP with professional seniority", () => {
    const affs = detectAffiliations(baseMeta({ title: "VP of Finance Club" }));
    expect(affs.some((a) => a.name === "VP")).toBe(false);
    expect(affs.some((a) => a.boost > 0)).toBe(false);
  });

  it("does NOT credit a club president with professional seniority", () => {
    const affs = detectAffiliations(
      baseMeta({ title: "President, Investment Club" }),
    );
    expect(affs.some((a) => a.name === "VP")).toBe(false);
    expect(affs.some((a) => a.boost > 0)).toBe(false);
  });

  it("does NOT credit a fraternity treasurer with seniority", () => {
    const affs = detectAffiliations(
      baseMeta({ title: "Treasurer of Sigma Chi Fraternity" }),
    );
    expect(affs.some((a) => a.boost > 0)).toBe(false);
  });

  it("still credits a firm VP with professional seniority", () => {
    const affs = detectAffiliations(
      baseMeta({ title: "Vice President", experience: "Goldman Sachs" }),
    );
    const vp = affs.find((a) => a.name === "VP");
    expect(vp).toBeDefined();
    expect(vp?.boost).toBe(7);
  });

  it("still credits a bare VP title (no club marker) with seniority", () => {
    const affs = detectAffiliations(baseMeta({ title: "VP, Investment Banking" }));
    expect(affs.some((a) => a.name === "VP" && a.boost === 7)).toBe(true);
  });
});
