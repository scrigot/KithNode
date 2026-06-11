import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPdlProfile, shouldAdoptPdlName } from "./pdl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePdlResponse(
  opts: {
    status?: number;
    likelihood?: number;
    education?: object[];
    experience?: unknown;
    full_name?: string | null;
    location_locality?: string | null;
    location_region?: string | null;
    location_name?: string | null;
    skills?: unknown;
  } = {},
) {
  return {
    status: opts.status ?? 200,
    likelihood: opts.likelihood ?? 8,
    data: {
      full_name: opts.full_name ?? null,
      education: opts.education ?? [],
      experience: opts.experience ?? null,
      location_locality: opts.location_locality ?? null,
      location_region: opts.location_region ?? null,
      location_name: opts.location_name ?? null,
      skills: opts.skills ?? null,
    },
  };
}

function mockFetch(body: unknown, status = 200) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  return response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubEnv("PDL_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchPdlProfile", () => {
  // ── null on missing inputs / config ──────────────────────────────────────

  it("returns null when PDL_API_KEY is unset", async () => {
    vi.stubEnv("PDL_API_KEY", "");
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
  });

  it("returns null when linkedInUrl is empty string", async () => {
    const result = await fetchPdlProfile("");
    expect(result).toBeNull();
  });

  // ── null on 404 (no match — expected, no console.error) ──────────────────

  it("returns null silently on 404", async () => {
    mockFetch({}, 404);
    const spy = vi.spyOn(console, "error");
    const result = await fetchPdlProfile("https://linkedin.com/in/nobody");
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  // ── null + console.error on other non-200 ────────────────────────────────

  it("returns null and logs on non-200 non-404 status", async () => {
    mockFetch({}, 500);
    const spy = vi.spyOn(console, "error");
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "fetchPdlProfile: non-200",
      expect.objectContaining({ status: 500 }),
    );
  });

  // ── null on network/fetch throw ───────────────────────────────────────────

  it("returns null and logs on fetch throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));
    const spy = vi.spyOn(console, "error");
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "fetchPdlProfile: request failed",
      expect.objectContaining({ err: "Network failure" }),
    );
  });

  // ── null on malformed body ────────────────────────────────────────────────

  it("returns null when response body has no data field", async () => {
    mockFetch({ status: 200, likelihood: 8 });
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
  });

  it("returns null when education array is absent", async () => {
    mockFetch({ status: 200, likelihood: 8, data: { location_locality: "Chapel Hill" } });
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
  });

  it("returns null when education array is empty", async () => {
    mockFetch(makePdlResponse({ education: [] }));
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result).toBeNull();
  });

  // ── min_likelihood and required params in request URL ────────────────────

  it("includes min_likelihood=6 and required=education in the request URL", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc chapel hill", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    await fetchPdlProfile("https://linkedin.com/in/test");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url: string = fetchCall[0];
    expect(url).toContain("min_likelihood=6");
    expect(url).toContain("required=education");
  });

  it("passes X-Api-Key header", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    await fetchPdlProfile("https://linkedin.com/in/test");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = fetchCall[1];
    expect(options.headers["X-Api-Key"]).toBe("test-key");
  });

  // ── collegiate-over-high-school preference ────────────────────────────────

  it("prefers college entry over high school entry by school.type", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "east chapel hill high school", type: "secondary school" }, end_date: "2019" },
          { school: { name: "unc chapel hill", type: "post-secondary institution" }, end_date: "2023" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("unc chapel hill");
  });

  it("prefers college entry over high school entry by name pattern when type is missing", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "Jordan High School" }, end_date: "2019" },
          { school: { name: "Duke University" }, end_date: "2023" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("Duke University");
  });

  it("falls back to all entries when all are pre-college", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "Jordan High School", type: "secondary school" }, end_date: "2021" },
          { school: { name: "East Chapel Hill High School", type: "secondary school" }, end_date: "2019" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    // Should return the most recent — Jordan High School (2021)
    expect(result?.education).toBe("Jordan High School");
    expect(result?.graduationYear).toBe(2021);
  });

  // ── high-school extraction (alongside the collegiate education) ────────────

  it("extracts education=college AND highSchool=HS when both are present", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "East Chapel Hill High School", type: "secondary school" }, end_date: "2019" },
          { school: { name: "UNC Chapel Hill", type: "post-secondary institution" }, end_date: "2023" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("UNC Chapel Hill");
    expect(result?.highSchool).toBe("East Chapel Hill High School");
  });

  it("picks the most recent pre-college entry for highSchool", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "Old Middle School", type: "middle school" }, end_date: "2015" },
          { school: { name: "Jordan High School", type: "secondary school" }, end_date: "2019" },
          { school: { name: "Duke University", type: "post-secondary institution" }, end_date: "2023" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("Duke University");
    expect(result?.highSchool).toBe("Jordan High School");
  });

  it("returns highSchool='' when the profile is college-only", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "UNC Chapel Hill", type: "post-secondary institution" }, end_date: "2023" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("UNC Chapel Hill");
    expect(result?.highSchool).toBe("");
  });

  // ── most-recent end-year wins ─────────────────────────────────────────────

  it("picks the entry with the most recent end_date year among colleges", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "undergrad university", type: "post-secondary institution" }, end_date: "2023" },
          { school: { name: "grad school", type: "post-secondary institution" }, end_date: "2025" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("grad school");
    expect(result?.graduationYear).toBe(2025);
  });

  // ── grad year 0 when end_date null ────────────────────────────────────────

  it("returns graduationYear 0 when end_date is null (still enrolled)", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc chapel hill", type: "post-secondary institution" }, end_date: null },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.graduationYear).toBe(0);
    expect(result?.education).toBe("unc chapel hill");
  });

  it("sorts null end_date last (prefers known end year)", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "current school", type: "post-secondary institution" }, end_date: null },
          { school: { name: "older school", type: "post-secondary institution" }, end_date: "2022" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.education).toBe("older school");
    expect(result?.graduationYear).toBe(2022);
  });

  // ── "City, ST" building from locality + region ───────────────────────────

  it("builds City, ST from locality + region using STATE_ABBR", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        location_locality: "chapel hill",
        location_region: "north carolina",
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.location).toBe("Chapel Hill, NC");
  });

  it("title-cases city when PDL returns lowercase", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "nyu", type: "post-secondary institution" }, end_date: "2026" },
        ],
        location_locality: "new york",
        location_region: "new york",
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.location).toBe("New York, NY");
  });

  it("returns empty string location when locality is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        location_locality: null,
        location_region: "north carolina",
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.location).toBe("");
  });

  it("returns empty location when free tier redacts fields to boolean true", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        // PDL free tier sends boolean true ("present but hidden") instead of
        // the string value. Must not become the literal text "True, true".
        location_locality: true as unknown as string,
        location_region: true as unknown as string,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.location).toBe("");
    expect(result?.education).toBe("unc");
  });

  it("returns city only when region is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        location_locality: "chapel hill",
        location_region: null,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.location).toBe("Chapel Hill");
  });

  // ── happy path ────────────────────────────────────────────────────────────

  it("returns full result for a well-formed response", async () => {
    mockFetch(
      makePdlResponse({
        full_name: "aryan aladar",
        education: [
          {
            school: { name: "university of north carolina", type: "post-secondary institution" },
            end_date: "2027",
            majors: ["economics"],
            minors: ["computer science"],
          },
        ],
        location_locality: "chapel hill",
        location_region: "north carolina",
        skills: ["financial modeling", "python", "excel"],
        experience: [
          { company: { name: "goldman sachs" }, end_date: "2023" },
          { company: { name: "morgan stanley" }, end_date: null },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/samtest");
    expect(result).toEqual({
      education: "university of north carolina",
      graduationYear: 2027,
      location: "Chapel Hill, NC",
      fullName: "Aryan Aladar",
      major: "Economics",
      minor: "Computer Science",
      highSchool: "",
      skills: ["Financial Modeling", "Python", "Excel"],
      pastFirms: ["Goldman Sachs"],
    });
  });

  // ── fullName mapping ──────────────────────────────────────────────────────

  it("title-cases lowercase full_name from PDL", async () => {
    mockFetch(
      makePdlResponse({
        full_name: "aryan aladar",
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/aladar");
    expect(result?.fullName).toBe("Aryan Aladar");
  });

  it("returns empty string fullName when full_name is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.fullName).toBe("");
  });

  it("returns empty string fullName when full_name is null", async () => {
    mockFetch(
      makePdlResponse({
        full_name: null,
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.fullName).toBe("");
  });
});

// ── shouldAdoptPdlName helper ─────────────────────────────────────────────────
// Extracted rule: adopt PDL name when current name has no space (single token
// = slug-derived). Multi-word names and empty-string edge cases tested here
// without needing the full enrich route.

describe("shouldAdoptPdlName", () => {
  it("adopts when current name is single token (slug-derived)", () => {
    expect(shouldAdoptPdlName("Aladar", "Aryan Aladar")).toBe(true);
  });

  it("does NOT adopt when current name has a space (CSV-accurate)", () => {
    expect(shouldAdoptPdlName("Jacob Goldstein", "Jacob Goldstein")).toBe(false);
  });

  it("adopts when current name is empty string", () => {
    expect(shouldAdoptPdlName("", "Aryan Aladar")).toBe(true);
  });

  it("does NOT adopt when PDL fullName is empty", () => {
    expect(shouldAdoptPdlName("Aladar", "")).toBe(false);
  });

  it("does NOT adopt when both names are empty", () => {
    expect(shouldAdoptPdlName("", "")).toBe(false);
  });
});

// ── major / minor / skills mapping ────────────────────────────────────────────

describe("fetchPdlProfile major/minor/skills", () => {
  it("maps the first two majors/minors off the picked education entry, title-cased and comma-joined", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          {
            school: { name: "unc", type: "post-secondary institution" },
            end_date: "2027",
            majors: ["business administration", "political science", "statistics"],
            minors: ["computer science", "spanish"],
          },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.major).toBe("Business Administration, Political Science");
    expect(result?.minor).toBe("Computer Science, Spanish");
  });

  it("maps a single major/minor without a trailing comma", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          {
            school: { name: "unc", type: "post-secondary institution" },
            end_date: "2027",
            majors: ["economics"],
            minors: ["computer science"],
          },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.major).toBe("Economics");
    expect(result?.minor).toBe("Computer Science");
  });

  it("returns empty string major when majors is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.major).toBe("");
    expect(result?.minor).toBe("");
  });

  it("takes the first 12 profile skills, title-cased", async () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => `skill ${i + 1}`);
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        skills: fifteen,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.skills).toHaveLength(12);
    expect(result?.skills[0]).toBe("Skill 1");
    expect(result?.skills[11]).toBe("Skill 12");
  });

  it("returns [] skills when the free tier redacts to boolean true", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        skills: true,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.skills).toEqual([]);
  });

  it("returns [] skills when skills is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.skills).toEqual([]);
  });
});

