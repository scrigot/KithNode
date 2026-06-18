import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// The route module imports auth (next-auth → next/server) at load. Mock it and
// the other module-level deps so we can import the PURE helpers without ever
// pulling next-auth's runtime.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
// Supabase is configurable per-test via mockFrom (mirrors contacts/route.test).
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/rescore-contact", () => ({
  rescoreContact: vi.fn(),
  loadContactTags: vi.fn(),
}));
vi.mock("@/lib/deduce-hometown", () => ({ deduceHometown: vi.fn() }));

import { normalizeField, pickEditableFields, GET, DELETE, PATCH } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { rescoreContact, loadContactTags } from "@/lib/rescore-contact";

describe("normalizeField", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizeField("  East   Chapel  Hill  ")).toBe("East Chapel Hill");
  });

  it("caps at 160 characters", () => {
    const long = "x".repeat(500);
    expect(normalizeField(long)).toHaveLength(160);
  });
});

describe("pickEditableFields", () => {
  it("keeps known editable keys (incl. name/title/firmName/university) and ignores unknown ones", () => {
    const { fields, invalid } = pickEditableFields({
      name: "Aryan Aladar",
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
      title: "CEO",
      firmName: "Goldman",
      university: "UNC Kenan-Flagler",
      randomKey: "nope",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({
      name: "Aryan Aladar",
      education: "UNC",
      highSchool: "ECHHS",
      clubs: "Chi Phi",
      passions: "AI",
      location: "NYC",
      title: "CEO",
      firmName: "Goldman",
      university: "UNC Kenan-Flagler",
    });
    expect(fields).not.toHaveProperty("randomKey");
  });

  it("normalizes each value (cap 160, collapse whitespace)", () => {
    const { fields } = pickEditableFields({
      clubs: "  a   b  ",
      passions: "y".repeat(200),
    });
    expect(fields.clubs).toBe("a b");
    expect(fields.passions).toHaveLength(160);
  });

  it("returns an empty object for a payload with no valid string keys", () => {
    expect(pickEditableFields({})).toEqual({ fields: {}, invalid: false });
    expect(
      pickEditableFields({ unknownKey: "x", education: 5 as unknown as string }),
    ).toEqual({ fields: {}, invalid: false });
  });

  it("skips non-string values for otherwise-valid keys", () => {
    const { fields } = pickEditableFields({
      education: 123 as unknown as string,
      clubs: "ok",
    });
    expect(fields).toEqual({ clubs: "ok" });
  });

  it("accepts every valid personType (incl. '' for auto) without normalizing it", () => {
    for (const pt of ["", "alum", "student", "professor"]) {
      const { fields, invalid } = pickEditableFields({ personType: pt });
      expect(invalid).toBe(false);
      expect(fields.personType).toBe(pt);
    }
  });

  it("flags an out-of-range personType as invalid and drops all fields", () => {
    const { fields, invalid } = pickEditableFields({
      personType: "wizard",
      education: "UNC",
    });
    expect(invalid).toBe(true);
    expect(fields).toEqual({});
  });

  it("accepts a valid track + role pair from the taxonomy", () => {
    const { fields, invalid } = pickEditableFields({
      track: "AI",
      role: "AI Engineer",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "AI", role: "AI Engineer" });
  });

  it("accepts clearing track + role to empty strings", () => {
    const { fields, invalid } = pickEditableFields({ track: "", role: "" });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "", role: "" });
  });

  it("accepts a role alone and infers nothing extra (track stays absent)", () => {
    const { fields, invalid } = pickEditableFields({ role: "Private Equity" });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ role: "Private Equity" });
  });

  it("flags an off-taxonomy track as invalid and drops all fields", () => {
    const { fields, invalid } = pickEditableFields({ track: "Crypto", education: "UNC" });
    expect(invalid).toBe(true);
    expect(fields).toEqual({});
  });

  it("flags an off-taxonomy role as invalid", () => {
    const { invalid } = pickEditableFields({ role: "Degen Trader" });
    expect(invalid).toBe(true);
  });

  it("flags a track/role mismatch as invalid (role not in the set track)", () => {
    // AI Engineer is an AI role, not a Finance role.
    const { invalid } = pickEditableFields({ track: "Finance", role: "AI Engineer" });
    expect(invalid).toBe(true);
  });

  it("flags a role-only edit whose owning track conflicts only when inconsistent", () => {
    // role alone is always self-consistent (track inferred from the role).
    const { invalid } = pickEditableFields({ role: "Quant" });
    expect(invalid).toBe(false);
  });

  it("accepts the 'Other' track (it is part of the taxonomy)", () => {
    const { fields, invalid } = pickEditableFields({ track: "Other", role: "" });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "Other", role: "" });
  });

  it("accepts a free-text role when the SAME patch sets track 'Other'", () => {
    const { fields, invalid } = pickEditableFields({
      track: "Other",
      role: "Veterinary Surgeon",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "Other", role: "Veterinary Surgeon" });
  });

  it("normalizes (collapses whitespace, caps length) the free-text 'Other' role", () => {
    const { fields, invalid } = pickEditableFields({
      track: "Other",
      role: "  Pastry   Chef  ",
    });
    expect(invalid).toBe(false);
    expect(fields).toEqual({ track: "Other", role: "Pastry Chef" });
  });

  it("REJECTS a non-taxonomy role when the track is NOT 'Other' (closed set preserved)", () => {
    const { invalid } = pickEditableFields({ track: "Finance", role: "Degen Trader" });
    expect(invalid).toBe(true);
  });

  it("keeps canonical degrees, rewrites casing, and drops junk tokens (no 400)", () => {
    const { fields, invalid } = pickEditableFields({
      degrees: "bs, mba, finance club, wizard",
    });
    expect(invalid).toBe(false);
    expect(fields.degrees).toBe("BS, MBA");
  });

  it("normalizes concentration like other free text (cap 160, collapse whitespace)", () => {
    const { fields } = pickEditableFields({
      concentration: "  Finance   Concentration  ",
    });
    expect(fields.concentration).toBe("Finance Concentration");

    const { fields: capped } = pickEditableFields({
      concentration: "z".repeat(300),
    });
    expect(capped.concentration).toHaveLength(160);
  });

  it("drops a degrees field with no valid tokens to empty string (still no 400)", () => {
    const { fields, invalid } = pickEditableFields({ degrees: "history, finance" });
    expect(invalid).toBe(false);
    expect(fields.degrees).toBe("");
  });

  it("accepts educations array, stores JSON-stringified rows, and derives flat columns", () => {
    const { fields, invalid } = pickEditableFields({
      educations: [
        { major: "Computer Science", degree: "BS", concentration: "AI" },
        { major: "", degree: "MBA", concentration: "" },
      ],
    });
    expect(invalid).toBe(false);
    // educations stored as JSON string
    const rows = JSON.parse(fields.educations as string);
    expect(rows).toHaveLength(2);
    expect(rows[0].major).toBe("Computer Science");
    // flat fields derived
    expect(fields.major).toBe("Computer Science");
    expect(fields.degrees).toBe("BS, MBA");
    expect(fields.concentration).toBe("AI");
  });

  it("drops all-empty educations rows and still sets flat fields", () => {
    const { fields, invalid } = pickEditableFields({
      educations: [
        { major: "", degree: "", concentration: "" },
        { major: "Economics", degree: "BA", concentration: "" },
      ],
    });
    expect(invalid).toBe(false);
    const rows = JSON.parse(fields.educations as string);
    expect(rows).toHaveLength(1);
    expect(fields.major).toBe("Economics");
  });

  it("sets flat fields to empty strings when educations array is empty", () => {
    const { fields, invalid } = pickEditableFields({ educations: [] });
    expect(invalid).toBe(false);
    expect(JSON.parse(fields.educations as string)).toHaveLength(0);
    expect(fields.major).toBe("");
    expect(fields.degrees).toBe("");
    expect(fields.concentration).toBe("");
  });

  it("ignores educations when the value is not an array (string body ignored)", () => {
    const { fields } = pickEditableFields({
      education: "UNC",
      // educations as a string is invalid; only arrays are processed
    });
    expect(fields).not.toHaveProperty("educations");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contacts/[id]
// ---------------------------------------------------------------------------

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/contacts/${id}`, { method: "DELETE" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Build a chainable Supabase mock. Each call to .from() returns a builder
// whose terminal methods (.single(), .maybeSingle(), .delete()) are stubs
// that can be overridden per-test via the returned `calls` map.
function buildSupabaseMock(
  responses: Record<string, { data?: unknown; error?: unknown }>,
) {
  // Track delete calls for assertions
  const deletedTables: string[] = [];

  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {};
    const filter = () => builder;
    builder.select = vi.fn().mockReturnValue(builder);
    builder.delete = vi.fn().mockImplementation(() => {
      deletedTables.push(table);
      return builder;
    });
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.single = vi.fn().mockResolvedValue(responses[table] ?? { data: null, error: null });
    builder.maybeSingle = vi.fn().mockResolvedValue(responses[`${table}_maybe`] ?? { data: null, error: null });
    // Make delete chains awaitable
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(responses[`${table}_delete`] ?? { data: null, error: null }).then(resolve);
    return builder;
  };

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => makeBuilder(table)),
    _deletedTables: deletedTables,
  };
  return mockSupabase;
}

describe("DELETE /api/contacts/[id]", () => {
  const USER = "sam@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);

    const res = await DELETE(
      makeDeleteRequest("contact-1") as import("next/server").NextRequest,
      makeParams("contact-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when contact does not exist", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
        delete: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
      }),
    };
    (supabase as unknown as Record<string, unknown>).from = mock.from;

    const res = await DELETE(
      makeDeleteRequest("missing-id") as import("next/server").NextRequest,
      makeParams("missing-id"),
    );
    expect(res.status).toBe(404);
  });

  it("hard-deletes owned contact: removes children then the contact row, returns deleted", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

    const deletedTables: string[] = [];

    const makeBuilder = (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = vi.fn().mockReturnValue(b);
      b.eq = vi.fn().mockReturnValue(b);
      b.delete = vi.fn().mockImplementation(() => {
        deletedTables.push(table);
        return b;
      });
      // .single() on AlumniContact returns the owned contact
      b.single = vi.fn().mockResolvedValue({
        data: { id: "c1", importedByUserId: USER },
        error: null,
      });
      b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      b.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(r);
      return b;
    };

    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockImplementation((t: string) => makeBuilder(t));

    const res = await DELETE(
      makeDeleteRequest("c1") as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, removed: "deleted" });
    // All four child tables and the contact itself must be deleted
    expect(deletedTables).toContain("Connection");
    expect(deletedTables).toContain("PipelineEntry");
    expect(deletedTables).toContain("UserDiscover");
    expect(deletedTables).toContain("AuditLog");
    expect(deletedTables).toContain("AlumniContact");
    // Children before contact
    expect(deletedTables.indexOf("AlumniContact")).toBeGreaterThan(
      deletedTables.indexOf("Connection"),
    );
  });

  it("unlinks discovered contact: deletes only this user's rows, contact NOT deleted, returns unlinked", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

    const deletedTables: string[] = [];
    const OTHER = "other@example.com";

    const makeBuilder = (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = vi.fn().mockReturnValue(b);
      b.eq = vi.fn().mockReturnValue(b);
      b.delete = vi.fn().mockImplementation(() => {
        deletedTables.push(table);
        return b;
      });
      b.single = vi.fn().mockResolvedValue({
        // Contact owned by someone else
        data: { id: "c2", importedByUserId: OTHER },
        error: null,
      });
      // UserDiscover row exists for this user
      b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: "ud1" }, error: null });
      b.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(r);
      return b;
    };

    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockImplementation((t: string) => makeBuilder(t));

    const res = await DELETE(
      makeDeleteRequest("c2") as import("next/server").NextRequest,
      makeParams("c2"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, removed: "unlinked" });
    // Pool contact row must NOT be deleted
    expect(deletedTables).not.toContain("AlumniContact");
  });

  it("returns 404 when the user has no relationship to a shared contact", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

    const OTHER = "other@example.com";

    const makeBuilder = (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = vi.fn().mockReturnValue(b);
      b.eq = vi.fn().mockReturnValue(b);
      b.delete = vi.fn().mockReturnValue(b);
      b.single = vi.fn().mockResolvedValue({
        data: { id: "c3", importedByUserId: OTHER },
        error: null,
      });
      // No UserDiscover or PipelineEntry rows
      b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      b.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(r);
      return b;
    };

    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockImplementation((t: string) => makeBuilder(t));

    const res = await DELETE(
      makeDeleteRequest("c3") as import("next/server").NextRequest,
      makeParams("c3"),
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/contacts/[id] — cross-tenant write guard (CVE fix)
//
// The AlumniContact row is shared in the Discover pool. checkAccess admits any
// user holding a high_value UserDiscover rating, so the route must separately
// reject a NON-OWNER mutation: only the importer may write the canonical row.
// ---------------------------------------------------------------------------

function makePatchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/contacts/[id] — cross-tenant write guard", () => {
  const USER = "sam@example.com";
  const OTHER = "owner@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes a non-owner (claimer) PATCH to their private overlay, never the shared row", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

    // A non-owner who holds a high_value rating clears checkAccess. Their edit
    // must land in the private overlay (contact_override), NEVER the canonical
    // AlumniContact row (which belongs to OTHER).
    const updateSpy = vi.fn().mockReturnThis(); // AlumniContact.update — forbidden here
    const upsertSpy = vi.fn().mockReturnValue({
      then: (r: (v: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(r),
    });
    const makeBuilder = () => {
      const b: Record<string, unknown> = {};
      b.select = vi.fn().mockReturnValue(b);
      b.eq = vi.fn().mockReturnValue(b);
      b.update = updateSpy;
      b.upsert = upsertSpy;
      // checkAccess: contact owned by someone else.
      b.single = vi.fn().mockResolvedValue({
        data: { id: "c1", importedByUserId: OTHER, hometown: "" },
        error: null,
      });
      // UserDiscover access rating + existing-overlay lookup both via maybeSingle.
      b.maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { rating: "high_value" }, error: null });
      b.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(r);
      return b;
    };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockImplementation(() => makeBuilder());

    const res = await PATCH(
      makePatchRequest("c1", { name: "My Correction" }) as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.overlay).toBe(true);
    // The shared AlumniContact row must NOT have been written...
    expect(updateSpy).not.toHaveBeenCalled();
    // ...the edit went to the private overlay instead.
    expect(upsertSpy).toHaveBeenCalled();
  });

  it("lets the owner PATCH their own contact (200, updates the row)", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });
    (loadContactTags as Mock).mockResolvedValue([]);
    (getUserPrefs as Mock).mockResolvedValue({});
    (rescoreContact as Mock).mockReturnValue({
      affiliations: [{ name: "UNC", boost: 10 }],
      score: 80,
      tier: "hot",
    });

    const updateSpy = vi.fn().mockReturnThis();
    const makeBuilder = (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = vi.fn().mockReturnValue(b);
      b.eq = vi.fn().mockReturnValue(b);
      b.update = updateSpy;
      // checkAccess: contact owned by THIS user.
      b.single = vi.fn().mockResolvedValue({
        data: { id: "c1", importedByUserId: USER, hometown: "" },
        error: null,
      });
      b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      // .update(...).eq(...) resolves to no error.
      b.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(r);
      return b;
    };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockImplementation((t: string) => makeBuilder(t));

    const res = await PATCH(
      makePatchRequest("c1", { name: "Aryan Aladar" }) as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.score).toBe(80);
    expect(body.tier).toBe("hot");
    // The owner's write reaches the shared row.
    expect(updateSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET /api/contacts/[id]: pool-safe field blanking for a non-owner viewer
//
// A non-owner reaches a foreign contact only via a high_value UserDiscover
// link. The owner's private/personal columns (notes, hometown, highSchool,
// passions, isFriend, speakFrequency, lastSpokenAt) must be blanked, and the
// owner's isFriend must NOT promote the viewer into the "kith" relationship
// class.
// ---------------------------------------------------------------------------

function makeGetRequest(id: string) {
  return new Request(`http://localhost/api/contacts/${id}`, { method: "GET" });
}

function makeGetParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/contacts/[id]: pool-safe non-owner view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blanks the owner's private fields and does not promote relationship_class for a non-owner viewing a pooled contact", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: "viewer@unc.edu", email: "viewer@unc.edu" } });
    (getUserPrefs as Mock).mockResolvedValue({});
    (rescoreContact as Mock).mockReturnValue({
      affiliations: [],
      score: 0,
      tier: "cold",
    });
    (loadContactTags as Mock).mockResolvedValue([]);

    // Earlier DELETE/PATCH tests reassign supabase.from directly; restore the
    // mockFrom delegate so this GET test controls the query chain.
    (supabase as unknown as Record<string, unknown>).from = (...args: unknown[]) =>
      mockFrom(...args);

    const foreignContact = {
      id: "c1",
      name: "Foreign Owner",
      importedByUserId: "someone-else@x.com",
      isFriend: true,
      notes: "private owner note",
      hometown: "Charlotte",
      highSchool: "West Forsyth HS",
      passions: "sailing",
      lastSpokenAt: "2026-06-01T12:00:00.000Z",
      speakFrequency: "weekly",
      title: "Analyst",
      firmName: "GS",
      warmthScore: 70,
      tier: "warm",
      graduationYear: 2027,
      education: "",
      location: "",
      university: "",
      affiliations: "",
    };

    // Wire the detail GET's query chain by call order. Read access is open to any
    // signed-in user; for a non-owner the UserDiscover rating + the private
    // overlay are loaded UP FRONT to build the merged `view`, then the rest:
    //  1. AlumniContact     → select.eq.single → the foreign contact row
    //  2. UserDiscover      → select.eq.eq.maybeSingle → high_value (claimer)
    //  3. contact_override  → select.eq.eq.maybeSingle → {} (no edits yet)
    //  4. ContactConnection → select.eq.eq → [] (viewer-scoped edges)
    //  5. contact_tags      → select.eq.eq.order → []
    //  6. PipelineEntry     → select.eq.eq.maybeSingle → null
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: foreignContact, error: null }),
              ),
            })),
          })),
        };
      }
      if (callCount === 2) {
        // UserDiscover rating → high_value (this viewer is a claimer)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: { rating: "high_value" }, error: null }),
                ),
              })),
            })),
          })),
        };
      }
      if (callCount === 3) {
        // contact_override → no overlay yet (empty)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: { overrides: {} }, error: null }),
                ),
              })),
            })),
          })),
        };
      }
      if (callCount === 4) {
        // ContactConnection (mutuals)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      }
      if (callCount === 5) {
        // contact_tags
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        };
      }
      // callCount === 6: PipelineEntry
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      };
    });

    const res = await GET(
      makeGetRequest("c1") as import("next/server").NextRequest,
      makeGetParams("c1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Canonical owner's private/personal columns never leak to the viewer — with
    // an empty overlay they read blank (applyOverlay strips them).
    expect(body.notes).toBe("");
    expect(body.hometown).toBe("");
    expect(body.high_school).toBe("");
    expect(body.passions).toBe("");
    expect(body.isFriend).toBe(false);
    expect(body.speakFrequency).toBe("");
    expect(body.lastSpokenAt).toBe("");
    // The owner's isFriend must NOT promote the viewer into the kith class.
    expect(body.relationship_class).not.toBe("kith");
    // A claimer (high_value) is in their network AND editable — their edits land
    // in the private overlay (PATCH routes them), not the canonical row. isOwner
    // stays false so the UI labels destructive actions as "remove from network".
    expect(body.editable).toBe(true);
    expect(body.inNetwork).toBe(true);
    expect(body.isOwner).toBe(false);
  });
});
