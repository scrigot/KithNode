import "server-only";
import { authorizedJson } from "./providers";
import type { ConnectedEvent, ConnectedMessage } from "./types";

const text = (value: unknown, max = 500) => typeof value === "string" ? value.slice(0, max) : "";

export async function microsoftMessages(accessToken: string): Promise<ConnectedMessage[]> {
  const query = new URLSearchParams({
    "$top": "8",
    "$select": "id,subject,from,receivedDateTime,bodyPreview,webLink",
    "$orderby": "receivedDateTime desc",
  });
  const data = await authorizedJson(`https://graph.microsoft.com/v1.0/me/messages?${query}`, accessToken);
  const rows = Array.isArray(data.value) ? data.value as Array<Record<string, unknown>> : [];
  return rows.map((row) => {
    const from = row.from as { emailAddress?: { name?: unknown; address?: unknown } } | undefined;
    const sender = from?.emailAddress;
    return {
      id: text(row.id, 300),
      subject: text(row.subject, 300) || "(no subject)",
      from: [text(sender?.name, 200), text(sender?.address, 320)].filter(Boolean).join(" <") + (sender?.name && sender?.address ? ">" : ""),
      receivedAt: text(row.receivedDateTime, 80),
      snippet: text(row.bodyPreview, 500),
      webUrl: text(row.webLink, 1_000) || undefined,
    };
  });
}

export async function microsoftEvents(accessToken: string): Promise<ConnectedEvent[]> {
  const query = new URLSearchParams({
    startDateTime: new Date().toISOString(),
    endDateTime: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    "$top": "20",
    "$select": "id,subject,start,end,attendees,location,webLink",
    "$orderby": "start/dateTime",
  });
  const data = await authorizedJson(`https://graph.microsoft.com/v1.0/me/calendarView?${query}`, accessToken);
  const rows = Array.isArray(data.value) ? data.value as Array<Record<string, unknown>> : [];
  return rows.map((row) => {
    const start = row.start as { dateTime?: unknown } | undefined;
    const end = row.end as { dateTime?: unknown } | undefined;
    const location = row.location as { displayName?: unknown } | undefined;
    const attendees = Array.isArray(row.attendees)
      ? (row.attendees as Array<{ emailAddress?: { address?: unknown } }>).map((attendee) => text(attendee.emailAddress?.address, 320)).filter(Boolean).slice(0, 30)
      : [];
    return {
      id: text(row.id, 300),
      title: text(row.subject, 300) || "Untitled event",
      start: text(start?.dateTime, 80),
      end: text(end?.dateTime, 80),
      attendees,
      location: text(location?.displayName, 300),
      webUrl: text(row.webLink, 1_000) || undefined,
    };
  });
}
