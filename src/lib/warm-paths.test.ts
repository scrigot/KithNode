import { describe, it, expect, vi, beforeEach } from "vitest";
import { findWarmPaths } from "./warm-paths";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/lib/supabase";

function mockSupabaseQuery(data: Record<string, unknown>[] | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findWarmPaths", () => {
  it("returns warm paths when user has contacts at the same firm", async () => {
    mockSupabaseQuery([
      {
        name: "Jake Bennett",
        title: "Analyst",
        firmName: "Moelis & Company",
        affiliations: "Chi Phi,UNC",
        importedByUserId: "user-1",
      },
      {
        name: "Sarah Lee",
        title: "Associate",
        firmName: "Moelis",
        affiliations: "Duke",
        importedByUserId: "user-1",
      },
      {
        name: "Bob Jones",
        title: "VP",
        firmName: "Goldman Sachs",
        affiliations: "",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "Moelis and Company");

    expect(paths).toHaveLength(2);
    expect(paths[0]).toEqual({
      intermediaryName: "Jake Bennett",
      intermediaryRelation: "Chi Phi,UNC",
      firmName: "Moelis & Company",
      title: "Analyst",
    });
    expect(paths[1]).toEqual({
      intermediaryName: "Sarah Lee",
      intermediaryRelation: "Duke",
      firmName: "Moelis",
      title: "Associate",
    });
  });

  it("returns empty array when no contacts match the firm", async () => {
    mockSupabaseQuery([
      {
        name: "Bob Jones",
        title: "VP",
        firmName: "Goldman Sachs",
        affiliations: "",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "Moelis");
    expect(paths).toHaveLength(0);
  });

  it("returns empty array when supabase returns no data", async () => {
    mockSupabaseQuery(null);

    const paths = await findWarmPaths("user-1", "Moelis");
    expect(paths).toHaveLength(0);
  });

  it("returns empty array when supabase errors", async () => {
    mockSupabaseQuery(null, { message: "DB error" });

    const paths = await findWarmPaths("user-1", "Moelis");
    expect(paths).toHaveLength(0);
  });

  it("returns empty array for empty firm name", async () => {
    const paths = await findWarmPaths("user-1", "");
    expect(paths).toHaveLength(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("normalizes firm names -- GS matches Goldman Sachs", async () => {
    mockSupabaseQuery([
      {
        name: "Alice Chen",
        title: "Analyst",
        firmName: "Goldman Sachs Group",
        affiliations: "Wharton",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "GS");

    expect(paths).toHaveLength(1);
    expect(paths[0].intermediaryName).toBe("Alice Chen");
  });

  it("normalizes firm names -- Goldman Sachs Group matches gs alias", async () => {
    mockSupabaseQuery([
      {
        name: "Tom Park",
        title: "MD",
        firmName: "GS",
        affiliations: "",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "Goldman Sachs Group, Inc.");

    expect(paths).toHaveLength(1);
    expect(paths[0].intermediaryName).toBe("Tom Park");
  });

  it("returns multiple paths from different contacts at same firm", async () => {
    mockSupabaseQuery([
      {
        name: "Person A",
        title: "Analyst",
        firmName: "Evercore",
        affiliations: "UNC",
        importedByUserId: "user-1",
      },
      {
        name: "Person B",
        title: "Associate",
        firmName: "Evercore ISI",
        affiliations: "Duke",
        importedByUserId: "user-1",
      },
      {
        name: "Person C",
        title: "VP",
        firmName: "Evercore",
        affiliations: "",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "Evercore");

    expect(paths).toHaveLength(3);
    expect(paths.map((p) => p.intermediaryName)).toEqual([
      "Person A",
      "Person B",
      "Person C",
    ]);
  });

  it("uses 'Connection' as default relation when affiliations is empty", async () => {
    mockSupabaseQuery([
      {
        name: "No Affil",
        title: "Analyst",
        firmName: "Lazard",
        affiliations: "",
        importedByUserId: "user-1",
      },
    ]);

    const paths = await findWarmPaths("user-1", "Lazard");

    expect(paths[0].intermediaryRelation).toBe("Connection");
  });
});
