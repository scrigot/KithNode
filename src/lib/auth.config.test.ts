import { afterEach, describe, expect, it, vi } from "vitest";
import { authConfig } from "./auth.config";

const authorized = authConfig.callbacks?.authorized as (args: {
  auth: { user?: { email?: string | null } } | null;
  request: { nextUrl: globalThis.URL; method: string };
}) => boolean | Response | Promise<boolean | Response>;

function request(pathname: string, method = "GET") {
  return { nextUrl: new globalThis.URL(`https://kithnode.ai${pathname}`), method };
}

describe("authConfig authorized", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("owner-gates /me in production even when PERSONAL_MODE is off", async () => {
    vi.stubEnv("PERSONAL_MODE", "0");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(await authorized({ auth: null, request: request("/me") })).toBe(false);
    expect(await authorized({ auth: { user: { email: "samrigot@kithnode.ai" } }, request: request("/me") })).toBe(true);
    expect(await authorized({ auth: { user: { email: "other@kithnode.ai" } }, request: request("/me") })).toBe(false);
  });

  it("lets /me fall through to the route 404 outside production when PERSONAL_MODE is off", async () => {
    vi.stubEnv("PERSONAL_MODE", "0");
    vi.stubEnv("VERCEL_ENV", "development");

    expect(await authorized({ auth: null, request: request("/me") })).toBe(true);
  });

  it("allows only the configured owner when /me is enabled in production", async () => {
    vi.stubEnv("PERSONAL_MODE", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ME_USER_EMAIL", "samrigot@kithnode.ai");

    expect(await authorized({ auth: { user: { email: "samrigot@kithnode.ai" } }, request: request("/me/resume") })).toBe(true);
    expect(await authorized({ auth: { user: { email: "other@kithnode.ai" } }, request: request("/me/resume") })).toBe(false);
  });

  it("hides /api/me routes from non-owners when enabled in production", async () => {
    vi.stubEnv("PERSONAL_MODE", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ME_USER_EMAIL", "samrigot@kithnode.ai");

    const response = await authorized({
      auth: { user: { email: "other@kithnode.ai" } },
      request: request("/api/me/resume"),
    });

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(404);
  });

  it("keeps local personal-mode development usable without auth", async () => {
    vi.stubEnv("PERSONAL_MODE", "1");
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("ME_REQUIRE_AUTH", "0");

    expect(await authorized({ auth: null, request: request("/me/resume") })).toBe(true);
  });

  it("lets only extension draft creation reach route-level token authentication", async () => {
    expect(await authorized({ auth: null, request: request("/api/research/drafts", "POST") })).toBe(true);

    const listResponse = await authorized({ auth: null, request: request("/api/research/drafts") });
    expect(listResponse).toBeInstanceOf(Response);
    expect((listResponse as Response).status).toBe(401);

    const commitResponse = await authorized({ auth: null, request: request("/api/research/drafts/draft-1/commit", "POST") });
    expect(commitResponse).toBeInstanceOf(Response);
    expect((commitResponse as Response).status).toBe(401);
  });
});
