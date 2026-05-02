import { describe, it, expect } from "vitest";
import { extractProfileUrls, extractProfile } from "./kenan-directory";

// Fixture HTML representing a Kenan faculty directory page with profile links.
const DIRECTORY_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Faculty | UNC Kenan-Flagler Business School</title></head>
<body>
  <div class="faculty-list">
    <a href="/faculty/directory/christopher-bingham/">Christopher Bingham</a>
    <a href="/faculty/directory/jan-brockett/">Jan Brockett</a>
    <a href="/faculty/directory/anu-mukherjee/">Anu Mukherjee</a>
    <!-- should not match -- different path -->
    <a href="/about/leadership/dean-smith/">Dean Smith</a>
    <!-- should not match -- not faculty/directory -->
    <a href="https://www.kenan-flagler.unc.edu/programs/mba/">MBA Program</a>
    <!-- duplicate should be deduped by Set in scraper -->
    <a href="/faculty/directory/christopher-bingham/">Christopher Bingham (duplicate)</a>
  </div>
</body>
</html>
`;

// Fixture HTML for a faculty profile page (based on actual Kenan profile structure).
const PROFILE_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Christopher Bingham | UNC Kenan-Flagler Business School">
  <meta property="og:description" content="Christopher Bingham is a professor of strategy and entrepreneurship.">
  <meta name="keywords" content="strategy, entrepreneurship, organizational learning">
</head>
<body>
  <h1 class="post-title">Christopher Bingham</h1>
  <div class="job-title">Professor of Strategy and Entrepreneurship</div>
  <div class="faculty-single-blocks">
    <p>Christopher Bingham is the Richard S. Warr Distinguished Professor. His research focuses on how firms build dynamic capabilities.</p>
    <p>Contact: cbingham@kenan-flagler.unc.edu</p>
  </div>
</body>
</html>
`;

// Profile with no og:title (fallback to h1).
const PROFILE_NO_OG_HTML = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <h1 class="post-title">Jane Smith</h1>
  <div class="job-title">Lecturer of Finance</div>
  <div class="faculty-single-blocks">
    <p>Jane Smith teaches corporate finance. Email: jsmith@unc.edu</p>
  </div>
</body>
</html>
`;

describe("extractProfileUrls", () => {
  it("extracts faculty/directory URLs (caller deduplicates via Set)", () => {
    const urls = extractProfileUrls(DIRECTORY_PAGE_HTML);
    // extractProfileUrls returns raw URLs including duplicates (4 total: 2x christopher-bingham).
    // Deduplication happens in scrapeKenanFaculty via slugSet.add().
    expect(urls).toHaveLength(4);
    expect(urls.every((u) => u.includes("/faculty/directory/"))).toBe(true);
    // After dedup via Set the unique count is 3
    const unique = [...new Set(urls)];
    expect(unique).toHaveLength(3);
  });

  it("does not include non-directory links", () => {
    const urls = extractProfileUrls(DIRECTORY_PAGE_HTML);
    expect(urls.some((u) => u.includes("/about/leadership/"))).toBe(false);
    expect(urls.some((u) => u.includes("/programs/"))).toBe(false);
  });
});

describe("extractProfile", () => {
  it("strips site suffix from og:title to get name", () => {
    const prof = extractProfile(PROFILE_PAGE_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham");
    expect(prof).not.toBeNull();
    expect(prof!.name).toBe("Christopher Bingham");
  });

  it("extracts title from .job-title", () => {
    const prof = extractProfile(PROFILE_PAGE_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham");
    expect(prof!.title).toBe("Professor of Strategy and Entrepreneurship");
  });

  it("extracts email via UNC regex", () => {
    const prof = extractProfile(PROFILE_PAGE_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham");
    expect(prof!.email).toBe("cbingham@kenan-flagler.unc.edu");
  });

  it("extracts bio from .faculty-single-blocks", () => {
    const prof = extractProfile(PROFILE_PAGE_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham");
    expect(prof!.bio.length).toBeGreaterThan(10);
    expect(prof!.bio).toContain("dynamic capabilities");
  });

  it("extracts research areas from meta keywords", () => {
    const prof = extractProfile(PROFILE_PAGE_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/christopher-bingham");
    expect(prof!.researchAreas).toContain("strategy");
    expect(prof!.researchAreas).toContain("entrepreneurship");
  });

  it("falls back to h1 when og:title absent", () => {
    const prof = extractProfile(PROFILE_NO_OG_HTML, "https://www.kenan-flagler.unc.edu/faculty/directory/jane-smith");
    expect(prof!.name).toBe("Jane Smith");
    expect(prof!.email).toBe("jsmith@unc.edu");
  });

  it("returns null when no name found", () => {
    const prof = extractProfile("<html><body></body></html>", "https://example.com");
    expect(prof).toBeNull();
  });
});
