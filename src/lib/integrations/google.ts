import "server-only";
import { authorizedJson } from "./providers";
import type { ConnectedEvent, ConnectedMessage } from "./types";

const text = (value: unknown, max = 500) => typeof value === "string" ? value.slice(0, max) : "";

export async function googleMessages(accessToken: string): Promise<ConnectedMessage[]> {
  const list = await authorizedJson(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=newer_than%3A30d",
    accessToken,
  );
  const rows = Array.isArray(list.messages) ? list.messages.slice(0, 8) as Array<{ id?: unknown }> : [];
  return Promise.all(rows.map(async (row) => {
    const id = text(row.id, 200);
    const message = await authorizedJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      accessToken,
    );
    const payload = message.payload as { headers?: Array<{ name?: string; value?: string }> } | undefined;
    const headers = payload?.headers ?? [];
    const header = (name: string) => text(headers.find((item) => item.name?.toLowerCase() === name)?.value, 500);
    return {
      id,
      subject: header("subject") || "(no subject)",
      from: header("from"),
      receivedAt: header("date"),
      snippet: text(message.snippet, 500),
      webUrl: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}`,
    };
  }));
}

export async function googleEvents(accessToken: string): Promise<ConnectedEvent[]> {
  const query = new URLSearchParams({
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });
  const data = await authorizedJson(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, accessToken);
  const items = Array.isArray(data.items) ? data.items as Array<Record<string, unknown>> : [];
  return items.map((item) => {
    const start = item.start as { dateTime?: string; date?: string } | undefined;
    const end = item.end as { dateTime?: string; date?: string } | undefined;
    const attendees = Array.isArray(item.attendees)
      ? (item.attendees as Array<{ email?: unknown }>).map((attendee) => text(attendee.email, 320)).filter(Boolean).slice(0, 30)
      : [];
    return {
      id: text(item.id, 200),
      title: text(item.summary, 300) || "Untitled event",
      start: text(start?.dateTime || start?.date, 80),
      end: text(end?.dateTime || end?.date, 80),
      attendees,
      location: text(item.location, 300),
      webUrl: text(item.htmlLink, 1_000) || undefined,
    };
  });
}
