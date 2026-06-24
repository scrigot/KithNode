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
