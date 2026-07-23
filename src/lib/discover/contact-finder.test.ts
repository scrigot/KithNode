import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractPeopleFromHtml,
  findContacts,
  rankByRole,
  searchLinkedInContacts,
  type ContactCandidate,
} from "./contact-finder";

afterEach(() => {
  vi.restoreAllMocks();
});

const TEAM_PAGE_HTML = `
<html><body>
  <section>
    <div class="team-member">
      <h3>Jane Smith</h3>
      <p>Founder and CEO</p>
      <a href="https://linkedin.com/in/janesmith">LinkedIn</a>
    </div>
    <div class="member-card">
      <h4>John Q Public</h4>
      <p>Managing Director, North America</p>
    </div>
    <div class="card">
      <h3>VP Marketing</h3>
      <p>Not a real person</p>
    </div>
    <div class="card">
      <h3>Eric PoirierChief</h3>
      <p>Junk concatenation</p>
    </div>
    <div class="leadership">
      <h2>Maggie Anne Miller</h2>
      <span>Partner — Investments</span>
    </div>
  </section>
  <footer>
    <a href="https://linkedin.com/in/extra-person">Robert Anderson</a>
  </footer>
</body></html>
`;

describe("extractPeopleFromHtml", () => {
  it("pulls valid names from team cards and rejects junk", () => {
    const out = extractPeopleFromHtml(
      TEAM_PAGE_HTML,
      "Acme Capital",
      "acme.com",
      "https://acme.com/team",
    );
    const names = out.map((p) => p.name);
    expect(names).toContain("Jane Smith");
    expect(names).toContain("John Q Public");
    expect(names).toContain("Maggie Anne Miller");
    expect(names).toContain("Robert Anderson");
    expect(names).not.toContain("VP Marketing");
    expect(names).not.toContain("Eric PoirierChief");
  });

  it("attaches the source URL for identity anchoring", () => {
    const out = extractPeopleFromHtml(TEAM_PAGE_HTML, "Acme", "acme.com", "https://acme.com/team");
    for (const p of out) expect(p.sourceUrl).toBe("https://acme.com/team");
  });

  it("captures inline LinkedIn URLs from the same card", () => {
    const out = extractPeopleFromHtml(TEAM_PAGE_HTML, "Acme", "acme.com", "https://acme.com/team");
    const jane = out.find((p) => p.name === "Jane Smith");
    expect(jane?.linkedinUrl).toBe("https://linkedin.com/in/janesmith");
  });

  it("dedupes by lowercase name", () => {
    const html = `
      <div class="member"><h3>Jane Smith</h3><p>CEO</p></div>
      <div class="member"><h3>Jane Smith</h3><p>Founder</p></div>
    `;
    const out = extractPeopleFromHtml(html, "Acme", "acme.com", "https://x.com");
    expect(out).toHaveLength(1);
  });
});

describe("rankByRole", () => {
  const sample: ContactCandidate[] = [
    { name: "A B", title: "Engineer", company: "x", companyDomain: "x.com", linkedinUrl: "", source: "team_page", sourceUrl: "" },
    { name: "C D", title: "Analyst", company: "x", companyDomain: "x.com", linkedinUrl: "", source: "team_page", sourceUrl: "" },
    { name: "E F", title: "Marketing Coordinator", company: "x", companyDomain: "x.com", linkedinUrl: "", source: "team_page", sourceUrl: "" },
    { name: "G H", title: "Managing Director", company: "x", companyDomain: "x.com", linkedinUrl: "", source: "team_page", sourceUrl: "" },
  ];
  it("floats target-role candidates to the top", () => {
    const out = rankByRole(sample);
    expect(out[0].title).toBe("Analyst");
    expect(out[1].title).toBe("Managing Director");
  });
});

describe("searchLinkedInContacts", () => {
  it("is disabled and never makes an automated LinkedIn discovery request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(searchLinkedInContacts("Acme Capital", "acme.com")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("findContacts", () => {
  it("walks team paths, falls through to LinkedIn dork on light hits, and dedupes globally", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // First company: /team returns 404, /about/team returns the dense team HTML.
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 404 })); // /team
    fetchSpy.mockResolvedValueOnce(new Response(TEAM_PAGE_HTML, { status: 200 })); // /about/team

    const out = await findContacts(
      [{ name: "Acme Capital", domain: "acme.com", website: "https://acme.com" }],
      { throttleMs: 0, maxPerCompany: 5, skipLinkedInFallback: true },
    );

    const names = out.map((c) => c.name);
    expect(names).toContain("Jane Smith");
    expect(names).toContain("John Q Public");
    expect(names).toContain("Maggie Anne Miller");
  });
});
