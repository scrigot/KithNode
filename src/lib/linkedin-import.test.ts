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
      highSchool: "",
      hometown: "",
      greekOrg: "Chi Phi",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      clubs: [],
      skills: [],
      pastFirms: [],
      major: "",
      minor: "",
      concentration: "",
      degrees: "",
      recruitingDate: null,
      weeklyGoalTarget: 3,
      educations: [],
      experiences: [],
      clubMemberships: [],
    };
    const affs = detectAffiliations(baseMeta({ tags: ["chi phi"] }), prefs);
    expect(affs.some((a) => a.name === "Same Greek Org")).toBe(true);
  });

  it("Same School fires when a tag matches a university alias", () => {
    const prefs = {
      university: "University of North Carolina at Chapel Hill",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      clubs: [],
      skills: [],
      pastFirms: [],
      major: "",
      minor: "",
      concentration: "",
      degrees: "",
      recruitingDate: null,
      weeklyGoalTarget: 3,
      educations: [],
      experiences: [],
      clubMemberships: [],
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
      highSchool: "",
      hometown: "",
      greekOrg: "Chi Phi",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      clubs: [],
      skills: [],
      pastFirms: [],
      major: "",
      minor: "",
      concentration: "",
      degrees: "",
      recruitingDate: null,
      weeklyGoalTarget: 3,
      educations: [],
      experiences: [],
      clubMemberships: [],
    };
    const affsWithout = detectAffiliations(baseMeta({ education: "Yale University" }), prefs);
    const affsWith = detectAffiliations(baseMeta({ education: "Yale University", tags: [] }), prefs);
    expect(affsWithout).toEqual(affsWith);
  });
});

describe("detectAffiliations: Same High School + editable fields", () => {
  const prefsWith = (overrides: Record<string, unknown> = {}) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
    ...overrides,
  });

  it("Same High School fires on partial overlap (one string includes the other)", () => {
    const affs = detectAffiliations(
      baseMeta({ highSchool: "East Chapel Hill High School" }),
      prefsWith({ highSchool: "East Chapel Hill" }),
    );
    expect(affs.some((a) => a.name === "Same High School" && a.boost === 10)).toBe(true);
  });

  it("does NOT fire Same High School when neither string contains the other", () => {
    const affs = detectAffiliations(
      baseMeta({ highSchool: "Myers Park High School" }),
      prefsWith({ highSchool: "East Chapel Hill High School" }),
    );
    expect(affs.some((a) => a.name === "Same High School")).toBe(false);
  });

  it("contact highSchool does NOT false-fire Same School via the UNC alias, and is not Pre-College", () => {
    const affs = detectAffiliations(
      baseMeta({
        highSchool: "Chapel Hill High School",
        experience: "Goldman Sachs",
        title: "Analyst",
      }),
      prefsWith({ university: "University of North Carolina at Chapel Hill" }),
    );
    expect(affs.some((a) => a.name === "Same School")).toBe(false);
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
  });

  it("clubs text fires Same Greek Org when greekOrg matches", () => {
    const affs = detectAffiliations(
      baseMeta({ clubs: "chi phi intramurals" }),
      prefsWith({ greekOrg: "Chi Phi" }),
    );
    expect(affs.some((a) => a.name === "Same Greek Org")).toBe(true);
  });

  it("clubs/passions never feed the Pre-College detector", () => {
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        clubs: "high school robotics club",
        passions: "middle school mentoring",
        title: "Analyst",
        experience: "Goldman Sachs",
      }),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
  });
});

describe("detectAffiliations: Hometown Match vs Target Location", () => {
  const prefsWith = (overrides: Record<string, unknown> = {}) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
    ...overrides,
  });

  it("fires Hometown Match on the contact's hometown field", () => {
    const affs = detectAffiliations(
      baseMeta({ hometown: "Charlotte, NC", location: "New York, NY" }),
      prefsWith({ hometown: "Charlotte, NC" }),
    );
    expect(affs.some((a) => a.name === "Hometown Match" && a.boost === 8)).toBe(true);
  });

  it("falls back to location for Hometown Match when contact hometown is empty", () => {
    const affs = detectAffiliations(
      baseMeta({ hometown: "", location: "Charlotte, NC" }),
      prefsWith({ hometown: "Charlotte, NC" }),
    );
    expect(affs.some((a) => a.name === "Hometown Match")).toBe(true);
  });

  it("does NOT fall back to location when the contact hometown is present but differs", () => {
    const affs = detectAffiliations(
      baseMeta({ hometown: "Boston, MA", location: "Charlotte, NC" }),
      prefsWith({ hometown: "Charlotte, NC" }),
    );
    expect(affs.some((a) => a.name === "Hometown Match")).toBe(false);
  });

  it("contact hometown does NOT light Target Location (that reads location only)", () => {
    const affs = detectAffiliations(
      baseMeta({ hometown: "Charlotte, NC", location: "" }),
      prefsWith({ targetLocations: ["Charlotte"] }),
    );
    expect(affs.some((a) => a.name === "Target Location")).toBe(false);
  });
});

