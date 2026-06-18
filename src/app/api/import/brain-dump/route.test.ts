import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/rescore-contact", () => ({
  rescoreContact: vi.fn(),
  loadContactTags: vi.fn(),
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";

const EMPTY_PREFS = {
  university: "", highSchool: "", hometown: "", greekOrg: "", major: "", minor: "",
  concentration: "", degrees: "", targetIndustries: [], targetFirms: [], targetLocations: [],
  clubs: [], skills: [], pastFirms: [], educations: [], experiences: [], clubMemberships: [],
  recruitingDate: null, weeklyGoalTarget: 3, onboardingGoal: "", onboardingPain: [],
  onboardingTimeline: "", tutorialDoneAt: null,
};

// Two rows from src/lib/brain-dump.test.ts: Adler Rice (friend) + Sam Malone (friend).
const SAMPLE_CSV = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes
Adler Rice,Mizuho,Incoming 2027 Sales and Trading Summer Analyst,UNC Chapel Hill,,Finance Society,Chi Phi,,,,UNC Chi Phi brother,friend,
Sam Malone,Chi Phi Fraternity,Event Coordinator,UNC Chapel Hill,,Finance Society,Chi Phi,"Raleigh, NC",Broughton High School,,UNC Chi Phi brother,friend,swam like me`;

function makePost(body: unknown) {
  return new Request("http://localhost/api/import/brain-dump", {
    method: "POST",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

/**
 * Table-aware supabase mock. AlumniContact: the owner-scoped select returns
 * `existingRows`; insert/update capture their payloads into `captured`.
 */
function mockSupabase(existingRows: Record<string, unknown>[]) {
  const captured = { inserts: [] as Record<string, unknown>[], updates: [] as Record<string, unknown>[] };
  (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation((table: string) => {
    if (table !== "AlumniContact") throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({ eq: () => Promise.resolve({ data: existingRows }) }),
      insert: (rec: Record<string, unknown>) => {
        captured.inserts.push(rec);
        return Promise.resolve({ error: null });
      },
      update: (rec: Record<string, unknown>) => {
        captured.updates.push(rec);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    };
  });
  return captured;
}

describe("POST /api/import/brain-dump", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserPrefs as Mock).mockResolvedValue(EMPTY_PREFS);
    (loadContactTags as Mock).mockResolvedValue([]);
    (rescoreContact as Mock).mockReturnValue({
      affiliations: [{ name: "Same Greek", boost: 30 }],
      score: 42,
      tier: "warm",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(makePost({ csvText: SAMPLE_CSV }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the CSV has no rows", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    mockSupabase([]);
    const res = await POST(makePost({ csvText: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No rows found in the pasted data");
  });

  it("inserts new contacts with the mapped fields + a rescored tier", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([]);

    const res = await POST(makePost({ csvText: SAMPLE_CSV }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.created).toBe(2);
    expect(body.updated).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.imported).toBe(2);

    // Both rows inserted, never updated (no existing match).
    expect(captured.inserts).toHaveLength(2);
    expect(captured.updates).toHaveLength(0);

    const adler = captured.inserts.find((r) => r.name === "Adler Rice")!;
    expect(adler).toBeTruthy();
    expect(adler.greekOrg).toBe("Chi Phi");
    expect(adler.education).toBe("UNC Chapel Hill");
    expect(adler.university).toBe("UNC Chapel Hill");
    expect(adler.isFriend).toBe(true);
    expect(adler.source).toBe("brain_dump");
    expect(adler.enrichmentSource).toBe("brain_dump");
    expect(adler.graduationYear).toBe(0);
    expect(adler.importedByUserId).toBe("sam@x.com");
    // Rescored.
    expect(adler.tier).toBe("warm");
    expect(adler.warmthScore).toBe(42);
    expect(adler.affiliations).toBe("Same Greek");

    // Response surfaces the rescored tier per contact.
    expect(body.contacts).toContainEqual({ name: "Adler Rice", tier: "warm", score: 42 });
  });

  it("name-merges onto an existing contact instead of inserting a duplicate", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([
      { id: "adler-id", name: "adler  rice", firmName: "Old Co", greekOrg: "" },
    ]);

    const res = await POST(makePost({ csvText: SAMPLE_CSV }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.created).toBe(1); // Sam Malone
    expect(body.updated).toBe(1); // Adler Rice (normalized-name match)

    const adlerUpdate = captured.updates[0];
    expect(adlerUpdate.firmName).toBe("Mizuho"); // captured value wins
    expect(adlerUpdate.greekOrg).toBe("Chi Phi");
    expect(loadContactTags).toHaveBeenCalledWith("sam@x.com", "adler-id");
  });

  it("merges by LinkedIn slug even when the name differs", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([
      {
        id: "adler-id",
        name: "A. Rice",
        linkedInUrl: "https://linkedin.com/in/adler-rice",
        greekOrg: "",
      },
    ]);
    const csv = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes,linkedin_url
Adler Rice,Mizuho,Analyst,UNC Chapel Hill,,,Chi Phi,,,,brother,friend,,https://www.linkedin.com/in/adler-rice/`;
    const res = await POST(makePost({ csvText: csv }));
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.created).toBe(0);
    expect(captured.updates[0].greekOrg).toBe("Chi Phi");
  });

  it("does NOT merge a name match onto a different person (different real URL)", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([
      {
        id: "js1",
        name: "John Smith",
        linkedInUrl: "https://linkedin.com/in/john-smith-1",
        firmName: "Old Co",
      },
    ]);
    const csv = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes,linkedin_url
John Smith,New Co,Analyst,,,,,,,,,acquaintance,,https://www.linkedin.com/in/john-smith-2/`;
    const res = await POST(makePost({ csvText: csv }));
    const body = await res.json();
    expect(body.created).toBe(1); // different person → inserted, not overwritten
    expect(body.updated).toBe(0);
    expect(captured.updates).toHaveLength(0);
  });

  it("downgrades isFriend when closeness is acquaintance/weak", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([
      { id: "jane-id", name: "Jane Roe", isFriend: true, linkedInUrl: "" },
    ]);
    const csv = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes,linkedin_url
Jane Roe,Acme,PM,,,,,,,,,acquaintance,,`;
    const res = await POST(makePost({ csvText: csv }));
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(captured.updates[0].isFriend).toBe(false);
  });

  it("gives URL-less net-new contacts a unique non-URL sentinel", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([]);
    await POST(makePost({ csvText: SAMPLE_CSV }));
    expect(captured.inserts).toHaveLength(2);
    for (const ins of captured.inserts) {
      expect(ins.linkedInUrl as string).toMatch(/^noprofile:/);
    }
  });

  it("collapses same-batch duplicate names to one contact", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([]);
    const csv = `name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes,linkedin_url
Dup Person,Acme,Analyst,,,,,,,,,friend,,
Dup Person,Beta,VP,,,,,,,,,friend,,`;
    const res = await POST(makePost({ csvText: csv }));
    const body = await res.json();
    expect(body.created).toBe(1);
    expect(captured.inserts).toHaveLength(1);
  });

  it("rejects an oversized paste with 413", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    mockSupabase([]);
    const res = await POST(makePost({ csvText: "x".repeat(500_001) }));
    expect(res.status).toBe(413);
  });

  it("skips a bad row and increments failed without aborting the batch", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    const captured = mockSupabase([]);
    // First insert throws, second succeeds.
    let n = 0;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
      insert: (rec: Record<string, unknown>) => {
        n++;
        if (n === 1) return Promise.resolve({ error: { message: "boom" } });
        captured.inserts.push(rec);
        return Promise.resolve({ error: null });
      },
    }));

    const res = await POST(makePost({ csvText: SAMPLE_CSV }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.failed).toBe(1);
    expect(body.created).toBe(1);
  });
});

describe("GET /api/import/brain-dump", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns a prompt string carrying the user's school", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "sam@x.com", email: "sam@x.com" } });
    (getUserPrefs as Mock).mockResolvedValue({
      ...EMPTY_PREFS,
      university: "UNC Chapel Hill",
      greekOrg: "Chi Phi",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.prompt).toBe("string");
    expect(body.prompt).toContain("School: UNC Chapel Hill");
    expect(body.prompt).toContain("Fraternity / sorority: Chi Phi");
  });
});
