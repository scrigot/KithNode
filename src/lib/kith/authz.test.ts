import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory supabase mock: a tiny query builder over canned tables supporting
// the .eq/.in/.maybeSingle/.single/await surface the authz layer uses.
const { state } = vi.hoisted(() => ({ state: { tables: {} as Record<string, Record<string, unknown>[]> } }));

vi.mock("@/lib/supabase", () => {
  function makeQuery(rows: Record<string, unknown>[]) {
    const filters: { op: "eq" | "in"; col: string; val: unknown }[] = [];
    let bounds: [number, number] | null = null; // set by .range() to emulate paging
    const apply = () => {
      const filtered = rows.filter((r) =>
        filters.every((f) =>
          f.op === "eq" ? r[f.col] === f.val : (f.val as unknown[]).includes(r[f.col]),
        ),
      );
      return bounds ? filtered.slice(bounds[0], bounds[1] + 1) : filtered;
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => (filters.push({ op: "eq", col, val }), builder),
      in: (col: string, val: unknown) => (filters.push({ op: "in", col, val }), builder),
      gte: () => builder,
      order: () => builder,
      range: (from: number, to: number) => ((bounds = [from, to]), builder), // slice like PostgREST
      maybeSingle: () => Promise.resolve({ data: apply()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: apply()[0] ?? null, error: null }),
      then: (res: (v: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: apply(), error: null }).then(res),
    };
    return builder;
  }
  return { supabase: { from: (t: string) => makeQuery(state.tables[t] ?? []) } };
});

import {
  getPooledContactsForNode,
  canUserSeeContact,
  NotNodeMemberError,
} from "@/lib/kith/authz";

// Identity = the User UUID. Members/owners and AlumniContact.importedByUserId
// are user ids; email lives only on the User row (display/transport).
const ME = "11111111-1111-1111-1111-111111111111";
const FRIEND = "22222222-2222-2222-2222-222222222222";
const STRANGER = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  state.tables = {
    NodeMember: [
      { id: "m1", nodeId: "n1", userId: ME, role: "owner" },
      { id: "m2", nodeId: "n1", userId: FRIEND, role: "member" },
    ],
    User: [
      { id: ME, email: "me@x.com", name: "Me" },
      { id: FRIEND, email: "grayson@x.com", name: "Grayson" },
    ],
    AlumniContact: [
      { id: "c1", name: "Shared One", linkedInUrl: "li/1", importedByUserId: FRIEND, sharedInNodes: true, tier: "warm", enrichedAt: null },
      { id: "c2", name: "Private", linkedInUrl: "li/2", importedByUserId: FRIEND, sharedInNodes: false, tier: "hot", enrichedAt: null },
      { id: "c3", name: "Mine", linkedInUrl: "li/3", importedByUserId: ME, sharedInNodes: true, tier: "cold", enrichedAt: null },
    ],
  };
});

describe("getPooledContactsForNode — the trust boundary", () => {
  it("BLOCKS a non-member (throws, never returns rows)", async () => {
    await expect(getPooledContactsForNode("n1", STRANGER)).rejects.toBeInstanceOf(NotNodeMemberError);
  });

  it("lets a member see the pool, with owner attached for the warm path", async () => {
    const pool = await getPooledContactsForNode("n1", ME);
    const ids = pool.map((c) => c.id).sort();
    expect(ids).toContain("c1");
    expect(ids).toContain("c3");
    const c1 = pool.find((c) => c.id === "c1")!;
    expect(c1.ownerName).toBe("Grayson"); // "via Grayson"
  });

  it("excludes contacts marked sharedInNodes=false", async () => {
    const pool = await getPooledContactsForNode("n1", ME);
    expect(pool.find((c) => c.id === "c2")).toBeUndefined();
  });
});

describe("canUserSeeContact", () => {
  it("owner can see their own contact", async () => {
    expect(await canUserSeeContact(ME, "c3")).toBe(true);
  });
  it("co-member can see a shared contact", async () => {
    expect(await canUserSeeContact(ME, "c1")).toBe(true);
  });
  it("co-member CANNOT see a private (opted-out) contact", async () => {
    expect(await canUserSeeContact(ME, "c2")).toBe(false);
  });
  it("a stranger (no shared node) cannot see the contact", async () => {
    expect(await canUserSeeContact(STRANGER, "c1")).toBe(false);
  });
});