describe("detectAffiliations: Same Club", () => {
  const clubPrefs = (clubs: string[]) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs,
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires when contact.clubs contains one of prefs.clubs", () => {
    const affs = detectAffiliations(
      baseMeta({ clubs: "Investment Banking Club, Finance Society" }),
      clubPrefs(["Investment Banking Club"]),
    );
    expect(affs.some((a) => a.name === "Same Club" && a.boost === 8)).toBe(true);
  });

  it("fires via a manual tag", () => {
    const affs = detectAffiliations(
      baseMeta({ tags: ["Fintech Club"] }),
      clubPrefs(["Fintech Club"]),
    );
    expect(affs.some((a) => a.name === "Same Club" && a.boost === 8)).toBe(true);
  });

  it("does NOT fire when prefs.clubs is empty", () => {
    const affs = detectAffiliations(
      baseMeta({ clubs: "Investment Banking Club" }),
      clubPrefs([]),
    );
    expect(affs.some((a) => a.name === "Same Club")).toBe(false);
  });

  it("club text does NOT produce Pre-College", () => {
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        clubs: "high school robotics club investment banking club",
        title: "Analyst",
        experience: "Goldman Sachs",
      }),
      clubPrefs(["Investment Banking Club"]),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
    expect(affs.some((a) => a.name === "Same Club")).toBe(true);
  });
});

describe("detectAffiliations: Skill Match", () => {
  const skillPrefs = (
    overrides: { skills?: string[]; targetIndustries?: string[] } = {},
  ) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: overrides.targetIndustries ?? [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: overrides.skills ?? [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires when contact.skills overlaps prefs.skills", () => {
    const affs = detectAffiliations(
      baseMeta({ skills: "Financial Modeling, Python, Excel" }),
      skillPrefs({ skills: ["Python"] }),
    );
    expect(affs.some((a) => a.name === "Skill Match" && a.boost === 8)).toBe(true);
  });

  it("fires when a tag overlaps prefs.targetIndustries", () => {
    const affs = detectAffiliations(
      baseMeta({ tags: ["Investment Banking"] }),
      skillPrefs({ targetIndustries: ["Investment Banking"] }),
    );
    expect(affs.some((a) => a.name === "Skill Match" && a.boost === 8)).toBe(true);
  });

  it("fires when major overlaps prefs.targetIndustries", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Computer Science" }),
      skillPrefs({ targetIndustries: ["Computer Science"] }),
    );
    expect(affs.some((a) => a.name === "Skill Match")).toBe(true);
  });

  it("does NOT fire when both prefs.skills and prefs.targetIndustries are empty", () => {
    const affs = detectAffiliations(
      baseMeta({ skills: "Python", major: "Economics" }),
      skillPrefs(),
    );
    expect(affs.some((a) => a.name === "Skill Match")).toBe(false);
  });

  it("does NOT fire when nothing overlaps", () => {
    const affs = detectAffiliations(
      baseMeta({ skills: "Woodworking", major: "History" }),
      skillPrefs({ skills: ["Python"], targetIndustries: ["Consulting"] }),
    );
    expect(affs.some((a) => a.name === "Skill Match")).toBe(false);
  });

  it("fires at most once even when skills AND industries both overlap", () => {
    const affs = detectAffiliations(
      baseMeta({ skills: "Python", major: "Consulting" }),
      skillPrefs({ skills: ["Python"], targetIndustries: ["Consulting"] }),
    );
    expect(affs.filter((a) => a.name === "Skill Match")).toHaveLength(1);
  });

  it("skill text does NOT produce Pre-College", () => {
    // A skill literally containing "high school" must not light up the K-12
    // detector — Skill Match builds only from skills/tags/major/minor.
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        skills: "high school tutoring, python",
        title: "Analyst",
        experience: "Goldman Sachs",
      }),
      skillPrefs({ skills: ["Python"] }),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
    expect(affs.some((a) => a.name === "Skill Match")).toBe(true);
  });
});

