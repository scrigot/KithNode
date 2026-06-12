import { describe, it, expect, vi } from "vitest";

// The route module imports the AI SDK, the gateway, auth (next-auth → next/server),
// and other module-level deps at load. Mock them all so we can import the PURE
// validateTrackRole helper without pulling any runtime. We assert only on the
// taxonomy validation — no route handler, no model call, no session.
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@ai-sdk/gateway", () => ({ gateway: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));
vi.mock("@/lib/rescore-contact", () => ({
  rescoreContact: vi.fn(),
  loadContactTags: vi.fn(),
}));
vi.mock("@/lib/subscription", () => ({ requireSubscription: vi.fn() }));
vi.mock("@/lib/enrich/pdl", () => ({
  fetchPdlProfile: vi.fn(),
  shouldAdoptPdlName: vi.fn(),
}));
vi.mock("@/lib/deduce-hometown", () => ({ deduceHometown: vi.fn() }));

import { validateTrackRole } from "./route";

describe("enrich validateTrackRole — taxonomy allow-list", () => {
  it("accepts a valid track + role pair", () => {
    expect(validateTrackRole("AI", "AI Engineer")).toEqual({
      track: "AI",
      role: "AI Engineer",
    });
  });

  it("accepts a valid track with empty role", () => {
    expect(validateTrackRole("Finance", "")).toEqual({ track: "Finance", role: "" });
  });

  it("rejects an off-taxonomy TRACK -> both empty", () => {
    expect(validateTrackRole("Crypto", "Degen")).toEqual({ track: "", role: "" });
    expect(validateTrackRole("finance", "Investment Banking")).toEqual({
      track: "",
      role: "",
    });
  });

  it("rejects an off-taxonomy ROLE but keeps the valid track", () => {
    expect(validateTrackRole("Finance", "Crypto Trader")).toEqual({
      track: "Finance",
      role: "",
    });
  });

  it("rejects a role that belongs to a DIFFERENT track (mismatch)", () => {
    // "AI Engineer" is an AI role, not a Finance role.
    expect(validateTrackRole("Finance", "AI Engineer")).toEqual({
      track: "Finance",
      role: "",
    });
  });

  it("coerces nullish input to empty", () => {
    expect(validateTrackRole(null, undefined)).toEqual({ track: "", role: "" });
  });
});
