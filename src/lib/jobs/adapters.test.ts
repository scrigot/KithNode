import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./fetch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fetch")>();
  return { ...actual, safeFetchText: vi.fn() };
});

import { detectJobSource, fetchPublicJobDetails, fetchPublicJobs } from "./adapters";
import { assertPublicHttpUrl, textOnly } from "./fetch";
import { safeFetchText } from "./fetch";

describe("job source safety and detection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("detects supported public ATS boards", () => {
    expect(detectJobSource("https://boards.greenhouse.io/acme/jobs/1")).toEqual({ provider: "greenhouse", boardToken: "acme" });
    expect(detectJobSource("https://jobs.lever.co/acme")).toEqual({ provider: "lever", boardToken: "acme" });
    expect(detectJobSource("https://jobs.ashbyhq.com/acme")).toEqual({ provider: "ashby", boardToken: "acme" });
    expect(detectJobSource("https://acme.com/careers").provider).toBe("jsonld");
  });

  it("rejects private and credential-bearing URLs before fetching", async () => {
    await expect(assertPublicHttpUrl("http://localhost:3000/admin")).rejects.toThrow(/Private-network/);
    await expect(assertPublicHttpUrl("https://user:pass@example.com/jobs")).rejects.toThrow(/Credential-bearing/);
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow(/HTTP/);
  });

  it("removes executable markup from listing descriptions", () => {
    expect(textOnly("<script>alert(1)</script><p>Build &amp; ship</p>")).toBe("Build & ship");
  });

  it("accepts Ashby jobs whose optional workplace type is explicitly null", async () => {
    vi.mocked(safeFetchText).mockResolvedValue(JSON.stringify({
      jobs: [{
        id: "job-1",
        title: "Research Engineer",
        location: "San Francisco",
        workplaceType: null,
        jobUrl: "https://jobs.ashbyhq.com/openai/job-1",
      }],
    }));

    await expect(fetchPublicJobs({
      provider: "ashby",
      boardToken: "openai",
      careerUrl: "https://jobs.ashbyhq.com/openai",
      company: "OpenAI",
    })).resolves.toEqual([
      expect.objectContaining({
        externalId: "job-1",
        workMode: "unknown",
      }),
    ]);
  });

  it("summarizes provider contract drift instead of leaking every validator issue", async () => {
    vi.mocked(safeFetchText).mockResolvedValue(JSON.stringify({
      jobs: Array.from({ length: 100 }, (_, index) => ({
        id: `job-${index}`,
        title: null,
        jobUrl: "not-a-url",
      })),
    }));

    const error = await fetchPublicJobs({
      provider: "ashby",
      boardToken: "broken",
      careerUrl: "https://jobs.ashbyhq.com/broken",
      company: "Broken Board",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Ashby returned an unsupported job format (title, jobUrl). The source was skipped.");
    expect((error as Error).message).not.toMatch(/jobs.*99/);
  });

  it("hydrates a shortlisted Greenhouse listing in a second bounded request", async () => {
    vi.mocked(safeFetchText).mockResolvedValue(JSON.stringify({
      id: 42,
      title: "Investment Banking Summer Analyst",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/42",
      location: { name: "New York" },
      content: "<p>Open to undergraduate students graduating in 2028.</p>",
      updated_at: "2026-07-20T00:00:00Z",
    }));

    const hydrated = await fetchPublicJobDetails({
      provider: "greenhouse",
      boardToken: "acme",
      careerUrl: "https://boards.greenhouse.io/acme",
      company: "Acme",
    }, {
      provider: "greenhouse",
      externalId: "42",
      company: "Acme",
      role: "Investment Banking Summer Analyst",
      location: "",
      workMode: "unknown",
      jobUrl: "https://boards.greenhouse.io/acme/jobs/42",
      applyUrl: "https://boards.greenhouse.io/acme/jobs/42",
      description: "",
      postedAt: null,
    });

    expect(hydrated.description).toContain("undergraduate students");
    expect(safeFetchText).toHaveBeenCalledWith("https://boards-api.greenhouse.io/v1/boards/acme/jobs/42");
  });
});
