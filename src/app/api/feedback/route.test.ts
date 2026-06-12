import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/resend", () => ({ sendFounderFeedbackAlert: vi.fn() }));

import { POST, GET, PATCH } from "./route";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { sendFounderFeedbackAlert } from "@/lib/resend";

// FOUNDER_EMAIL defaults to this when the env var is unset (lib/founder.ts).
const FOUNDER = "samrigot31@gmail.com";
const TESTER = "tester@example.com";

function makePost(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

function makePatch(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendFounderFeedbackAlert as Mock).mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(makePost({ message: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an empty message", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    const res = await POST(makePost({ message: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a message over 2000 chars", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    const res = await POST(makePost({ message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("stores the message with the session email and alerts the founder", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    const insert = vi.fn().mockResolvedValue({ error: null });
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue({ insert });

    const res = await POST(
      makePost({ message: "  Discover is stuck  ", page: "/dashboard/discover" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      userEmail: TESTER,
      page: "/dashboard/discover",
      message: "Discover is stuck",
    });
    expect(sendFounderFeedbackAlert).toHaveBeenCalledWith({
      fromEmail: TESTER,
      page: "/dashboard/discover",
      message: "Discover is stuck",
    });
  });

  it("still returns 200 when the email alert rejects (message already stored)", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    (sendFounderFeedbackAlert as Mock).mockRejectedValue(new Error("resend down"));

    const res = await POST(makePost({ message: "help" }));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/feedback (founder inbox)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for a non-founder", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns the latest messages for the founder", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: FOUNDER } });
    const rows = [
      { id: "f1", userEmail: TESTER, page: "/dashboard", message: "hi", status: "new" },
    ];
    (supabase as unknown as Record<string, unknown>).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    });

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.feedback).toHaveLength(1);
    expect(body.feedback[0].id).toBe("f1");
  });
});

describe("PATCH /api/feedback (status toggle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for a non-founder", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: TESTER } });
    const res = await PATCH(makePatch({ id: "f1", status: "done" }));
    expect(res.status).toBe(403);
  });

  it("rejects an invalid status", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: FOUNDER } });
    const res = await PATCH(makePatch({ id: "f1", status: "archived" }));
    expect(res.status).toBe(400);
  });

  it("updates the status for the founder", async () => {
    (auth as Mock).mockResolvedValue({ user: { email: FOUNDER } });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    (supabase as unknown as Record<string, unknown>).from = vi
      .fn()
      .mockReturnValue({ update });

    const res = await PATCH(makePatch({ id: "f1", status: "done" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "done" });
    expect(eq).toHaveBeenCalledWith("id", "f1");
  });
});