describe("detectAffiliations: Same Major", () => {
  const majorPrefs = (
    overrides: { major?: string; minor?: string; concentration?: string } = {},
  ) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    major: overrides.major ?? "",
    minor: overrides.minor ?? "",
    concentration: overrides.concentration ?? "",
    degrees: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires when user major exactly matches contact major", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Economics" }),
      majorPrefs({ major: "Economics" }),
    );
    expect(affs.some((a) => a.name === "Same Major" && a.boost === 8)).toBe(true);
  });

  it("fires when user major is contained in contact major (direction A)", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Business Economics" }),
      majorPrefs({ major: "Economics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(true);
  });

  it("fires when contact major is contained in user major (direction B)", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Economics" }),
      majorPrefs({ major: "Business Economics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(true);
  });

  it("fires on a minor↔minor overlap", () => {
    const affs = detectAffiliations(
      baseMeta({ minor: "Computer Science" }),
      majorPrefs({ minor: "Computer Science" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(true);
  });

  it("fires when user minor overlaps contact major (cross major/minor)", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Statistics" }),
      majorPrefs({ minor: "Statistics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(true);
  });

  it("handles comma-joined lists on both sides", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "History, Statistics" }),
      majorPrefs({ major: "Economics, Statistics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(true);
  });

  it("fires at most once even when multiple entries overlap", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Economics", minor: "Statistics" }),
      majorPrefs({ major: "Economics", minor: "Statistics" }),
    );
    expect(affs.filter((a) => a.name === "Same Major")).toHaveLength(1);
  });

  it("does NOT fire when both prefs.major and prefs.minor are empty", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Economics", minor: "Statistics" }),
      majorPrefs(),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(false);
  });

  it("does NOT fire when nothing overlaps", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "History" }),
      majorPrefs({ major: "Economics", minor: "Statistics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(false);
  });

  it("ignores single-character entries (no spurious containment)", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "X" }),
      majorPrefs({ major: "Economics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(false);
  });

  it("builds the contact side from major/minor only — not skills/education", () => {
    // A contact whose SKILLS or EDUCATION text contains the user's major must
    // NOT fire Same Major; only the contact's own major/minor fields count.
    const affs = detectAffiliations(
      baseMeta({
        skills: "Economics research, Python",
        education: "Economics coursework, UNC",
        major: "History",
      }),
      majorPrefs({ major: "Economics" }),
    );
    expect(affs.some((a) => a.name === "Same Major")).toBe(false);
  });

  it("does NOT fire Same Major when prefs object is omitted entirely", () => {
    const affs = detectAffiliations(baseMeta({ major: "Economics" }));
    expect(affs.some((a) => a.name === "Same Major")).toBe(false);
  });

  it("fires once when user concentration matches the contact's concentration", () => {
    const affs = detectAffiliations(
      baseMeta({ concentration: "Finance" }),
      majorPrefs({ concentration: "Finance" }),
    );
    expect(affs.filter((a) => a.name === "Same Major")).toHaveLength(1);
  });

  it("fires once when user concentration matches the contact's MAJOR (cross-field)", () => {
    const affs = detectAffiliations(
      baseMeta({ major: "Finance" }),
      majorPrefs({ concentration: "Finance" }),
    );
    expect(affs.filter((a) => a.name === "Same Major")).toHaveLength(1);
  });
});

