import { NextRequest, NextResponse } from "next/server";
import { URL } from "node:url";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken, verifyOAuthState } from "@/lib/integrations/crypto";
import { exchangeAuthorizationCode, providerProfile } from "@/lib/integrations/providers";
import { isIntegrationProvider } from "@/lib/integrations/types";

function dashboardRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/integrations", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return dashboardRedirect(request, { error: "session_expired" });
  const { provider } = await params;
  if (!isIntegrationProvider(provider)) return dashboardRedirect(request, { error: "unknown_provider" });
  const providerError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");
  if (providerError || !code || !stateValue) {
    return dashboardRedirect(request, { error: providerError || "missing_callback_data" });
  }

  try {
    const state = verifyOAuthState(stateValue);
    if (state.userId !== userId || state.provider !== provider) throw new Error("OAuth state mismatch");
    const tokens = await exchangeAuthorizationCode(provider, code, state.redirectUri);
    const profile = await providerProfile(provider, tokens.accessToken);
    if (!profile.id || !profile.email) throw new Error("Provider profile is incomplete");
    const existing = await prisma.integrationConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    const refreshTokenEncrypted = tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : existing?.refreshTokenEncrypted || "";
    // Ensure a preserved encrypted token is still decryptable before retaining it.
    if (refreshTokenEncrypted && !tokens.refreshToken) decryptToken(refreshTokenEncrypted);
    await prisma.integrationConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        providerAccountId: profile.id,
        email: profile.email,
        accessTokenEncrypted: encryptToken(tokens.accessToken),
        refreshTokenEncrypted,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        status: "connected",
        lastCheckedAt: new Date(),
      },
      update: {
        providerAccountId: profile.id,
        email: profile.email,
        accessTokenEncrypted: encryptToken(tokens.accessToken),
        refreshTokenEncrypted,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        status: "connected",
        lastCheckedAt: new Date(),
        lastError: "",
      },
    });
    return dashboardRedirect(request, { connected: provider });
  } catch (error) {
    console.error(`[integrations] ${provider} callback failed`, error);
    return dashboardRedirect(request, { error: "connection_failed", provider });
  }
}
