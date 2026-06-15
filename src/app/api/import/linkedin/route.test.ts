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
import { scrapeLinkedInMeta } from "@/lib/linkedin-import";

const TARGET_URL = "https://www.linkedin.com/in/target";
const TARGET_EMAIL = "target@x.com";

function makePost(body: unknown) {
  return new Request("http://localhost/api/import/linkedin", {
    method: "POST",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

/**
 * Table-aware AlumniContact mock. A single pre-existing pool row matches
 * TARGET_URL / TARGET_EMAIL but is owned by `ownerEmail`, so the lookup only
 * RESOLVES TO IT when the query is scoped to that same owner — a mismatched
 * importedByUserId reads as not-found (the tenant boundary under test). Every
 * lookup's filters and every insert/update payload are captured for assertions.
 * `insertError` simulates the global-unique collision a cross-tenant insert hits.
 */
function mockSupabase(opts: {
  ownerEmail: string;
  insertError?: { message: string };
}) {
  const captured = {
    lookups: [] as Record<string, unknown>[],
    inserts: [] as Record<string, unknown>[],
    updates: [] as { record: Record<string, unknown>; id: string }[],
  };
  (supabase as unknown as Record<string, unknown>).from = vi
    .fn()
    .mockImplementation((table: string) => {
      if (table !== "AlumniContact") throw new Error(`unexpected table ${table}`);
      return {
        select: () => {
          const filters: Record<string, unknown> = {};
          const builder: Record<string, unknown> = {
            eq: (col: string, val: unknown) => {
              filters[col] = val;
              return builder;
            },
            single: () => {
              captured.lookups.push({ ...filters });
              const matchesRow =
                filters.linkedInUrl === TARGET_URL || filters.email === TARGET_EMAIL;
              const hit = matchesRow && filters.importedByUserId === opts.ownerEmail;
              return Promise.resolve(
                hit
                  ? { data: { id: "alice-row" }, error: null }
                  : { data: null, error: { message: "no rows" } },
              );
            },
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

const DUP_KEY = { message: "duplicate key value violates unique constraint" };

describe("POST /api/import/linkedin — cross-tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  it("CSV: User B cannot overwrite User A's contact sharing a linkedInUrl/email", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "bob@x.com" } });
    // Alice owns the pool row; the global-unique index makes B's fallback insert collide.
    const captured = mockSupabase({ ownerEmail: "alice@x.com", insertError: DUP_KEY });

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

    // The core guarantee: Alice's row is NEVER updated.
    expect(captured.updates).toHaveLength(0);
    // Every lookup B issued was scoped to B, so it could only ever find B's own rows.
    expect(captured.lookups.length).toBeGreaterThan(0);
    for (const f of captured.lookups) {
      expect(f.importedByUserId).toBe("bob@x.com");
    }
    // B's only remaining move is a fresh insert, which collides on the global unique.
    expect(captured.inserts).toHaveLength(1);
    expect(body.imported).toBe(0);
    expect(body.failed).toBe(1);
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

    // Scoped lookup finds Alice's OWN row → update it, never insert a duplicate.
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].id).toBe("alice-row");
    expect(captured.updates[0].record.importedByUserId).toBe("alice@x.com");
    expect(captured.inserts).toHaveLength(0);
    expect(body.imported).toBe(1);
    expect(body.failed).toBe(0);
  });

  // ── URL (scrape) path ───────────────────────────────────────────────────────
  it("URL: User B cannot overwrite User A's contact sharing a linkedInUrl", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "bob@x.com" } });
    const captured = mockSupabase({ ownerEmail: "alice@x.com", insertError: DUP_KEY });

    const res = await POST(makePost({ urls: [TARGET_URL] }));
    const body = await res.json();

    expect(captured.updates).toHaveLength(0);
    expect(captured.lookups.length).toBeGreaterThan(0);
    for (const f of captured.lookups) {
      expect(f.importedByUserId).toBe("bob@x.com");
    }
    expect(captured.inserts).toHaveLength(1);
    expect(body.imported).toBe(0);
    expect(body.failed).toBe(1);
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
    expect(body.imported).toBe(1);
  });
});