describe("detectAffiliations: Same Program", () => {
  const degreePrefs = (degrees: string) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    major: "",
    minor: "",
    concentration: "",
    degrees,
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires +6 when a grad degree (MBA) overlaps on both sides", () => {
    const affs = detectAffiliations(
      baseMeta({ degrees: "MBA" }),
      degreePrefs("MBA"),
    );
    expect(affs.some((a) => a.name === "Same Program" && a.boost === 6)).toBe(true);
  });

  it("does NOT fire on a shared undergrad degree (BS-BS)", () => {
    const affs = detectAffiliations(
      baseMeta({ degrees: "BS" }),
      degreePrefs("BS"),
    );
    expect(affs.some((a) => a.name === "Same Program")).toBe(false);
  });

  it("does NOT fire when MBA is present on only one side", () => {
    const userOnly = detectAffiliations(
      baseMeta({ degrees: "BS" }),
      degreePrefs("MBA"),
    );
    expect(userOnly.some((a) => a.name === "Same Program")).toBe(false);

    const contactOnly = detectAffiliations(
      baseMeta({ degrees: "MBA" }),
      degreePrefs("BS"),
    );
    expect(contactOnly.some((a) => a.name === "Same Program")).toBe(false);
  });

  it("matches case-insensitively (mba vs MBA)", () => {
    const affs = detectAffiliations(
      baseMeta({ degrees: "mba" }),
      degreePrefs("MBA"),
    );
    expect(affs.some((a) => a.name === "Same Program")).toBe(true);
  });

  it("fires at most once even when multiple grad degrees overlap", () => {
    const affs = detectAffiliations(
      baseMeta({ degrees: "MBA, MS" }),
      degreePrefs("MBA, MS"),
    );
    expect(affs.filter((a) => a.name === "Same Program")).toHaveLength(1);
  });

  it("does NOT fire when prefs.degrees is empty", () => {
    const affs = detectAffiliations(
      baseMeta({ degrees: "MBA" }),
      degreePrefs(""),
    );
    expect(affs.some((a) => a.name === "Same Program")).toBe(false);
  });

  it("does NOT crash on an old prefs object lacking degrees (treated as no-match)", () => {
    const legacyPrefs = {
      university: "",
      highSchool: "",
      hometown: "",
      greekOrg: "",
      major: "",
      minor: "",
      targetIndustries: [],
      targetFirms: [],
      targetLocations: [],
      clubs: [],
      skills: [],
      pastFirms: [],
      recruitingDate: null,
      weeklyGoalTarget: 3,
    } as unknown as Parameters<typeof detectAffiliations>[1];
    const affs = detectAffiliations(baseMeta({ degrees: "MBA" }), legacyPrefs);
    expect(affs.some((a) => a.name === "Same Program")).toBe(false);
  });
});

describe("detectAffiliations: Shared Employer", () => {
  const firmPrefs = (pastFirms: string[] = []) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms,
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires when a user past firm matches the contact's CURRENT firm (experience)", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Goldman Sachs" }),
      firmPrefs(["Goldman Sachs"]),
    );
    expect(affs.some((a) => a.name === "Shared Employer" && a.boost === 10)).toBe(true);
  });

  it("fires when a user past firm matches the contact's PAST firm (meta.pastFirms)", () => {
    const affs = detectAffiliations(
      baseMeta({ pastFirms: "Evercore, Bain & Company" }),
      firmPrefs(["Evercore"]),
    );
    expect(affs.some((a) => a.name === "Shared Employer" && a.boost === 10)).toBe(true);
  });

  it("fires on either-direction containment (user 'Goldman' ⊂ contact 'Goldman Sachs')", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Goldman Sachs" }),
      firmPrefs(["Goldman"]),
    );
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(true);
  });

  it("does NOT fire when prefs.pastFirms is empty", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Goldman Sachs", pastFirms: "Evercore" }),
      firmPrefs([]),
    );
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(false);
  });

  it("does NOT fire when prefs object is omitted entirely", () => {
    const affs = detectAffiliations(baseMeta({ experience: "Goldman Sachs" }));
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(false);
  });

  it("does NOT fire when nothing overlaps", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Citadel", pastFirms: "Jane Street" }),
      firmPrefs(["Goldman Sachs"]),
    );
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(false);
  });

  it("fires at most once even when a user firm matches both current AND past", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Goldman Sachs", pastFirms: "Goldman Sachs Asset Management" }),
      firmPrefs(["Goldman Sachs"]),
    );
    expect(affs.filter((a) => a.name === "Shared Employer")).toHaveLength(1);
  });

  it("ignores single-character user firms (no spurious containment)", () => {
    const affs = detectAffiliations(
      baseMeta({ experience: "Goldman Sachs" }),
      firmPrefs(["G"]),
    );
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(false);
  });

  it("contact pastFirms does NOT leak into the Pre-College detector", () => {
    // A contact whose pastFirms text contains "high school" must not light up
    // the K-12 detector — Shared Employer builds only from pastFirms + the
    // current-firm text, never the education-based Pre-College check.
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        experience: "Goldman Sachs",
        title: "Analyst",
        pastFirms: "High School Tutoring LLC",
      }),
      firmPrefs(["Goldman Sachs"]),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
    expect(affs.some((a) => a.name === "Shared Employer")).toBe(true);
  });
});

