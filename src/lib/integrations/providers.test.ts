import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { URL } from "node:url";
import { resetServerEnvForTests } from "@/lib/env/server";
import { authorizationUrl, exchangeAuthorizationCode, refreshProviderToken } from "./providers";

const original = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
  process.env.MICROSOFT_CLIENT_ID = "microsoft-client";
  process.env.MICROSOFT_CLIENT_SECRET = "microsoft-secret";
  process.env.MICROSOFT_TENANT_ID = "common";
  resetServerEnvForTests();
});

afterEach(() => {
  process.env = { ...original };
  resetServerEnvForTests();
  vi.restoreAllMocks();
});

describe("connected-account OAuth providers", () => {
  it("requests offline read-only Google access", () => {
    const url = new URL(authorizationUrl("google", "http://localhost/callback", "signed-state"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("gmail.readonly");
    expect(url.searchParams.get("scope")).toContain("calendar.readonly");
    expect(url.searchParams.get("state")).toBe("signed-state");
  });

  it("requests Microsoft delegated mail and calendar scopes", () => {
    const url = new URL(authorizationUrl("microsoft", "http://localhost/callback", "signed-state"));
    expect(url.origin).toBe("https://login.microsoftonline.com");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("scope")).toContain("Mail.Read");
    expect(url.searchParams.get("scope")).toContain("Calendars.Read");
  });

  it("normalizes an authorization-code token response without exposing credentials in errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      access_token: "access-value",
      refresh_token: "refresh-value",
      expires_in: 3600,
      scope: "openid email",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const tokens = await exchangeAuthorizationCode("google", "one-time-code", "http://localhost/callback");
    expect(tokens).toMatchObject({ accessToken: "access-value", refreshToken: "refresh-value", scopes: "openid email" });
    expect(tokens.expiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it("sends offline scopes when refreshing Microsoft tokens", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      access_token: "new-access",
      expires_in: 3600,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await refreshProviderToken("microsoft", "refresh-value");
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("scope")).toContain("offline_access");
  });
});
