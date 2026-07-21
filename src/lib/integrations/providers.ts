import "server-only";
import { requireServerEnv, serverEnv } from "@/lib/env/server";
import type { IntegrationProvider, OAuthTokens, ProviderProfile } from "./types";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
];
const MICROSOFT_SCOPES = ["openid", "profile", "email", "offline_access", "User.Read", "Mail.Read", "Calendars.Read"];

function abortSignal() {
  return AbortSignal.timeout(10_000);
}

function googleCredentials() {
  const env = serverEnv();
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google integration credentials are not configured");
  return { clientId, clientSecret };
}

function microsoftCredentials() {
  const env = serverEnv();
  const clientId = env.MICROSOFT_CLIENT_ID || process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = env.MICROSOFT_CLIENT_SECRET || process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  const tenant = env.MICROSOFT_TENANT_ID || "common";
  if (!clientId || !clientSecret) throw new Error("Microsoft integration credentials are not configured");
  return { clientId, clientSecret, tenant };
}

export function providerConfigured(provider: IntegrationProvider) {
  try {
    if (provider === "google") googleCredentials();
    else microsoftCredentials();
    requireServerEnv("OAUTH_TOKEN_ENCRYPTION_KEY", "AUTH_SECRET");
    return true;
  } catch {
    return false;
  }
}

export function authorizationUrl(provider: IntegrationProvider, redirectUri: string, state: string) {
  if (provider === "google") {
    const { clientId } = googleCredentials();
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      state,
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
  }
  const { clientId, tenant } = microsoftCredentials();
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${query}`;
}

async function tokenRequest(url: string, body: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: abortSignal(),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof data.access_token !== "string") {
    throw new Error(`OAuth token exchange failed (${response.status})`);
  }
  return data;
}

function normalizeTokens(data: Record<string, unknown>, fallbackScopes: string[]): OAuthTokens {
  const expiresIn = Number(data.expires_in || 0);
  return {
    accessToken: String(data.access_token),
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1_000) : undefined,
    scopes: typeof data.scope === "string" ? data.scope : fallbackScopes.join(" "),
  };
}

export async function exchangeAuthorizationCode(
  provider: IntegrationProvider,
  code: string,
  redirectUri: string,
) {
  if (provider === "google") {
    const { clientId, clientSecret } = googleCredentials();
    const data = await tokenRequest("https://oauth2.googleapis.com/token", new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }));
    return normalizeTokens(data, GOOGLE_SCOPES);
  }
  const { clientId, clientSecret, tenant } = microsoftCredentials();
  const data = await tokenRequest(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: MICROSOFT_SCOPES.join(" "),
  }));
  return normalizeTokens(data, MICROSOFT_SCOPES);
}

export async function refreshProviderToken(provider: IntegrationProvider, refreshToken: string) {
  if (provider === "google") {
    const { clientId, clientSecret } = googleCredentials();
    const data = await tokenRequest("https://oauth2.googleapis.com/token", new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }));
    return normalizeTokens(data, GOOGLE_SCOPES);
  }
  const { clientId, clientSecret, tenant } = microsoftCredentials();
  const data = await tokenRequest(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: MICROSOFT_SCOPES.join(" "),
  }));
  return normalizeTokens(data, MICROSOFT_SCOPES);
}

async function authorizedJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: abortSignal(),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Provider API returned ${response.status}`);
  return data;
}

export async function providerProfile(provider: IntegrationProvider, accessToken: string): Promise<ProviderProfile> {
  if (provider === "google") {
    const data = await authorizedJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken);
    return { id: String(data.sub || ""), email: String(data.email || ""), name: String(data.name || "") };
  }
  const data = await authorizedJson("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", accessToken);
  return {
    id: String(data.id || ""),
    email: String(data.mail || data.userPrincipalName || ""),
    name: String(data.displayName || ""),
  };
}

export { authorizedJson };
