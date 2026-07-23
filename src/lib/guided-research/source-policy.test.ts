import { describe, expect, it } from "vitest";
import {
  buildLinkedInPeopleSearch,
  isApprovedResearchSource,
  normalizeLinkedInProfileUrl,
} from "./source-policy";

describe("guided research source policy", () => {
  it("normalizes only LinkedIn profile URLs", () => {
    expect(normalizeLinkedInProfileUrl("https://www.linkedin.com/in/Jane-Doe/?trk=abc")).toBe(
      "https://www.linkedin.com/in/jane-doe",
    );
    expect(normalizeLinkedInProfileUrl("https://linkedin.com/company/acme")).toBeNull();
    expect(normalizeLinkedInProfileUrl("https://attacker.test/in/jane")).toBeNull();
  });

  it("builds a user-opened people search without fetching it", () => {
    const url = new globalThis.URL(
      buildLinkedInPeopleSearch({
        company: "Deloitte",
        role: "Strategy analyst",
        location: "New York",
        school: "UNC",
      }),
    );
    expect(url.hostname).toBe("www.linkedin.com");
    expect(url.pathname).toBe("/search/results/people/");
    expect(url.searchParams.get("keywords")).toBe("Strategy analyst Deloitte UNC New York");
  });

  it("accepts source-neutral HTTPS evidence and rejects unsafe schemes", () => {
    expect(isApprovedResearchSource("https://example.com/team/jane")).toBe(true);
    expect(isApprovedResearchSource("javascript:alert(1)")).toBe(false);
    expect(isApprovedResearchSource("http://example.com/jane")).toBe(false);
    expect(isApprovedResearchSource("https://user:pass@example.com/jane")).toBe(false);
  });
});
