import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const eqCalls: Array<[string, unknown]> = [];
let lookupResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          eqCalls.push([column, value]);
          return builder;
        }),
        maybeSingle: vi.fn(() => Promise.resolve(lookupResult)),
      };
      return builder;
    }),
  },
}));

import { GET } from "./route";

const request = new NextRequest("http://localhost/api/opportunities/opportunity-1");
const context = { params: Promise.resolve({ id: "opportunity-1" }) };

describe("GET /api/opportunities/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqCalls.length = 0;
    lookupResult = { data: null, error: null };
  });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(401);
    expect(eqCalls).toEqual([]);
  });

  it("scopes every lookup to the signed-in UUID", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    lookupResult = { data: { id: "opportunity-1", userId: "user-1" }, error: null };
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(eqCalls).toContainEqual(["id", "opportunity-1"]);
    expect(eqCalls).toContainEqual(["userId", "user-1"]);
  });

  it("does not reveal an application missing from the user's scope", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    expect((await GET(request, context)).status).toBe(404);
  });
});
