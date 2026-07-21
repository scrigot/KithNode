import "server-only";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "./crypto";
import { refreshProviderToken } from "./providers";
import type { IntegrationProvider } from "./types";

export async function validAccessToken(userId: string, provider: IntegrationProvider) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!connection) return null;

  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 5 * 60_000) {
    return { connection, accessToken: decryptToken(connection.accessTokenEncrypted) };
  }
  if (!connection.refreshTokenEncrypted) {
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: "expired", lastError: "Reconnect required" },
    });
    return null;
  }

  try {
    const refreshed = await refreshProviderToken(provider, decryptToken(connection.refreshTokenEncrypted));
    const updated = await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: encryptToken(refreshed.accessToken),
        refreshTokenEncrypted: refreshed.refreshToken
          ? encryptToken(refreshed.refreshToken)
          : connection.refreshTokenEncrypted,
        expiresAt: refreshed.expiresAt,
        scopes: refreshed.scopes,
        status: "connected",
        lastError: "",
      },
    });
    return { connection: updated, accessToken: refreshed.accessToken };
  } catch (error) {
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: "error", lastError: error instanceof Error ? error.message.slice(0, 300) : "Refresh failed" },
    });
    return null;
  }
}
