import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth (real @/lib/auth pulls NextAuth + next/server into Vitest).
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

// Mock the Supabase client and record the chained calls so we can assert the
// userId filter/payload is ALWAYS applied (this is the load-bearing IDOR guard,
// since the service-role client bypasses RLS). vi.hoisted keeps the spies usable
// inside the hoisted vi.mock factory AND in the assertions below.
const { eq, select, insert, update, updateEq, del, deleteEq, from } = vi.hoisted(() => {
  const eq = vi.fn(() => "SELECT_RESULT");
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn(() => "INSERT_RESULT");
  const updateEq = vi.fn(() => "UPDATE_RESULT");
  const update = vi.fn(() => ({ eq: updateEq }));
  const deleteEq = vi.fn(() => "DELETE_RESULT");
  const del = vi.fn(() => ({ eq: deleteEq }));
  const from = vi.fn(() => ({ select, insert, update, delete: del }));
  return { eq, select, insert, update, updateEq, del, deleteEq, from };
});
vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

import { requireUser, scopedSelect, scopedInsert, scopedUpdate, scopedDelete } from "./pipeline-auth";

describe("pipeline-auth: IDOR guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requireUser returns the session email", async () => {
    mockAuth.mockResolvedValue({ user: { email: "sam@unc.edu" } });
    expect(await requireUser()).toBe("sam@unc.edu");
  });

  it("requireUser returns null when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await requireUser()).toBeNull();
  });

  it("scopedSelect always filters by userId", () => {
    scopedSelect("PipelineEntry", "sam@unc.edu");
    expect(from).toHaveBeenCalledWith("PipelineEntry");
    expect(eq).toHaveBeenCalledWith("userId", "sam@unc.edu");
  });

  it("scopedInsert forces userId onto a single row", () => {
    scopedInsert("Pipeline", "sam@unc.edu", { name: "Funding", kind: "FUNDING" });
    expect(insert).toHaveBeenCalledWith({ name: "Funding", kind: "FUNDING", userId: "sam@unc.edu" });
  });

  it("scopedInsert forces userId onto every row in an array", () => {
    scopedInsert("PipelineEntry", "sam@unc.edu", [{ contactId: "1" }, { contactId: "2" }]);
    expect(insert).toHaveBeenCalledWith([
      { contactId: "1", userId: "sam@unc.edu" },
      { contactId: "2", userId: "sam@unc.edu" },
    ]);
  });

  it("scopedUpdate and scopedDelete always filter by userId", () => {
    scopedUpdate("Pipeline", "sam@unc.edu", { name: "X" });
    expect(updateEq).toHaveBeenCalledWith("userId", "sam@unc.edu");
    scopedDelete("PipelineEntry", "sam@unc.edu");
    expect(deleteEq).toHaveBeenCalledWith("userId", "sam@unc.edu");
  });
});
