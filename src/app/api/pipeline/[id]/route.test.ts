import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

import { DELETE, GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function makeDeleteRequest(id: string) {
  const url = `http://localhost/api/pipeline/${id}`;
  const req = new Request(url, { method: "DELETE" }) as Request & {
    nextUrl: { searchParams: { get: (k: string) => string | null } };
  };
  // The route reads request.nextUrl.searchParams; plain Request lacks nextUrl.
  req.nextUrl = { searchParams: { get: () => null } };
  return req;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const UUID = "11111111-1111-1111-1111-111111111111";

describe("GET /api/pipeline/[id] — contact pipeline status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the signed-in user's pipeline choices and current membership", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: UUID, email: "sam@example.com" } });

    const pipelineBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "pl1",
            name: "AI recruiting",
            kind: "RECRUITING",
            stages: [{ key: "researched", label: "Researched", color: "zinc" }],
          },
        ],
        error: null,
      }),
    };
    const entryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "pe1", pipelineId: "pl1", stage: "researched" },
        error: null,
      }),
    };
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValueOnce(pipelineBuilder)
      .mockReturnValueOnce(entryBuilder);

    const res = await GET(
      new Request("http://localhost/api/pipeline/c1") as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pipelines).toEqual([
      {
        id: "pl1",
        name: "AI recruiting",
        kind: "RECRUITING",
        firstStage: "researched",
      },
    ]);
    expect(body.membership).toEqual({
      id: "pe1",
      pipelineId: "pl1",
      stage: "researched",
    });
    expect(pipelineBuilder.eq).toHaveBeenCalledWith("userId", UUID);
    expect(entryBuilder.eq).toHaveBeenCalledWith("userId", UUID);
    expect(entryBuilder.eq).toHaveBeenCalledWith("contactId", "c1");
  });
});

describe("POST /api/pipeline/[id] — add a contact to a pipeline (idempotent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns already_exists (200) when the contact is already in that pipeline", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: UUID, email: "sam@example.com" } });

    // Call 1: loadPipeline -> Pipeline row found.
    // Call 2: existing-entry check -> entry already present (idempotent path).
    let call = 0;
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "pl1", stages: "[]" } }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "pe1", stage: "researched" } }),
      };
    });

    const res = await POST(
      new Request("http://localhost/api/pipeline/c1", {
        method: "POST",
        body: JSON.stringify({ pipelineId: "pl1" }),
      }) as import("next/server").NextRequest,
      makeParams("c1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.already_exists).toBe(true);
  });

  it("returns 400 when pipelineId is missing", async () => {
    (auth as Mock).mockResolvedValue({ user: { id: UUID, email: "sam@example.com" } });
    (supabase as unknown as Record<string, unknown>).from = vi.fn();

    const res = await POST(
      new Request("http://localhost/api/pipeline/c1", {
        method: "POST",
        body: JSON.stringify({}),
      }) as import("next/server").NextRequest,
      makeParams("c1"),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/pipeline/[id]", () => {
  const USER = UUID;

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
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

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
    (auth as Mock).mockResolvedValue({ user: { id: USER, email: USER } });

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
