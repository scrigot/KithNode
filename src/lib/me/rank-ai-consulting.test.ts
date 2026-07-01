import { describe, it, expect } from "vitest";
import { rankAiConsulting, reconnectList, introList, type RankInput } from "./rank-ai-consulting";

const mk = (p: Partial<RankInput>): RankInput => ({
  id: p.id ?? p.name ?? "x",
  name: p.name ?? "X",
  firmName: p.firmName ?? "",
  title: p.title ?? "",
  email: p.email ?? "",
  relationshipType: p.relationshipType ?? "",
  inPipeline: p.inPipeline ?? false,
  education: p.education ?? "",
  pastFirms: p.pastFirms ?? "",
  location: p.location ?? "",
});

describe("rankAiConsulting", () => {
  const buyer = mk({ name: "Buyer", title: "Head of Data", firmName: "Acme Analytics" });
  const practitioner = mk({ name: "Pract", title: "Data Scientist", firmName: "Globex" });
  const connector = mk({ name: "Conn", title: "Partner", firmName: "Sequoia" });
  const noise = mk({ name: "Noise", title: "Barista", firmName: "Cafe" });
  const ranked = rankAiConsulting([noise, connector, practitioner, buyer]);

  it("orders buyer > practitioner and surfaces reasons", () => {
    const byName = Object.fromEntries(ranked.map((r) => [r.name, r]));
    expect(byName.Buyer.score).toBeGreaterThan(byName.Pract.score);
    expect(byName.Buyer.reasons).toContain("data leader · buyer");
    expect(byName.Buyer.icpReasons).toContain("data leader · buyer");
    expect(byName.Pract.reasons).toContain("practitioner");
  });

  it("flags connectors", () => {
    const conn = ranked.find((r) => r.name === "Conn")!;
    expect(conn.connector).toBe(true);
    expect(introList(ranked).some((r) => r.name === "Conn")).toBe(true);
  });

  it("manual buyer label outweighs an unlabeled practitioner", () => {
    const labeled = mk({ name: "Tagged", title: "Analyst", relationshipType: "buyer" });
    const r = rankAiConsulting([labeled, practitioner]);
    expect(r[0].name).toBe("Tagged");
    expect(r[0].reasons).toContain("tagged buyer");
  });

  it("noise scores ~0 and drops out of the reconnect list", () => {
    const noiseRanked = ranked.find((r) => r.name === "Noise")!;
    expect(noiseRanked.score).toBe(0);
    expect(reconnectList(ranked).some((r) => r.name === "Noise")).toBe(false);
  });

  it("reconnect list prefers not-yet-tracked contacts at equal score", () => {
    const a = mk({ name: "Tracked", title: "Head of Data", inPipeline: true });
    const b = mk({ name: "Fresh", title: "Head of Data", inPipeline: false });
    const list = reconnectList(rankAiConsulting([a, b]));
    expect(list[0].name).toBe("Fresh");
  });
});

describe("warm-signal axis", () => {
  const unc = mk({ name: "UNC Grad", title: "Data Scientist", education: "University of North Carolina at Chapel Hill", location: "Raleigh, NC" });

  it("no profile → warmth 0 and score equals icp (back-compat)", () => {
    const r = rankAiConsulting([unc])[0];
    expect(r.warmthScore).toBe(0);
    expect(r.score).toBe(r.icpScore);
    expect(r.reasons).not.toContain("shared school");
  });

  it("with a profile, shared school adds warmth + a reason without changing icp", () => {
    const base = rankAiConsulting([unc])[0];
    const r = rankAiConsulting([unc], { profile: { schools: "University of North Carolina", location: "Raleigh" } })[0];
    expect(r.icpScore).toBe(base.icpScore);
    expect(r.warmthScore).toBeGreaterThan(0);
    expect(r.reasons).toContain("shared school");
    expect(r.warmthReasons).toContain("shared school");
    expect(r.icpReasons).toContain("practitioner");
    expect(r.reasons).toContain("same area");
    expect(r.score).toBe(r.icpScore + r.warmthScore);
  });
});
