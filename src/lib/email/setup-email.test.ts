import { describe, it, expect } from "vitest";
import { buildSetupEmailHtml } from "@/lib/email/setup-email";

describe("buildSetupEmailHtml", () => {
  const html = buildSetupEmailHtml("Connor Smith");

  it("lists every setup step", () => {
    for (const step of [
      "Finish your profile",
      "Set your targets",
      "Import your LinkedIn connections",
      "Run Discover",
      "Draft your first outreach",
      "Tune your draft style",
    ]) {
      expect(html).toContain(step);
    }
  });

  it("links each core action and the CTA into the app", () => {
    expect(html).toContain("/onboarding");
    expect(html).toContain("/dashboard/import");
    expect(html).toContain("/dashboard/discover");
    expect(html).toContain("/dashboard/contacts");
    expect(html).toContain("/dashboard/settings");
    expect(html).toContain("START SETUP");
  });

  it("greets the user by first name", () => {
    expect(html).toContain("Hey Connor");
  });

  it("falls back to a friendly greeting when no name is given", () => {
    expect(buildSetupEmailHtml("")).toContain("Hey there");
  });
});
