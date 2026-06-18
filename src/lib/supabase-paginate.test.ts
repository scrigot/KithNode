import { describe, it, expect } from "vitest";
import { fetchAllRows } from "@/lib/supabase-paginate";

// Synthetic table of `total` rows that honors .range(from, to) like PostgREST,
// so we can prove fetchAllRows pages past the 1000-row default cap.
function fakeTable(total: number) {
  return () => ({
    range: (from: number, to: number) =>
      Promise.resolve({
        data: Array.from(
          { length: Math.max(0, Math.min(to, total - 1) - from + 1) },
          (_, i) => ({ i: from + i }),
        ),
        error: null,
      }),
  });
}

describe("fetchAllRows", () => {
  it("returns everything when under one page", async () => {
    const rows = await fetchAllRows(fakeTable(42));
    expect(rows).toHaveLength(42);
  });

  it("pages past the 1000-row PostgREST cap with no gaps or dupes", async () => {
    const rows = await fetchAllRows<{ i: number }>(fakeTable(1534));
    expect(rows).toHaveLength(1534);
    expect(rows[0].i).toBe(0);
    expect(rows[1533].i).toBe(1533);
  });

  it("terminates cleanly on an exact multiple of the page size", async () => {
    const rows = await fetchAllRows(fakeTable(2000));
    expect(rows).toHaveLength(2000);
  });

  it("returns empty for an empty table", async () => {
    const rows = await fetchAllRows(fakeTable(0));
    expect(rows).toHaveLength(0);
  });

  it("throws on a PostgREST error", async () => {
    await expect(
      fetchAllRows(() => ({
        range: () => Promise.resolve({ data: null, error: { message: "boom" } }),
      })),
    ).rejects.toThrow("boom");
  });
});
