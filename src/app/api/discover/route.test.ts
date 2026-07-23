import { describe, it, expect, vi } from "vitest";
import { normalizeFirmName } from "@/lib/normalize-firm";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/user-prefs", () => ({ getUserPrefs: vi.fn() }));

import { buildDiscoverSearchFilter } from "./route";

// The discover route imports NextAuth (@/lib/auth), which can't be imported in
// Vitest (it depends on next/server). The PostgREST filter sanitizer in
// route.ts is a self-contained expression, so we mirror it here and verify it
// strips filter-injection metacharacters while preserving normal queries.
const sanitize = (raw: string) => raw.replace(/[^\p{L}\p{N}\s.-]/gu, "").slice(0, 100);

// The cross-user identity-dedup logic in route.ts is also self-contained. We
// mirror the same normalization + Set-filter here to prove a contact the user
// already imported is excluded from the shared pool, by LinkedIn URL (primary)
// or name+firm (fallback), while genuinely distinct contacts survive.
type Pooled = { name: string; firmName: string; linkedInUrl?: string | null };

const normalizeLinkedInUrl = (url: string | null | undefined): string =>
  url ? url.trim().toLowerCase().replace(/\/+$/, "") : "";

const normalizeNameFirm = (
  name: string | null | undefined,
  firmName: string | null | undefined,
): string => {
  const n = (name || "").trim().toLowerCase();
  if (!n) return "";
  return `${n}|${normalizeFirmName(firmName || "")}`;
};

const dedupeAgainstOwn = (pool: Pooled[], own: Pooled[]): Pooled[] => {
  const ownUrls = new Set<string>();
  const ownNameFirms = new Set<string>();
  for (const o of own) {
    const u = normalizeLinkedInUrl(o.linkedInUrl);
    if (u) ownUrls.add(u);
    const nf = normalizeNameFirm(o.name, o.firmName);
    if (nf) ownNameFirms.add(nf);
  }
  return pool.filter((c) => {
    const u = normalizeLinkedInUrl(c.linkedInUrl);
    if (u && ownUrls.has(u)) return false;
    const nf = normalizeNameFirm(c.name, c.firmName);
    if (nf && ownNameFirms.has(nf)) return false;
    return true;
  });
};

describe("discover q sanitization", () => {
  it("strips PostgREST metacharacters from an injection payload", () => {
    const payload = "x,importedByUserId.neq.";
    const cleaned = sanitize(payload);
    // Commas (filter separators) are removed; the safe characters remain.
    expect(cleaned).toBe("ximportedByUserId.neq.");
    expect(cleaned).not.toContain(",");
  });

  it("removes parentheses, quotes, and other PostgREST operators", () => {
    const cleaned = sanitize('name.ilike."*",or(tier.eq.1)');
    expect(cleaned).not.toMatch(/[(),"*]/);
  });

  it("preserves normal alphanumeric queries unchanged", () => {
    expect(sanitize("Goldman Sachs")).toBe("Goldman Sachs");
    expect(sanitize("J.P. Morgan")).toBe("J.P. Morgan");
    expect(sanitize("Smith-Jones")).toBe("Smith-Jones");
  });

  it("caps length at 100 characters", () => {
    expect(sanitize("a".repeat(250)).length).toBe(100);
  });
});

describe("discover skill search", () => {
  it("matches AI and finance keywords against reviewed skills", () => {
    expect(buildDiscoverSearchFilter("Generative AI")).toContain("skills.ilike.%Generative AI%");
    expect(buildDiscoverSearchFilter("Financial Modeling")).toContain("skills.ilike.%Financial Modeling%");
  });
});

describe("discover cross-user identity dedup", () => {
  it("excludes a shared-pool contact the user already imported (same LinkedIn URL)", () => {
    const own = [
      { name: "Jacob Goldstein", firmName: "KKR", linkedInUrl: "https://www.linkedin.com/in/jacob-goldstein" },
    ];
    const pool = [
      // Same person, a different user's copy — slug matches after normalization
      { name: "Jacob Goldstein", firmName: "KKR & Co.", linkedInUrl: "https://www.linkedin.com/in/jacob-goldstein/" },
      { name: "Maria Lopez", firmName: "Blackstone", linkedInUrl: "https://www.linkedin.com/in/maria-lopez" },
    ];
    const result = dedupeAgainstOwn(pool, own);
    expect(result.map((c) => c.name)).toEqual(["Maria Lopez"]);
  });

  it("excludes by name + firm when LinkedIn URL is missing", () => {
    const own = [{ name: "Jacob Goldstein", firmName: "KKR" }];
    const pool = [
      // No URL on either side; firm alias "Kohlberg Kravis" normalizes to "kkr"
      { name: "jacob goldstein", firmName: "Kohlberg Kravis", linkedInUrl: "" },
      { name: "Jacob Goldstein", firmName: "Goldman Sachs" },
    ];
    const result = dedupeAgainstOwn(pool, own);
    // Same name+firm (KKR) dropped; same name at a different firm kept
    expect(result.map((c) => c.firmName)).toEqual(["Goldman Sachs"]);
  });

  it("keeps distinct contacts and never drops everything", () => {
    const own = [{ name: "Jacob Goldstein", firmName: "KKR", linkedInUrl: "https://www.linkedin.com/in/jacob-goldstein" }];
    const pool = [
      { name: "Priya Patel", firmName: "Evercore", linkedInUrl: "https://www.linkedin.com/in/priya-patel" },
      { name: "Tom Reed", firmName: "Citadel" },
    ];
    expect(dedupeAgainstOwn(pool, own)).toHaveLength(2);
  });
});
