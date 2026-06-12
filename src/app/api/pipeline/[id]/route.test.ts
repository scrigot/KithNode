import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

import { DELETE, POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/pipeline/${id}`, { method: "DELETE" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/pipeline/[id] — unique-violation race is idempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns already_exists (200) when the insert hits 23505 instead of 500", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: "sam@example.com" } });

    // First query: existing-row check finds nothing. Second: insert returns a
    // unique-violation error (concurrent add won the race).
    let call = 0;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } }),
      };
    });

    const res = await POST(
      new Request("http://localhost/api/pipeline/c1", { method: "POST" }) as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.already_exists).toBe(true);
  });
});

describe("DELETE /api/pipeline/[id]", () => {
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

  it("deletes only this user's PipelineEntry and returns ok with count", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: USER } });

    const builder = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ error: null, count: 1 }).then(resolve),
    };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue(builder);

    const res = await DELETE(
      makeDeleteRequest("contact-1") as import("next/server").NextRequest,
      makeParams("contact-1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.removed).toBe(1);

    // Must have filtered by both contactId and userId
    const eqCalls = builder.eq.mock.calls;
    expect(eqCalls.some((c: string[]) => c[0] === "contactId" && c[1] === "contact-1")).toBe(true);
    expect(eqCalls.some((c: string[]) => c[0] === "userId" && c[1] === USER)).toBe(true);
  });

  it("returns ok with removed=0 when nothing matched (no cross-user leak)", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: USER } });

    const builder = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ error: null, count: 0 }).then(resolve),
    };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue(builder);

    const res = await DELETE(
      makeDeleteRequest("other-contact") as import("next/server").NextRequest,
      makeParams("other-contact"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.removed).toBe(0);
  });
});
