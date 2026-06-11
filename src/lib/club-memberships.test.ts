import { describe, it, expect } from "vitest";
import {
  parseClubMemberships,
  clubsFlatFromMemberships,
  rolesFromMemberships,
  membershipsFromFlat,
  MAX_CLUBS,
} from "./club-memberships";

describe("parseClubMemberships", () => {
  it("returns [] on empty/garbage/non-array", () => {
    expect(parseClubMemberships("")).toEqual([]);
    expect(parseClubMemberships(null)).toEqual([]);
    expect(parseClubMemberships("nope")).toEqual([]);
    expect(parseClubMemberships('{"club":"X"}')).toEqual([]);
  });

  it("drops rows with no club name and caps at MAX_CLUBS", () => {
    expect(
      parseClubMemberships(JSON.stringify([{ club: "", role: "President" }])),
    ).toEqual([]);
    const many = Array.from({ length: 10 }, (_, i) => ({ club: `Club ${i}`, role: "" }));
    expect(parseClubMemberships(JSON.stringify(many))).toHaveLength(MAX_CLUBS);
  });
});

describe("derivations", () => {
  const rows = [
    { club: "Investment Banking Club", role: "President" },
    { club: "Finance Society", role: "" },
  ];

  it("clubsFlatFromMemberships emits names only, deduped", () => {
    expect(clubsFlatFromMemberships(rows)).toBe("Investment Banking Club, Finance Society");
    expect(
      clubsFlatFromMemberships([
        { club: "Chess", role: "VP" },
        { club: "chess", role: "Member" },
      ]),
    ).toBe("Chess");
  });

  it("rolesFromMemberships emits roles only, space-joined", () => {
    expect(rolesFromMemberships(rows)).toBe("President");
    expect(
      rolesFromMemberships([
        { club: "A", role: "President" },
        { club: "B", role: "Treasurer" },
      ]),
    ).toBe("President Treasurer");
  });
});

describe("membershipsFromFlat (legacy synthesis)", () => {
  it("splits 'Role — Club' (em dash) and 'Role - Club' (hyphen)", () => {
    expect(membershipsFromFlat("President — Investment Banking Club")).toEqual([
      { role: "President", club: "Investment Banking Club" },
    ]);
    expect(membershipsFromFlat("Treasurer - Finance Society")).toEqual([
      { role: "Treasurer", club: "Finance Society" },
    ]);
  });

  it("treats a bare token as a roleless club", () => {
    expect(membershipsFromFlat("Chess Club, Debate")).toEqual([
      { club: "Chess Club", role: "" },
      { club: "Debate", role: "" },
    ]);
  });

  it("round-trips club names through flat derivation", () => {
    const rows = membershipsFromFlat("President — IB Club, Debate");
    expect(clubsFlatFromMemberships(rows)).toBe("IB Club, Debate");
    expect(rolesFromMemberships(rows)).toBe("President");
  });
});
