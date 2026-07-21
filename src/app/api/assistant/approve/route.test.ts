import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const state = vi.hoisted(() => ({
  toolCall: null as Record<string, unknown> | null,
  approval: null as Record<string, unknown> | null,
  calls: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
}));

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => ({
  select: () => {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      eq: (field: string, value: unknown) => { filters.push([field, value]); return chain; },
      maybeSingle: async () => {
        state.calls.push({ table, filters });
        return { data: table === "AssistantToolCall" ? state.toolCall : state.approval, error: null };
      },
    };
    return chain;
  },
}) } }));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/assistant/approve", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/assistant/approve", () => {
  beforeEach(() => { vi.clearAllMocks(); state.toolCall = null; state.approval = null; state.calls = []; });

  it("requires authentication", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(request({ toolCallId: "tool-1", decision: "approve" }))).status).toBe(401);
  });

  it("scopes tool lookup to the authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const response = await POST(request({ toolCallId: "tool-1", decision: "approve" }));
    expect(response.status).toBe(404);
    expect(state.calls[0]).toEqual({ table: "AssistantToolCall", filters: [["id", "tool-1"], ["userId", "user-1"]] });
  });

  it("rejects execution for preview-only tools", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    state.toolCall = {
      id: "tool-1",
      userId: "user-1",
      toolName: "draft_outreach",
      status: "proposed",
      input: {},
    };
    state.approval = { id: "approval-1", status: "pending" };
    const response = await POST(request({ toolCallId: "tool-1", decision: "approve" }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Tool execution is not available yet",
    });
  });
});
