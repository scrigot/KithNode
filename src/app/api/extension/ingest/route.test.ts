import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/deduce-hometown", () => ({ deduceHometown: vi.fn() }));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { deduceHometown } from "@/lib/deduce-hometown";

const EMPTY_PREFS = {
  university: "", highSchool: "", hometown: "", greekOrg: "", major: "", minor: "",
  concentration: "", degrees: "", targetIndustries: [], targetFirms: [], targetLocations: [],
  clubs: [], skills: [], pastFirms: [], educations: [], experiences: [], clubMemberships: [],
  recruitingDate: null, weeklyGoalTarget: 3, onboardingGoal: "", onboardingPain: [],
  onboardingTimeline: "", tutorialDoneAt: null,
};

function makePost(body: unknown) {
  return new Request("http://localhost/api/extension/ingest", {
    method: "POST",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

const SAMPLE = {
  linkedInUrl: "https://www.linkedin.com/in/jane-doe",
  name: "Jane Doe",
  headline: "Investment Banking Summer Analyst at Goldman Sachs",
  company: "Goldman Sachs",
  location: "New York, NY",
  skills: ["Financial Modeling", "Excel", "Financial Modeling"], // dupe on purpose
  experiences: [
    { title: "IB Summer Analyst", firm: "Goldman Sachs", start: "Jun 2025", end: "Present" },
    { title: "PE Intern", firm: "Blackstone", start: "Jun 2024", end: "Aug 2024" },
  ],
  educations: [{ school: "UNC", degree: "BS", major: "Business Administration" }],
  clubs: ["Investment Club", { club: "180 Degrees Consulting", role: "Analyst" }],
};

describe("POST /api/extension/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserPrefs as Mock).mockResolvedValue(EMPTY_PREFS);
    (deduceHometown as Mock).mockResolvedValue("");
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(makePost(SAMPLE));
    expect(res.status).toBe(401);
  });

  it("rejects a non-LinkedIn URL", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const res = await POST(makePost({ ...SAMPLE, linkedInUrl: "https://example.com/x" }));
    expect(res.status).toBe(400);
  });

  it("inserts a new contact with the rich dimensions filled + rescored", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    let inserted: Record<string, unknown> | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      // AlumniContact
      return {
        // existing-row lookup by slug → none; owner-list select → none
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: (rec: Record<string, unknown>) => {
          inserted = rec;
          return { select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) };
        },
      };
    });

    const res = await POST(makePost(SAMPLE));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.created).toBe(true);
    // Counts surfaced to the popup.
    expect(body.contact.skills).toBe(2); // de-duped
    expect(body.contact.clubs).toBe(2);
    expect(body.contact.experiences).toBe(2);

    // The stored record carries the rich fields in the app's canonical shapes.
    expect(inserted).toBeTruthy();
    const rec = inserted!;
    expect(rec.source).toBe("linkedin_extension");
    expect(rec.enrichmentSource).toBe("linkedin_extension");
    expect(rec.skills).toBe("Financial Modeling, Excel");
    // experiences/clubMemberships/educations stored JSON-stringified.
    expect(JSON.parse(rec.experiences as string)).toHaveLength(2);
    expect(JSON.parse(rec.clubMemberships as string).map((c: { club: string }) => c.club)).toEqual([
      "Investment Club",
      "180 Degrees Consulting",
    ]);
    expect(JSON.parse(rec.educations as string)[0].major).toBe("Business Administration");
    // Derived flats.
    expect(rec.clubs).toBe("Investment Club, 180 Degrees Consulting");
    expect(rec.pastFirms).toBe("Blackstone"); // current (Present) excluded
    expect(rec.major).toBe("Business Administration");
    // Classified into the Finance track from the headline/company.
    expect(rec.track).toBe("Finance");
    // Rescored.
    expect(typeof rec.warmthScore).toBe("number");
    expect(["hot", "warm", "monitor", "cold"]).toContain(rec.tier);
  });

  it("writes mutual edges, resolving only the one already in the owner network", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    // Owner already has Alice (by slug) in their network; Bob is unknown.
    const ownerContacts = [
      { id: "alice-id", name: "Alice Smith", linkedInUrl: "https://www.linkedin.com/in/alice-smith" },
    ];
    let upsertedEdges: Record<string, unknown>[] | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: (rows: Record<string, unknown>[]) => {
            upsertedEdges = rows;
            return Promise.resolve({ error: null });
          },
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: ownerContacts }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) }),
      };
    });

    const res = await POST(
      makePost({
        ...SAMPLE,
        mutuals: [
          { name: "Alice Smith", slug: "https://www.linkedin.com/in/alice-smith" }, // in network
          { name: "Bob Jones" }, // not in network
        ],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.contact.mutuals).toBe(2);

    expect(upsertedEdges).toBeTruthy();
    expect(upsertedEdges!).toHaveLength(2);
    const byName = Object.fromEntries(upsertedEdges!.map((e) => [e.mutualName, e]));
    expect(byName["Alice Smith"].mutualContactId).toBe("alice-id");
    expect(byName["Bob Jones"].mutualContactId).toBeNull();
  });

  it("moves a fraternity experience into clubMemberships, sets greekOrg, drops it from experiences/pastFirms", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    let inserted: Record<string, unknown> | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      if (table === "contact_tags") {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: (rec: Record<string, unknown>) => {
          inserted = rec;
          return { select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) };
        },
      };
    });

    const res = await POST(
      makePost({
        ...SAMPLE,
        experiences: [
          { title: "PE Intern", firm: "Blackstone", start: "Jun 2024", end: "Aug 2024" },
          { title: "Recruitment Chair", firm: "Chi Phi", start: "Jan 2024", end: "Present" },
        ],
        clubs: [],
      }),
    );
    expect(res.status).toBe(200);

    const rec = inserted!;
    // The fraternity became a club membership, carrying the title as its role.
    const memberships = JSON.parse(rec.clubMemberships as string) as { club: string; role: string }[];
    expect(memberships).toEqual([{ club: "Chi Phi", role: "Recruitment Chair" }]);
    // greekOrg filled from the moved chapter.
    expect(rec.greekOrg).toBe("Chi Phi");
    // The real job stays; the fraternity is gone from experiences + pastFirms.
    const exps = JSON.parse(rec.experiences as string) as { firm: string }[];
    expect(exps.map((e) => e.firm)).toEqual(["Blackstone"]);
    expect(rec.pastFirms).toBe("Blackstone");
    expect(rec.clubs).toBe("Chi Phi");
  });

  it("deduces a hometown from highSchool when the contact has none", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    (deduceHometown as Mock).mockResolvedValue("Raleigh, NC");

    let inserted: Record<string, unknown> | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      if (table === "contact_tags") {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: (rec: Record<string, unknown>) => {
          inserted = rec;
          return { select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) };
        },
      };
    });

    const res = await POST(makePost({ ...SAMPLE, highSchool: "Millbrook High School" }));
    expect(res.status).toBe(200);

    expect(deduceHometown).toHaveBeenCalledWith("Millbrook High School");
    expect(inserted!.highSchool).toBe("Millbrook High School");
    expect(inserted!.hometown).toBe("Raleigh, NC");
  });

  it("persists notes, isFriend, and a valid speakFrequency on the written record", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    let inserted: Record<string, unknown> | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      if (table === "contact_tags") {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: (rec: Record<string, unknown>) => {
          inserted = rec;
          return { select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) };
        },
      };
    });

    const res = await POST(
      makePost({
        ...SAMPLE,
        notes: "Met at the career fair, follow up about PE.",
        isFriend: true,
        speakFrequency: "monthly",
        lastSpokenAt: "2026-06-01",
      }),
    );
    expect(res.status).toBe(200);

    const rec = inserted!;
    expect(rec.notes).toBe("Met at the career fair, follow up about PE.");
    expect(rec.isFriend).toBe(true);
    expect(rec.speakFrequency).toBe("monthly");
    expect(rec.lastSpokenAt).toBe(new Date("2026-06-01").toISOString());
  });

  it("writes captured tags to contact_tags scoped to the user + contact", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    let upsertedTags: Record<string, unknown>[] | null = null;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      if (table === "contact_tags") {
        return {
          upsert: (rows: Record<string, unknown>[]) => {
            upsertedTags = rows;
            return Promise.resolve({ error: null });
          },
        };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) }),
      };
    });

    const res = await POST(makePost({ ...SAMPLE, tags: ["referral", "hot lead"] }));
    expect(res.status).toBe(200);

    expect(upsertedTags).toBeTruthy();
    expect(upsertedTags!).toEqual([
      { user_id: "sam@x.com", contact_id: "new-contact-id", tag: "referral" },
      { user_id: "sam@x.com", contact_id: "new-contact-id", tag: "hot lead" },
    ]);
  });

  it("returns the contact id in the JSON response", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });

    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
      if (table === "ContactConnection") {
        return {
          upsert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => ({ is: () => ({ neq: () => ({ in: () => Promise.resolve({ error: null }) }) }) }) }),
        };
      }
      if (table === "contact_tags") {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: (cols?: string) =>
          cols === "id, name, linkedInUrl"
            ? { eq: () => Promise.resolve({ data: [] }) }
            : { eq: () => ({ ilike: () => ({ limit: async () => ({ data: [] }) }) }) },
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "new-contact-id" }, error: null }) }) }),
      };
    });

    const res = await POST(makePost(SAMPLE));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.contact.id).toBe("new-contact-id");
  });
});
