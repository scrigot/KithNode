import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const selectsByTable = new Map<string, string[]>();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn((selection: string) => {
          const selections = selectsByTable.get(table) || [];
          selections.push(selection);
          selectsByTable.set(table, selections);
          return builder;
        }),
        eq: vi.fn(() => builder),
        neq: vi.fn(() => builder),
        or: vi.fn(() => builder),
        lt: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        is: vi.fn(() => builder),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => builder),
        limit: vi.fn(() => Promise.resolve({ data: [{ id: "opportunity-1" }], error: null })),
      };
      return builder;
    }),
  },
}));

import { GET } from "./route";

describe("GET /api/opportunities schema-cache resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectsByTable.clear();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("loads relationships with separate tenant-scoped queries", async () => {
    const response = await GET(new NextRequest("http://localhost/api/opportunities"));

    expect(response.status).toBe(200);
    expect(selectsByTable.get("Opportunity")).toEqual(["*"]);
    expect(selectsByTable.get("OpportunityContact")).toEqual(["*"]);
    expect(selectsByTable.get("OpportunityEvent")).toEqual(["*"]);
  });
});
