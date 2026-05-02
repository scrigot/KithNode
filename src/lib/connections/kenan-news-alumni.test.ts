import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractStoryUrls,
  extractAlumniFromHtml,
} from "./kenan-news-alumni";

describe("extractStoryUrls", () => {
  it("returns deduped story URLs and excludes the news index", () => {
    const html = `
      <a href="https://www.kenan-flagler.unc.edu/news/foo/">Foo</a>
      <a href="https://www.kenan-flagler.unc.edu/news/foo/">Foo dup</a>
      <a href="https://www.kenan-flagler.unc.edu/news/bar/">Bar</a>
      <a href="https://www.kenan-flagler.unc.edu/news/">Index, must be excluded</a>
      <a href="/news/baz/">Relative path</a>
    `;
    const urls = extractStoryUrls(html);
    expect(urls).toContain("https://www.kenan-flagler.unc.edu/news/foo/");
    expect(urls).toContain("https://www.kenan-flagler.unc.edu/news/bar/");
    expect(urls).toContain("https://www.kenan-flagler.unc.edu/news/baz/");
    expect(urls).not.toContain("https://www.kenan-flagler.unc.edu/news/");
    expect(urls.length).toBe(3);
  });
});

describe("extractAlumniFromHtml", () => {
  const url = "https://www.kenan-flagler.unc.edu/news/sample-story/";

  it("matches MBA with curly apostrophe (U+2019)", () => {
    const html = "<body><p>Lisa Yuan (MBA ’09) shared insights.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("Lisa Yuan");
    expect(seeds[0].affiliations).toBe("graduation_year:2009");
    expect(seeds[0].source).toBe("kenan_news_alumni");
    expect(seeds[0].sourceUrl).toBe(url);
  });

  it("matches PhD with curly apostrophe (U+2018)", () => {
    const html = "<body><p>Jane Smith (PhD ‘20) wrote the paper.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("Jane Smith");
    expect(seeds[0].affiliations).toBe("graduation_year:2020");
  });

  it("matches ASCII straight apostrophe", () => {
    const html = "<body><p>John Doe (BSBA '09) joined the firm.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("John Doe");
    expect(seeds[0].affiliations).toBe("graduation_year:2009");
  });

  it("matches no-apostrophe full-year format", () => {
    const html = "<body><p>Ada Lovelace (MBA 2018) presented findings.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("Ada Lovelace");
    expect(seeds[0].affiliations).toBe("graduation_year:2018");
  });

  it("matches multi-degree, captures FIRST degree's year", () => {
    const html = "<body><p>Robert Doe (BA ’89, MBA ’20) returned home.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("Robert Doe");
    expect(seeds[0].affiliations).toBe("graduation_year:1989");
  });

  it("matches three-word names", () => {
    const html = "<body><p>Mary Jane Watson (MBA ’15) leads the team.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe("Mary Jane Watson");
  });

  it("normalizes 2-digit years: '49 → 2049, '50 → 1950 (cutoff)", () => {
    const html = `
      <body>
        <p>Old Grad (MBA '50) graduated long ago.</p>
        <p>New Grad (MBA '49) graduated recently.</p>
      </body>`;
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds.find((s) => s.name === "Old Grad")?.affiliations).toBe("graduation_year:1950");
    expect(seeds.find((s) => s.name === "New Grad")?.affiliations).toBe("graduation_year:2049");
  });

  it("dedupes alumni mentioned multiple times in the same article", () => {
    const html = `
      <body>
        <p>Lisa Yuan (MBA ’09) ...</p>
        <p>Later, Lisa Yuan (MBA ’09) said ...</p>
      </body>`;
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(1);
  });

  it("does not match non-alumni capitalized phrases", () => {
    const html = "<body><p>The Kenan Foundation (founded 1948) supports research.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toHaveLength(0);
  });

  it("returns empty array when no alumni mentions exist", () => {
    const html = "<body><p>This article has no alumni mentions, only research findings.</p></body>";
    const seeds = extractAlumniFromHtml(html, url);
    expect(seeds).toEqual([]);
  });
});
