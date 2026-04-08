import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchQueries,
  ddgSearch,
  decodeDdgHref,
  extractDomain,
  findCompanies,
  isUsefulResult,
} from "./entity-finder";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractDomain", () => {
  it("strips www and lowercases", () => {
    expect(extractDomain("https://www.Example.COM/path")).toBe("example.com");
    expect(extractDomain("https://api.foo.io")).toBe("api.foo.io");
  });
  it("returns empty string for garbage input", () => {
    expect(extractDomain("not a url")).toBe("");
    expect(extractDomain("")).toBe("");
  });
});

describe("decodeDdgHref", () => {
  it("decodes the DDG redirect wrapper", () => {
    const wrapped = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fanthropic.com%2Fcareers&rut=abc";
    expect(decodeDdgHref(wrapped)).toBe("https://anthropic.com/careers");
  });
  it("passes through real URLs unchanged", () => {
    expect(decodeDdgHref("https://anthropic.com")).toBe("https://anthropic.com");
  });
  it("handles empty input", () => {
    expect(decodeDdgHref("")).toBe("");
  });
});

describe("isUsefulResult", () => {
  it("rejects blocklisted social/news/job-board domains", () => {
    expect(isUsefulResult("https://linkedin.com/in/foo", "Founder of X")).toBe(false);
    expect(isUsefulResult("https://www.indeed.com/jobs", "Hiring at Y")).toBe(false);
    expect(isUsefulResult("https://techcrunch.com/article", "Z raises $50M")).toBe(false);
    expect(isUsefulResult("https://crunchbase.com/foo", "Foo Profile")).toBe(false);
  });
  it("rejects subdomains of blocklisted domains", () => {
    expect(isUsefulResult("https://news.linkedin.com", "x")).toBe(false);
  });
  it("rejects listicle / explainer titles", () => {
    expect(isUsefulResult("https://anthropic.com", "Top 10 AI Startups in 2026")).toBe(false);
    expect(isUsefulResult("https://anthropic.com", "Best AI tools")).toBe(false);
    expect(isUsefulResult("https://anthropic.com", "How to use Claude")).toBe(false);
    expect(isUsefulResult("https://anthropic.com", "OpenAI vs Anthropic")).toBe(false);
  });
  it("accepts plausible company homepages", () => {
    expect(isUsefulResult("https://anthropic.com", "Anthropic — Claude")).toBe(true);
    expect(isUsefulResult("https://www.evercore.com", "Evercore Inc.")).toBe(true);
  });
});

describe("buildSearchQueries", () => {
  it("crosses industries × locations", () => {
    expect(buildSearchQueries(["fintech", "AI"], ["Charlotte NC", "Raleigh NC"])).toEqual([
      '"fintech" "Charlotte NC" -jobs -careers',
      '"fintech" "Raleigh NC" -jobs -careers',
      '"AI" "Charlotte NC" -jobs -careers',
      '"AI" "Raleigh NC" -jobs -careers',
    ]);
  });
  it("falls back to industry-only when no locations", () => {
    expect(buildSearchQueries(["fintech"], [])).toEqual(['"fintech" companies -jobs -careers']);
  });
  it("returns empty for empty industries", () => {
    expect(buildSearchQueries([], ["NYC"])).toEqual([]);
  });
});

describe("ddgSearch", () => {
  function mockHtmlOnce(html: string) {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );
  }

  it("parses cheerio result rows and filters noise", async () => {
    mockHtmlOnce(`
      <html><body>
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fanthropic.com">Anthropic - Claude</a>
          <a class="result__snippet">AI safety company building Claude</a>
        </div>
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Flinkedin.com%2Fcompany%2Fanthropic">Anthropic | LinkedIn</a>
          <a class="result__snippet">Anthropic on LinkedIn</a>
        </div>
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com">Top 10 AI Startups</a>
          <a class="result__snippet">listicle</a>
        </div>
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fevercore.com">Evercore - Investment Banking</a>
          <a class="result__snippet">Independent investment bank</a>
        </div>
      </body></html>
    `);

    const results = await ddgSearch("ai safety companies");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ domain: "anthropic.com", name: "Anthropic" });
    expect(results[1]).toMatchObject({ domain: "evercore.com", name: "Evercore" });
  });

  it("dedupes by domain within a single search", async () => {
    mockHtmlOnce(`
      <html><body>
        <div class="result"><a class="result__a" href="https://anthropic.com">Anthropic</a></div>
        <div class="result"><a class="result__a" href="https://www.anthropic.com/careers">Anthropic Careers</a></div>
      </body></html>
    `);
    const results = await ddgSearch("anthropic");
    expect(results).toHaveLength(1);
  });

  it("returns empty array on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    const results = await ddgSearch("anything");
    expect(results).toEqual([]);
  });

  it("returns empty array on non-200 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("blocked", { status: 429 }));
    const results = await ddgSearch("anything");
    expect(results).toEqual([]);
  });
});

describe("findCompanies", () => {
  it("dedupes across queries by domain", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(
      new Response(
        `<div class="result"><a class="result__a" href="https://anthropic.com">Anthropic</a></div>`,
        { status: 200 },
      ),
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(
        `<div class="result"><a class="result__a" href="https://anthropic.com">Anthropic Again</a></div>
         <div class="result"><a class="result__a" href="https://evercore.com">Evercore</a></div>`,
        { status: 200 },
      ),
    );

    const out = await findCompanies(["q1", "q2"], { throttleMs: 0 });
    expect(out.map((c) => c.domain)).toEqual(["anthropic.com", "evercore.com"]);
  });
});