describe("detectAffiliations: contact greekOrg field", () => {
  const prefsWith = (overrides: Record<string, unknown> = {}) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
    ...overrides,
  });

  it("fires Same Greek Org exactly once when contact.greekOrg matches prefs.greekOrg", () => {
    const affs = detectAffiliations(
      baseMeta({ greekOrg: "Chi Phi" }),
      prefsWith({ greekOrg: "Chi Phi" }),
    );
    expect(affs.filter((a) => a.name === "Same Greek Org")).toHaveLength(1);
  });

  it("contact.greekOrg does NOT leak into the Same School matcher or Pre-College", () => {
    // greekOrg is the ONLY contact text and it is a university alias ("Sigma
    // Chi" shares no token, so use "Phi Beta Kappa"→"phi beta" against a UNC
    // alias would not match; instead prove a high-school-named org can't fire
    // Pre-College and a school-aliasing org can't fire Same School). Here the
    // contact has no education, so Same School must stay silent even though the
    // user's university is set and greekOrg contains "Chapel" — which is a UNC
    // alias token — confirming greekOrg never reaches schoolBlob.
    const affs = detectAffiliations(
      baseMeta({ greekOrg: "Chapel Hill High School Greek Council" }),
      prefsWith({
        university: "University of North Carolina at Chapel Hill",
        greekOrg: "Chi Phi",
      }),
    );
    expect(affs.some((a) => a.name === "Same School")).toBe(false);
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
  });
});

