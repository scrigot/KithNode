import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory supabase mock (mirrors authz.test.ts): a tiny query builder over
// canned tables supporting the .eq/.in/.maybeSingle/await surface used by the
// authz helpers that canDM / canAccessThread call through to.
const { state } = vi.hoisted(() => ({ state: { tables: {} as Record<string, Record<string, unknown>[]> } }));

vi.mock("@/lib/supabase", () => {
  function makeQuery(rows: Record<string, unknown>[]) {
    const filters: { op: "eq" | "in"; col: string; val: unknown }[] = [];
    const apply = () =>
      rows.filter((r) =>
        filters.every((f) =>
          f.op === "eq" ? r[f.col] === f.val : (f.val as unknown[]).includes(r[f.col]),
        ),
      );
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => (filters.push({ op: "eq", col, val }), builder),
      in: (col: string, val: unknown) => (filters.push({ op: "in", col, val }), builder),
      maybeSingle: () => Promise.resolve({ data: apply()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: apply()[0] ?? null, error: null }),
      then: (res: (v: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: apply(), error: null }).then(res),
    };
    return builder;
  }
  return { supabase: { from: (t: string) => makeQuery(state.tables[t] ?? []) } };
});

import { dmThreadId, canDM, canAccessThread } from "@/lib/kith/messaging";

// Identity = the User UUID. canDM takes uuids; thread keys stay email pairs, so
// canAccessThread resolves uuid↔email at the seam. Each principal has both.
const ME = "11111111-1111-1111-1111-111111111111";
const FRIEND = "22222222-2222-2222-2222-222222222222";
const CO_MEMBER = "44444444-4444-4444-4444-444444444444";
const STRANGER = "33333333-3333-3333-3333-333333333333";

const ME_EMAIL = "me@x.com";
const FRIEND_EMAIL = "grayson@x.com";
const CO_EMAIL = "co@x.com";
const STRANGER_EMAIL = "stranger@x.com";

beforeEach(() => {
  state.tables = {
    Friendship: [
      { id: "f1", requesterId: ME, addresseeId: FRIEND, status: "accepted" },
    ],
    NodeMember: [
      { id: "m1", nodeId: "n1", userId: ME, role: "owner" },
      { id: "m2", nodeId: "n1", userId: CO_MEMBER, role: "member" },
    ],
    User: [
      { id: ME, email: ME_EMAIL, name: "Me" },
      { id: FRIEND, email: FRIEND_EMAIL, name: "Grayson" },
      { id: CO_MEMBER, email: CO_EMAIL, name: "Co" },
      { id: STRANGER, email: STRANGER_EMAIL, name: "Stranger" },
    ],
  };
});

describe("dmThreadId", () => {
  it("is deterministic and symmetric (sorted, lowercased)", () => {
    expect(dmThreadId("b@x.com", "a@x.com")).toBe("a@x.com|b@x.com");
    expect(dmThreadId("a@x.com", "b@x.com")).toBe(dmThreadId("b@x.com", "a@x.com"));
  });
  it("lowercases mixed-case emails", () => {
    expect(dmThreadId("Bob@X.com", "amy@x.COM")).toBe("amy@x.com|bob@x.com");
  });
});

describe("canDM — DM scope = friends OR node co-members (identity = uuid)", () => {
  it("allows DMing an accepted friend", async () => {
    expect(await canDM(ME, FRIEND)).toBe(true);
  });
  it("allows DMing a node co-member", async () => {
    expect(await canDM(ME, CO_MEMBER)).toBe(true);
  });
  it("blocks DMing a stranger", async () => {
    expect(await canDM(ME, STRANGER)).toBe(false);
  });
  it("blocks DMing yourself", async () => {
    expect(await canDM(ME, ME)).toBe(false);
  });
});

describe("canAccessThread (caller identity = uuid; dm key = email pair)", () => {
  it("node: member can access", async () => {
    expect(await canAccessThread(ME, "node", "n1")).toBe(true);
  });
  it("node: non-member cannot access", async () => {
    expect(await canAccessThread(STRANGER, "node", "n1")).toBe(false);
  });
  it("dm: a participant who may DM the other gets access", async () => {
    expect(await canAccessThread(ME, "dm", dmThreadId(ME_EMAIL, FRIEND_EMAIL))).toBe(true);
  });
  it("dm: someone not in the pair is denied even if the key is valid", async () => {
    expect(await canAccessThread(STRANGER, "dm", dmThreadId(ME_EMAIL, FRIEND_EMAIL))).toBe(false);
  });
  it("dm: a participant who may NOT DM the other (stranger pair) is denied", async () => {
    expect(await canAccessThread(ME, "dm", dmThreadId(ME_EMAIL, STRANGER_EMAIL))).toBe(false);
  });
  it("dm: malformed thread id is denied", async () => {
    expect(await canAccessThread(ME, "dm", "not-a-pair")).toBe(false);
  });
});
