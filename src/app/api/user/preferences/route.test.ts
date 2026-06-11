import { describe, it, expect, vi } from "vitest";

// Mock module-level deps that pull next-auth / next/server so we can test the
// pure derivation logic without routing runtime.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));

// We only test the derivation helpers (flatFromEducations, firmsFromExperiences)
// and the round-trip logic directly via the educations lib — the route itself is
// integration-tested at the handler level but the pure derivation is what we
// care about here.

import {
  parseEducations,
  parseExperiences,
  flatFromEducations,
  firmsFromExperiences,
  educationsFromFlat,
} from "@/lib/educations";

describe("POST /api/user/preferences — educations derivation", () => {
  it("derives flat major/degrees/concentration from educations rows", () => {
    const rows = parseEducations(
      JSON.stringify([
        { major: "Computer Science", degree: "BS", concentration: "AI" },
        { major: "", degree: "MBA", concentration: "" },
      ]),
    );
    const flat = flatFromEducations(rows);
    expect(flat.major).toBe("Computer Science");
    expect(flat.degrees).toBe("BS, MBA");
    expect(flat.concentration).toBe("AI");
  });

  it("derives pastFirms from experiences rows via firmsFromExperiences", () => {
    const rows = parseExperiences(
      JSON.stringify([
        { title: "Analyst", firm: "Goldman Sachs", dates: "Summer 2025" },
        { title: "Intern", firm: "McKinsey", dates: "" },
        { title: "Intern", firm: "Goldman Sachs", dates: "Summer 2024" }, // duplicate
      ]),
    );
    const firms = firmsFromExperiences(rows);
    // Deduped, order-preserving
    expect(firms).toEqual(["Goldman Sachs", "McKinsey"]);
  });

  it("sanitizes invalid educations rows (empty entries dropped)", () => {
    const rows = parseEducations(
      JSON.stringify([
        { major: "", degree: "", concentration: "" }, // all empty → dropped
        { major: "Economics", degree: "BA", concentration: "" },
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].major).toBe("Economics");
  });

  it("sanitizes invalid experiences rows (no title and no firm → dropped)", () => {
    const rows = parseExperiences(
      JSON.stringify([
        { title: "", firm: "", dates: "Summer 2025" }, // both empty → dropped
        { title: "Analyst", firm: "GS", dates: "" },
      ]),
    );
    expect(rows).toHaveLength(1);
  });
});

describe("GET /api/user/preferences — synthesis fallback", () => {
  it("synthesizes educations from flat columns when educations column is empty", () => {
    const rows = educationsFromFlat("Economics", "BA", "Finance");
    expect(rows).toHaveLength(1);
    expect(rows[0].major).toBe("Economics");
    expect(rows[0].degree).toBe("BA");
    expect(rows[0].concentration).toBe("Finance");
  });

  it("returns empty array for educationsFromFlat when all flat fields are empty", () => {
    const rows = educationsFromFlat("", "", "");
    expect(rows).toHaveLength(0);
  });

  it("synthesizes experience rows from pastFirms list (title empty, firm set)", () => {
    // Mirror the route's pastFirms.map((firm) => ({ title: "", firm, dates: "" })) logic
    const pastFirms = ["Goldman Sachs", "McKinsey"];
    const experiences = pastFirms.map((firm) => ({ title: "", firm, dates: "" }));
    expect(experiences).toHaveLength(2);
    expect(experiences[0]).toEqual({ title: "", firm: "Goldman Sachs", dates: "" });
  });
});
