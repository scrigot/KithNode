import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const USER = "sam@example.com";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/discover/rate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildUpsertMock(result: { error: unknown }) {
  const builder = {
    upsert: vi.fn().mockResolvedValue(result),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return vi.fn().mockReturnValue(builder);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/discover/rate", () => {
  it("returns 400 for an invalid rating", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: USER } });
    (supabase as unknown as Record<string, unknown>).from = buildUpsertMock({ error: null });

    const res = await POST(
      makeRequest({ contactId: "c1", rating: "love" }) as import("next/server").NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it("upserts later rating and returns success", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: USER } });

    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    const builder = { upsert: upsertFn };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue(builder);

    const res = await POST(
      makeRequest({ contactId: "c1", rating: "later" }) as import("next/server").NextRequest,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(upsertFn).toHaveBeenCalledWith(
      { userId: USER, contactId: "c1", rating: "later" },
      { onConflict: "userId,contactId" },
    );
  });
});
