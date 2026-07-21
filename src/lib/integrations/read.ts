import "server-only";
import { googleEvents, googleMessages } from "./google";
import { microsoftEvents, microsoftMessages } from "./microsoft";
import { validAccessToken } from "./tokens";
import type { IntegrationProvider } from "./types";

export async function connectedPreview(userId: string, provider: IntegrationProvider) {
  const token = await validAccessToken(userId, provider);
  if (!token) return null;
  const [messages, events] = await Promise.all([
    provider === "google" ? googleMessages(token.accessToken) : microsoftMessages(token.accessToken),
    provider === "google" ? googleEvents(token.accessToken) : microsoftEvents(token.accessToken),
  ]);
  return { messages, events };
}

export async function connectedCalendarContext(userId: string) {
  const providers: IntegrationProvider[] = ["google", "microsoft"];
  const results = await Promise.all(providers.map(async (provider) => {
    try {
      const token = await validAccessToken(userId, provider);
      if (!token) return { provider, status: "not_connected" as const, events: [] };
      const events = provider === "google"
        ? await googleEvents(token.accessToken)
        : await microsoftEvents(token.accessToken);
      return { provider, status: "connected" as const, events };
    } catch {
      return { provider, status: "unavailable" as const, events: [] };
    }
  }));
  return results;
}
