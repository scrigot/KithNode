import { describe, it, expect } from "vitest";
import { composeWhyNow } from "./why-now";

describe("composeWhyNow", () => {
  it("composes two fragments in priority order with a title+firm anchor", () => {
    expect(
      composeWhyNow({
        affiliations: ["Same School", "Same Greek Org"],
        title: "VP",
        firm: "Goldman Sachs",
        tier: "warm",
      }),
    ).toBe(
      "Shares your Greek org and graduated from your school, VP at Goldman Sachs. Two genuine openers for one intro.",
    );
  });

  it("Target Firm names the firm in the fragment and suppresses the anchor", () => {
    expect(
      composeWhyNow({
        affiliations: ["Target Firm"],
        title: "ML Engineer",
        firm: "Anthropic",
        tier: "hot",
      }),
    ).toBe(
      "Works at Anthropic, one of your target firms. Reach out while the signal is hot.",
    );
  });

  it("single fragment with firm-only anchor uses the single closer", () => {
    expect(
      composeWhyNow({
        affiliations: ["Club Leadership"],
        firm: "Deloitte",
        tier: "monitor",
      }),
    ).toBe("Held a club leadership role, at Deloitte. A real reason to reach out.");
  });

  it("caps at the two strongest matches", () => {
    const line = composeWhyNow({
      affiliations: ["Hometown Match", "Same Club", "Shared Employer"],
      tier: "warm",
    });
    expect(line).toBe(
      "Has worked where you have and shares one of your clubs. Two genuine openers for one intro.",
    );
  });

  it("ignores unknown affiliation names and falls back by tier", () => {
    expect(
      composeWhyNow({ affiliations: ["Pre-College", "CS Top School"], tier: "cold" }),
    ).toBe("Solid warmth match. A clean, low-stakes first touch.");
    expect(composeWhyNow({ affiliations: [], tier: "hot" })).toBe(
      "High warmth score with fresh signals. Reach out while it lasts.",
    );
  });
});
