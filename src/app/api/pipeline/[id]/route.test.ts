import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/pipeline/${id}`, { method: "DELETE" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

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
