import { describe, expect, it } from "vitest";
import { detectJobSource } from "./adapters";
import { assertPublicHttpUrl, textOnly } from "./fetch";

describe("job source safety and detection", () => {
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
});