describe("detectAffiliations: CS Top School gated on AI/tech targeting", () => {
  const prefsTargeting = (targetIndustries: string[]) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries,
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    pastFirms: [],
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
  });

  it("fires for an AI/ML-targeting user when education is a CS-elite school", () => {
    const affs = detectAffiliations(
      baseMeta({ education: "Carnegie Mellon University" }),
      prefsTargeting(["AI/ML"]),
    );
    expect(affs.some((a) => a.name === "CS Top School")).toBe(true);
  });

  it("does NOT fire for a finance-targeting user (prestige is not warmth)", () => {
    const affs = detectAffiliations(
      baseMeta({ education: "Carnegie Mellon University" }),
      prefsTargeting(["Investment Banking", "Private Equity"]),
    );
    expect(affs.some((a) => a.name === "CS Top School")).toBe(false);
  });

  it("does NOT fire without prefs at all", () => {
    const affs = detectAffiliations(baseMeta({ education: "Stanford University" }));
    expect(affs.some((a) => a.name === "CS Top School")).toBe(false);
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

describe("detectAffiliations: manual personType override", () => {
  const prefsWith = (overrides: Record<string, unknown> = {}) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
    ...overrides,
  });

  it("'student' forces the (Incoming) halving on a full-time-titled Goldman analyst", () => {
    // Title "Analyst" has no incoming/student marker, so without the override
    // this would read as a full Bulge Bracket (+18). The override forces the
    // student path: halved boost + "(Incoming)" label + no seniority.
    const affs = detectAffiliations(
      baseMeta({
        experience: "Goldman Sachs",
        title: "Analyst",
        personType: "student",
      }),
    );
    const tier = affs.find((a) => a.name === "Bulge Bracket (Incoming)");
    expect(tier).toBeDefined();
    expect(tier?.boost).toBe(9); // round(18 / 2)
    expect(affs.some((a) => a.name === "Bulge Bracket" && !a.name.includes("Incoming"))).toBe(false);
    expect(affs.some((a) => a.name === "Analyst")).toBe(false);
  });

  it("'alum' with an 'Incoming Summer Analyst' title still gets FULL firm boost (no Incoming label)", () => {
    // Title literally says "Incoming Summer Analyst" — auto would halve + label.
    // The alum override forces full-time: full +18 Bulge Bracket, no "(Incoming)".
    const affs = detectAffiliations(
      baseMeta({
        experience: "Goldman Sachs",
        title: "Incoming Summer Analyst",
        personType: "alum",
      }),
    );
    const tier = affs.find((a) => a.name === "Bulge Bracket");
    expect(tier).toBeDefined();
    expect(tier?.boost).toBe(18);
    expect(affs.some((a) => a.name.includes("(Incoming)"))).toBe(false);
  });

  it("'alum' forces full credit even when education text looks pre-college", () => {
    // "Greenwich High School" trips the pre-college detector under auto. The
    // alum override forces isPreCollege/isCurrentStudent off → full firm boost,
    // no Pre-College chip.
    const affs = detectAffiliations(
      baseMeta({
        education: "Greenwich High School",
        experience: "Goldman Sachs",
        title: "Analyst",
        personType: "alum",
      }),
    );
    expect(affs.some((a) => a.name === "Pre-College")).toBe(false);
    expect(affs.some((a) => a.name === "Bulge Bracket" && a.boost === 18)).toBe(true);
  });

  it("'professor' at 'Bain' gets NO MBB tier, gets a Professor chip", () => {
    const affs = detectAffiliations(
      baseMeta({
        experience: "Bain & Company executive education",
        title: "Senior Lecturer",
        personType: "professor",
      }),
    );
    expect(affs.some((a) => a.name === "MBB")).toBe(false);
    expect(affs.some((a) => a.name === "Professor" && a.boost === 8)).toBe(true);
    // seniority is suppressed too — no Lecturer chip from the title
    expect(affs.some((a) => a.name === "Lecturer")).toBe(false);
  });

  it("'professor' with prefs.university + matching teaches-at gets 'Teaches at Your School' but NOT Same School (education empty)", () => {
    const affs = detectAffiliations(
      baseMeta({
        experience: "Bain & Company executive education",
        title: "Professor",
        personType: "professor",
        university: "UNC Kenan-Flagler",
      }),
      prefsWith({ university: "University of North Carolina at Chapel Hill" }),
    );
    expect(affs.some((a) => a.name === "Teaches at Your School" && a.boost === 12)).toBe(true);
    expect(affs.some((a) => a.name === "Same School")).toBe(false);
    expect(affs.some((a) => a.name === "MBB")).toBe(false);
  });

  it("'professor' fires BOTH Same School and Teaches at Your School when their EDUCATION matches (spec: teaches-at OR education)", () => {
    // Studied at UNC, teaches at a random college. Per spec the Teaches chip
    // fires on a teaches-at OR education match, so it fires via education here;
    // and Same School is never suppressed off education, so it fires too.
    const affs = detectAffiliations(
      baseMeta({
        education: "University of North Carolina at Chapel Hill",
        experience: "Some Random College",
        title: "Professor",
        personType: "professor",
        university: "Some Random College",
      }),
      prefsWith({ university: "University of North Carolina at Chapel Hill" }),
    );
    expect(affs.some((a) => a.name === "Same School" && a.boost === 15)).toBe(true);
    expect(affs.some((a) => a.name === "Teaches at Your School" && a.boost === 12)).toBe(true);
  });

  it("'professor' teaches-at match (education empty) fires Teaches at Your School but NOT Same School", () => {
    // The discriminating case for the suppression: the ONLY school signal is
    // where-they-teach (meta.university). Teaches chip fires; Same School must
    // stay silent because where-they-teach is not where-they-studied.
    const affs = detectAffiliations(
      baseMeta({
        education: "",
        experience: "UNC Kenan-Flagler Business School",
        title: "Professor",
        personType: "professor",
        university: "UNC Kenan-Flagler",
      }),
      prefsWith({ university: "University of North Carolina at Chapel Hill" }),
    );
    expect(affs.some((a) => a.name === "Teaches at Your School" && a.boost === 12)).toBe(true);
    expect(affs.some((a) => a.name === "Same School")).toBe(false);
  });

  it("'' (auto) is unchanged vs omitting personType entirely (regression)", () => {
    const meta = {
      education: "Phillips Exeter Academy",
      experience: "Goldman Sachs",
      title: "Incoming Summer Analyst",
    };
    const auto = detectAffiliations(baseMeta(meta), prefsWith());
    const explicitEmpty = detectAffiliations(
      baseMeta({ ...meta, personType: "" }),
      prefsWith(),
    );
    expect(explicitEmpty).toEqual(auto);
  });
});

