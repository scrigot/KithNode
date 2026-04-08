import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GUESS_PATTERNS,
  _resetPatternCache,
  _setPatternCacheEntry,
  findEmail,
  guessEmail,
  hunterDomainPattern,
  hunterEmailFinder,
  renderPattern,
} from "./email-finder";

beforeEach(() => {
  _resetPatternCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderPattern", () => {
  it("renders {first}.{last}", () => {
    expect(renderPattern("{first}.{last}", "Alice", "Johnson")).toBe("alice.johnson");
  });
  it("renders {f}{last}", () => {
    expect(renderPattern("{f}{last}", "Alice", "Johnson")).toBe("ajohnson");
  });
  it("strips non-alpha and lowercases", () => {
    expect(renderPattern("{first}.{last}", "ALICE-MAY", "O'Connor")).toBe("alicemay.oconnor");
  });
  it("returns empty when first or last is empty", () => {
    expect(renderPattern("{first}.{last}", "", "Johnson")).toBe("");
  });
});

describe("DEFAULT_GUESS_PATTERNS", () => {
  it("starts with the most common pattern", () => {
    expect(DEFAULT_GUESS_PATTERNS[0]).toBe("{first}.{last}");
  });
});

describe("guessEmail", () => {
  it("uses cached pattern when provided", () => {
    expect(guessEmail("Alice", "Johnson", "acme.com", "{f}{last}")).toBe("ajohnson@acme.com");
  });
  it("falls back to default when no cached pattern", () => {
    expect(guessEmail("Alice", "Johnson", "acme.com")).toBe("alice.johnson@acme.com");
  });
  it("returns empty when name is missing", () => {
    expect(guessEmail("", "Johnson", "acme.com")).toBe("");
    expect(guessEmail("Alice", "", "acme.com")).toBe("");
  });
});

describe("hunterEmailFinder", () => {
  it("returns parsed hit on a 200 with valid data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { email: "alice.johnson@acme.com", score: 92, pattern: "{first}.{last}" },
        }),
        { status: 200 },
      ),
    );
    const result = await hunterEmailFinder("Alice", "Johnson", "acme.com", "key");
    expect(result).toEqual({
      email: "alice.johnson@acme.com",
      score: 92,
      pattern: "{first}.{last}",
    });
  });

  it("returns null on non-200 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("denied", { status: 401 }));
    expect(await hunterEmailFinder("Alice", "Johnson", "acme.com", "key")).toBeNull();
  });

  it("returns null when API returns empty data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    expect(await hunterEmailFinder("Alice", "Johnson", "acme.com", "key")).toBeNull();
  });

  it("returns null on missing API key", async () => {
    expect(await hunterEmailFinder("Alice", "Johnson", "acme.com", "")).toBeNull();
  });

  it("returns null on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    expect(await hunterEmailFinder("Alice", "Johnson", "acme.com", "key")).toBeNull();
  });
});

describe("hunterDomainPattern", () => {
  it("returns the pattern from a 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { pattern: "{f}{last}" } }), { status: 200 }),
    );
    expect(await hunterDomainPattern("acme.com", "key")).toBe("{f}{last}");
  });
  it("returns null when no pattern in payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    expect(await hunterDomainPattern("acme.com", "key")).toBeNull();
  });
});

describe("findEmail (waterfall)", () => {
  it("returns Hunter result on tier-1 hit and caches the pattern", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { email: "alice.johnson@acme.com", score: 92, pattern: "{first}.{last}" },
        }),
        { status: 200 },
      ),
    );

    const result = await findEmail("Alice Johnson", "acme.com", { hunterApiKey: "key" });
    expect(result).toEqual({
      email: "alice.johnson@acme.com",
      confidence: 0.92,
      source: "hunter_verified",
    });

    // Second contact at the same domain — should hit the pattern cache
    // and skip Hunter entirely. Clear the spy first so we can assert
    // that no NEW fetch happens during the second call.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockClear();
    const second = await findEmail("Bob Builder", "acme.com", { hunterApiKey: "key", skipHunter: true });
    expect(second.source).toBe("pattern_cached");
    expect(second.email).toBe("bob.builder@acme.com");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls through to default pattern guess on Hunter miss", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    const result = await findEmail("Alice Johnson", "acme.com", { hunterApiKey: "key" });
    expect(result.source).toBe("pattern_guess");
    expect(result.email).toBe("alice.johnson@acme.com");
    expect(result.confidence).toBe(0.5);
  });

  it("uses cached pattern when Hunter is disabled", async () => {
    _setPatternCacheEntry("acme.com", "{f}{last}");
    const result = await findEmail("Alice Johnson", "acme.com", { skipHunter: true });
    expect(result.source).toBe("pattern_cached");
    expect(result.email).toBe("ajohnson@acme.com");
  });

  it("returns NO_EMAIL when name has only one token", async () => {
    const result = await findEmail("Madonna", "acme.com");
    expect(result.source).toBe("none");
    expect(result.email).toBe("");
  });

  it("returns NO_EMAIL when domain is empty", async () => {
    const result = await findEmail("Alice Johnson", "");
    expect(result.source).toBe("none");
  });

  it("uses last token as last name (handles middle names)", async () => {
    _setPatternCacheEntry("acme.com", "{first}.{last}");
    const result = await findEmail("Alice Marie Johnson", "acme.com", { skipHunter: true });
    expect(result.email).toBe("alice.johnson@acme.com");
  });
});
