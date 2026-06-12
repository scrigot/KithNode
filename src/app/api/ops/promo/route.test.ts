import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

// Capture inserted rows
let insertedRows: unknown[] = [];
let listRows: unknown[] = [];
const insertSpy = vi.fn();

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: (_table: string) => ({
        insert: (rows: unknown[]) => {
          insertSpy(rows);
          insertedRows = rows as unknown[];
          return {
            select: () =>
              Promise.resolve({ data: rows, error: null }),
          };
        },
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: listRows, error: null }),
          }),
        }),
      }),
    },
  };
});

vi.mock("@/lib/founder", () => ({
  isFounder: (session: { user?: { email?: string } } | null) =>
    session?.user?.email === "samrigot31@gmail.com",
  FOUNDER_EMAIL: "samrigot31@gmail.com",
}));

vi.mock("@/lib/credits", () => ({
  CREDIT_ALLOTMENTS: { betaCode: 50, monthly: 200, annual: 200 },
}));

import { POST, GET } from "./route";

function postReq(body: unknown) {
  return new Request("http://localhost/api/ops/promo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function getReq() {
  return new Request("http://localhost/api/ops/promo", { method: "GET" });
}

const founderSession = { user: { email: "samrigot31@gmail.com" } };
const nonFounderSession = { user: { email: "rando@test.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  insertedRows = [];
  listRows = [];
});

describe("POST /api/ops/promo", () => {
  it("returns 401 with no session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(postReq({ count: 3 }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-founder", async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const res = await POST(postReq({ count: 3 }));
    expect(res.status).toBe(403);
  });

  it("founder mints N codes and returns them", async () => {
    mockAuth.mockResolvedValue(founderSession);
    const res = await POST(postReq({ count: 5, days: 14, credits: 100, note: "beta" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.codes).toHaveLength(5);
    expect(insertSpy).toHaveBeenCalledOnce();
    const rows = insertSpy.mock.calls[0][0] as Array<{ code: string; days: number; credits: number; note: string }>;
    expect(rows).toHaveLength(5);
    // All codes match KITH-XXXX with unambiguous alphabet
    for (const row of rows) {
      expect(row.code).toMatch(/^KITH-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
      expect(row.days).toBe(14);
      expect(row.credits).toBe(100);
      expect(row.note).toBe("beta");
    }
    // All codes unique
    const unique = new Set(rows.map((r) => r.code));
    expect(unique.size).toBe(5);
  });

  it("defaults days=7 and credits=betaCode when omitted", async () => {
    mockAuth.mockResolvedValue(founderSession);
    const res = await POST(postReq({ count: 1 }));
    expect(res.status).toBe(200);
    const rows = insertSpy.mock.calls[0][0] as Array<{ days: number; credits: number }>;
    expect(rows[0].days).toBe(7);
    expect(rows[0].credits).toBe(50);
  });

  it("returns 400 for count out of range", async () => {
    mockAuth.mockResolvedValue(founderSession);
    const res = await POST(postReq({ count: 201 }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ops/promo", () => {
  it("returns 401 with no session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-founder", async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });

  it("founder gets list of codes newest-first", async () => {
    mockAuth.mockResolvedValue(founderSession);
    listRows = [
      { code: "KITH-AAAA", note: "test", days: 7, credits: 50, redeemedByEmail: null, redeemedAt: null, createdAt: "2026-06-12T10:00:00Z" },
      { code: "KITH-BBBB", note: "old", days: 7, credits: 50, redeemedByEmail: "u@test.com", redeemedAt: "2026-06-11T08:00:00Z", createdAt: "2026-06-11T00:00:00Z" },
    ];
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.codes).toHaveLength(2);
    expect(body.codes[0].code).toBe("KITH-AAAA");
  });
});