describe("detectAffiliations: Club Leadership (universal)", () => {
  it("fires on clubs containing a president role", () => {
    const affs = detectAffiliations(
      baseMeta({ clubs: "President — Investment Banking Club" }),
    );
    expect(affs.some((a) => a.name === "Club Leadership" && a.boost === 6)).toBe(true);
  });

  it("fires when tags contain 'captain'", () => {
    const affs = detectAffiliations(
      baseMeta({ tags: ["captain", "soccer team"] }),
    );
    expect(affs.some((a) => a.name === "Club Leadership" && a.boost === 6)).toBe(true);
  });

  it("is SILENT when title='Vice President' + firmName='Goldman Sachs' with clubs empty", () => {
    // Finance VP is a job rank, not club leadership. clubs + tags are both empty.
    const affs = detectAffiliations(
      baseMeta({ title: "Vice President", experience: "Goldman Sachs", clubs: "" }),
    );
    expect(affs.some((a) => a.name === "Club Leadership")).toBe(false);
  });

  it("is SILENT on an empty contact", () => {
    const affs = detectAffiliations(baseMeta());
    expect(affs.some((a) => a.name === "Club Leadership")).toBe(false);
  });

  it("fires at most once even when clubs and tags both match", () => {
    const affs = detectAffiliations(
      baseMeta({ clubs: "President — IB Club", tags: ["treasurer"] }),
    );
    expect(affs.filter((a) => a.name === "Club Leadership")).toHaveLength(1);
  });
});

describe("detectAffiliations: Club Leadership fires via clubRoles", () => {
  it("fires when meta.clubRoles='President' and meta.clubs is empty", () => {
    const affs = detectAffiliations(baseMeta({ clubRoles: "President", clubs: "" }));
    expect(affs.some((a) => a.name === "Club Leadership" && a.boost === 6)).toBe(true);
  });

  it("still fires via legacy meta.clubs='President — IB Club' when clubRoles is empty", () => {
    const affs = detectAffiliations(baseMeta({ clubRoles: "", clubs: "President — IB Club" }));
    expect(affs.some((a) => a.name === "Club Leadership" && a.boost === 6)).toBe(true);
  });

  it("is SILENT when both clubRoles and clubs hold no leadership words", () => {
    const affs = detectAffiliations(
      baseMeta({ clubRoles: "Member", clubs: "Finance Club, Chess Club" }),
    );
    expect(affs.some((a) => a.name === "Club Leadership")).toBe(false);
  });
});

describe("detectAffiliations: Target Industry fires on track/role (taxonomy)", () => {
  const prefsWith = (overrides: Record<string, unknown> = {}) => ({
    university: "",
    highSchool: "",
    hometown: "",
    greekOrg: "",
    targetIndustries: [],
    targetFirms: [],
    targetLocations: [],
    clubs: [],
    skills: [],
    pastFirms: [],
    major: "",
    minor: "",
    concentration: "",
    degrees: "",
    recruitingDate: null,
    weeklyGoalTarget: 3,
    educations: [],
    experiences: [],
    clubMemberships: [],
    ...overrides,
  });

  it("fires when a prefs role matches the contact's classified ROLE, legacy industry empty", () => {
    const affs = detectAffiliations(
      baseMeta({ industry: "", track: "AI", role: "AI Engineer" }),
      prefsWith({ targetIndustries: ["AI Engineer"] }),
    );
    expect(affs.some((a) => a.name === "Target Industry" && a.boost === 10)).toBe(true);
  });

  it("fires when a prefs entry matches the contact's TRACK (role unset)", () => {
    const affs = detectAffiliations(
      baseMeta({ industry: "", track: "AI", role: "" }),
      prefsWith({ targetIndustries: ["AI"] }),
    );
    expect(affs.some((a) => a.name === "Target Industry")).toBe(true);
  });

  it("does NOT fire when neither industry, track, nor role matches", () => {
    const affs = detectAffiliations(
      baseMeta({ industry: "", track: "Finance", role: "Investment Banking" }),
      prefsWith({ targetIndustries: ["AI Engineer"] }),
    );
    expect(affs.some((a) => a.name === "Target Industry")).toBe(false);
  });

  it("still fires off the legacy industry column when track/role are empty", () => {
    const affs = detectAffiliations(
      baseMeta({ industry: "Private Equity", track: "", role: "" }),
      prefsWith({ targetIndustries: ["Private Equity"] }),
    );
    expect(affs.some((a) => a.name === "Target Industry")).toBe(true);
  });
});
