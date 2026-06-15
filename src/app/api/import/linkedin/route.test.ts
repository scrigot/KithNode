import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/linkedin-import", () => ({
  scrapeLinkedInMeta: vi.fn(),
  detectAffiliations: vi.fn(() => []),
  computeWarmthScore: vi.fn(() => ({ score: 0, tier: "cold" })),
  isValidLinkedInUrl: vi.fn(() => true),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserPrefs } from "@/lib/user-prefs";
import { scrapeLinkedInMeta, isValidLinkedInUrl } from "@/lib/linkedin-import";

const TARGET_URL = "https://www.linkedin.com/in/target";
const TARGET_EMAIL = "target@x.com";

// The already-enriched row sitting in the shared pool, owned by `ownerEmail`.
const POOL_ROW = {
  id: "alice-row",
  name: "Alice's John",
  title: "Analyst",
  firmName: "Goldman Sachs",
  affiliations: "Same School",
  warmthScore: 50,
  tier: "warm",
};

function makePost(body: unknown) {
  return new Request("http://localhost/api/import/linkedin", {
    method: "POST",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

/**
 * Table-aware mock for the two tables the route touches.
 *
 * AlumniContact lookups distinguish the route's TWO lookup kinds:
 *  - OWNER-SCOPED (`.eq("importedByUserId", x)`) — hits only when x is the row's
 *    true owner. This is the tenant boundary: a non-owner reads not-found and can
 *    never UPDATE the row.
 *  - UNSCOPED POOL (`.eq("linkedInUrl"|"email", …)` with no importedByUserId) —
 *    used solely to LINK the caller to an existing pool row; it hits regardless
 *    of owner.
 *
 * UserDiscover.upsert captures the high_value link the importer gets to a pool
 * row. insert/update payloads + every lookup's filters are captured too.
 * `insertError` simulates the rare race where a pool lookup misses but the insert
 * still collides on the global unique (the 23505 safety net).
 */
function mockSupabase(opts: {
  ownerEmail: string;
  insertError?: { code?: string; message: string };
}) {
  const captured = {
    lookups: [] as Record<string, unknown>[],
    inserts: [] as Record<string, unknown>[],
    updates: [] as { record: Record<string, unknown>; id: string }[],
    links: [] as Record<string, unknown>[],
  };
  (supabase as unknown as Record<string, unknown>).from = vi
    .fn()
    .mockImplementation((table: string) => {
      if (table === "UserDiscover") {
        return {
          upsert: (rec: Record<string, unknown>) => {
            captured.links.push(rec);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table !== "AlumniContact") throw new Error(`unexpected table ${table}`);
      return {
        select: () => {
          const filters: Record<string, unknown> = {};
          // findPoolRow now resolves with .maybeSingle(); the other AlumniContact
          // lookups still use .single(). Both go through the same matcher.
          const lookup = () => {
            captured.lookups.push({ ...filters });
            const matchesRow =
              filters.linkedInUrl === TARGET_URL || filters.email === TARGET_EMAIL;
            if (!matchesRow) {
              return Promise.resolve({ data: null, error: { message: "no rows" } });
            }
            // Owner-scoped lookup: hits only for the row's true owner.
            if (filters.importedByUserId !== undefined) {
              return Promise.resolve(
                filters.importedByUserId === opts.ownerEmail
                  ? { data: POOL_ROW, error: null }
                  : { data: null, error: { message: "no rows" } },
              );
            }
            // Unscoped pool lookup: the row exists in the pool regardless of owner.
            return Promise.resolve({ data: POOL_ROW, error: null });
          };
          const builder: Record<string, unknown> = {
            eq: (col: string, val: unknown) => {
              filters[col] = val;
              return builder;
            },
            single: lookup,
            maybeSingle: lookup,
          };
          return builder;
        },
        insert: (rec: Record<string, unknown>) => {
          captured.inserts.push(rec);
          const err = opts.insertError ?? null;
          const result = { error: err };
          // Thenable so `await insert(...)` resolves to {error}; .select().single()
          // supports the URL path's insert().select("id").single() chain.
          return {
            then: (onF: (v: { error: unknown }) => unknown) =>
              Promise.resolve(result).then(onF),
            select: () => ({
              single: () =>
                Promise.resolve({ data: err ? null : { id: "new-row" }, error: err }),
            }),
          };
        },
        update: (record: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            captured.updates.push({ record, id });
            return Promise.resolve({ error: null });
          },
        }),
      };
    });
  return captured;
}

// A realistic Postgres unique-violation: SQLSTATE 23505 + a message naming the
// constraint. The route must NOT echo this raw text back to the client.
const DUP_KEY = {
  code: "23505",
  message:
    'duplicate key value violates unique constraint "AlumniContact_linkedInUrl_key"',
};

const LINK = { userId: "bob@x.com", contactId: "alice-row", rating: "high_value" };

describe("POST /api/import/linkedin — shared-pool isolation + link-on-match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: every URL is valid. The malformed-URL test overrides this; reset
    // here so the override never leaks (clearAllMocks keeps implementations).
    (isValidLinkedInUrl as Mock).mockReturnValue(true);
    (getUserPrefs as Mock).mockResolvedValue({});
    (scrapeLinkedInMeta as Mock).mockResolvedValue({
      name: "Target Person",
      title: "Analyst",
      experience: "Goldman Sachs",
      education: "UNC Chapel Hill",
      location: "New York, NY",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(makePost({ urls: [TARGET_URL] }));
    expect(res.status).toBe(401);
  });

  // ── CSV-contacts path ───────────────────────────────────────────────────────
  it("CSV: User B importing A's pooled contact LINKS to it (no overwrite, no re-enrich)", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "bob@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com" });

    const res = await POST(
      makePost({
        contacts: [
          {
            name: "Hijack Attempt",
            title: "Spoof",
            firmName: "Evil Co",
            email: TARGET_EMAIL,
            education: "",
            location: "",
            linkedInUrl: TARGET_URL,
          },
        ],
      }),
    );
    const body = await res.json();

    // A's row is NEVER updated and NEVER duplicated — B only gets a read-link.
    expect(captured.updates).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
    // Owner-scoped lookups stay scoped to B; the pool lookup is unscoped.
    const scoped = captured.lookups.filter((f) => f.importedByUserId !== undefined);
    const unscoped = captured.lookups.filter((f) => f.importedByUserId === undefined);
    expect(scoped.length).toBeGreaterThan(0);
    for (const f of scoped) expect(f.importedByUserId).toBe("bob@x.com");
    expect(unscoped.length).toBeGreaterThan(0);
    // B is linked to A's pool row via a high_value Discover row.
    expect(captured.links).toEqual([LINK]);
    // Reported as imported+linked, using the POOL row's enriched identity (not B's CSV).
    expect(body.imported).toBe(1);
    expect(body.linked).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.contacts[0].name).toBe("Alice's John");
    expect(body.contacts[0].id).toBe("alice-row");
  });

  it("CSV: the owner CAN still update their own contact (dedupe preserved)", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "alice@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com" });

    const res = await POST(
      makePost({
        contacts: [
          {
            name: "Updated Name",
            title: "VP",
            firmName: "Goldman Sachs",
            email: TARGET_EMAIL,
            education: "",
            location: "",
            linkedInUrl: TARGET_URL,
          },
        ],
      }),
    );
    const body = await res.json();

    // Scoped lookup finds Alice's OWN row → update it, never insert or link.
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].id).toBe("alice-row");
    expect(captured.updates[0].record.importedByUserId).toBe("alice@x.com");
    expect(captured.inserts).toHaveLength(0);
    expect(captured.links).toHaveLength(0);
    expect(body.imported).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("CSV: rejects a malformed/javascript: linkedInUrl before any DB write", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "alice@x.com" } });
    (isValidLinkedInUrl as Mock).mockImplementation(
      (u: string) => !u.startsWith("javascript:"),
    );
    const captured = mockSupabase({ ownerEmail: "alice@x.com" });

    const res = await POST(
      makePost({
        contacts: [
          {
            name: "XSS Attempt",
            title: "X",
            firmName: "Y",
            email: "",
            education: "",
            location: "",
            linkedInUrl: "javascript:alert(document.cookie)",
          },
        ],
      }),
    );
    const body = await res.json();

    // Rejected up front: no lookup, no insert, no update, no link.
    expect(captured.lookups).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
    expect(captured.updates).toHaveLength(0);
    expect(captured.links).toHaveLength(0);
    expect(body.imported).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.contacts[0].error).toBe("Invalid LinkedIn URL format");
  });

  it("CSV: a genuine insert collision (race) returns a sanitized message, not raw DB error", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "bob@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com", insertError: DUP_KEY });

    // A URL that does NOT match the pool, so owner-scoped + pool lookups all miss
    // and we reach the insert — which then collides (the race the safety net covers).
    const res = await POST(
      makePost({
        contacts: [
          {
            name: "Race",
            title: "X",
            firmName: "Y",
            email: "",
            education: "",
            location: "",
            linkedInUrl: "https://www.linkedin.com/in/nomatch",
          },
        ],
      }),
    );
    const body = await res.json();

    expect(captured.inserts).toHaveLength(1);
    expect(captured.links).toHaveLength(0);
    expect(body.failed).toBe(1);
    expect(body.contacts[0].error).toBe("This contact is already in the network");
    expect(body.contacts[0].error).not.toMatch(/constraint|duplicate key/i);
  });

  // ── URL (scrape) path ───────────────────────────────────────────────────────
  it("URL: User B importing A's pooled contact LINKS to it (no overwrite)", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "bob@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com" });

    const res = await POST(makePost({ urls: [TARGET_URL] }));
    const body = await res.json();

    expect(captured.updates).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
    const scoped = captured.lookups.filter((f) => f.importedByUserId !== undefined);
    const unscoped = captured.lookups.filter((f) => f.importedByUserId === undefined);
    expect(scoped.length).toBeGreaterThan(0);
    for (const f of scoped) expect(f.importedByUserId).toBe("bob@x.com");
    expect(unscoped.length).toBeGreaterThan(0);
    expect(captured.links).toEqual([LINK]);
    expect(body.imported).toBe(1);
    expect(body.linked).toBe(1);
    expect(body.contacts[0].name).toBe("Alice's John");
    expect(body.contacts[0].id).toBe("alice-row");
  });

  it("URL: the owner CAN still update their own contact", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "alice@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com" });

    const res = await POST(makePost({ urls: [TARGET_URL] }));
    const body = await res.json();

    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].id).toBe("alice-row");
    expect(captured.updates[0].record.importedByUserId).toBe("alice@x.com");
    expect(captured.inserts).toHaveLength(0);
    expect(captured.links).toHaveLength(0);
    expect(body.imported).toBe(1);
  });
});