// ── pastFirms mapping (past-vs-current split / redaction / dedupe) ─────────────

describe("fetchPdlProfile pastFirms", () => {
  it("returns only PAST employers (end_date set), excluding the current role (end_date null)", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        experience: [
          { company: { name: "morgan stanley" }, end_date: null }, // current → excluded
          { company: { name: "goldman sachs" }, end_date: "2022" }, // past → included
          { company: { name: "evercore" }, end_date: "2021-06" }, // past → included
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toEqual(["Goldman Sachs", "Evercore"]);
  });

  it("returns [] pastFirms when the free tier redacts experience to boolean true", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        experience: true,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toEqual([]);
  });

  it("returns [] pastFirms when experience is absent", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toEqual([]);
  });

  it("dedupes case-insensitively and title-cases, keeping first occurrence", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        experience: [
          { company: { name: "goldman sachs" }, end_date: "2022" },
          { company: { name: "GOLDMAN SACHS" }, end_date: "2020" }, // dupe → dropped
          { company: { name: "bain & company" }, end_date: "2019" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toEqual(["Goldman Sachs", "Bain & Company"]);
  });

  it("caps pastFirms at the first 5 past employers", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({
      company: { name: `firm ${i + 1}` },
      end_date: "2020",
    }));
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        experience: seven,
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toHaveLength(5);
    expect(result?.pastFirms[0]).toBe("Firm 1");
    expect(result?.pastFirms[4]).toBe("Firm 5");
  });

  it("skips experience entries with no company name", async () => {
    mockFetch(
      makePdlResponse({
        education: [
          { school: { name: "unc", type: "post-secondary institution" }, end_date: "2027" },
        ],
        experience: [
          { company: { name: "" }, end_date: "2022" },
          { company: null, end_date: "2021" },
          { company: { name: "citadel" }, end_date: "2020" },
        ],
      }),
    );
    const result = await fetchPdlProfile("https://linkedin.com/in/test");
    expect(result?.pastFirms).toEqual(["Citadel"]);
  });
});
