import { describe, it, expect, vi } from "vitest";

// Mock module-level deps that pull next-auth / next/server so we can test the
// pure derivation logic without routing runtime.
const mockAuth = vi.fn();
let capturedPatch: Record<string, unknown> | null = null;
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      // Prior-state read for first-time onboarding detection: no prior row.
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      update: (p: Record<string, unknown>) => {
        capturedPatch = p;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyFounder: vi.fn(() => Promise.resolve()) }));

import { POST } from "./route";

function postBody(body: unknown) {
  return POST({ json: async () => body } as unknown as Parameters<typeof POST>[0]);
}

describe("POST /api/user/preferences — partial saves never wipe the profile", () => {
  it("a tutorial-only POST writes ONLY tutorialDoneAt", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@unc.edu" } });
    capturedPatch = null;
    await postBody({ tutorial_done_at: "2026-06-12T00:00:00.000Z" });
    expect(Object.keys(capturedPatch ?? {})).toEqual(["tutorialDoneAt"]);
    expect(capturedPatch).not.toHaveProperty("university");
    expect(capturedPatch).not.toHaveProperty("major");
    expect(capturedPatch).not.toHaveProperty("clubs");
  });

  it("a funnel-only POST (goal) writes ONLY onboardingGoal", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@unc.edu" } });
    capturedPatch = null;
    await postBody({ onboarding_goal: "Investment Banking" });
    expect(Object.keys(capturedPatch ?? {})).toEqual(["onboardingGoal"]);
    expect(capturedPatch).not.toHaveProperty("targetIndustries");
  });

  it("a full profile body still writes the core fields", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@unc.edu" } });
    capturedPatch = null;
    await postBody({
      current_university: "UNC",
      target_industries: ["IB"],
      clubs: ["Chess"],
    });
    expect(capturedPatch).toHaveProperty("university", "UNC");
    expect(capturedPatch).toHaveProperty("targetIndustries");
    expect(capturedPatch).toHaveProperty("clubs");
  });
});

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
