"use client";

import { useEffect, useState } from "react";

type ActivityEvent = {
  id: string;
  roomId: string;
  roomName: string;
  roomSlug: string;
  kind: string;
  summary: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 5000;
const MAX_VISIBLE = 5;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ActivityBar() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    async function tick() {
      try {
        const res = await globalThis.fetch("/api/office/events");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as { events: ActivityEvent[] };
        if (!cancelled) {
          setEvents(d.events.slice(0, MAX_VISIBLE));
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "fetch error");
        }
      } finally {
        if (!cancelled) {
          timer = globalThis.setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) globalThis.clearTimeout(timer);
    };
  }, []);

  const hasEvents = events.length > 0;

  return (
    <div className="sticky top-0 z-40 flex h-[49px] items-center gap-4 border-b border-white/[0.06] bg-[#08111F] px-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse bg-accent-teal" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
          ACTIVITY
        </span>
      </div>
      <div className="flex flex-1 items-center gap-4 overflow-hidden font-mono text-[10px] tabular-nums text-muted-foreground">
        {err ? (
          <span className="text-red-400/80">err: {err}</span>
        ) : !hasEvents ? (
          <span className="text-muted-foreground/60">
            No agent activity yet — walk into a room.
          </span>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 truncate">
              <span
                className={
                  e.kind === "invoke_started"
                    ? "inline-block h-1.5 w-1.5 bg-amber-400"
                    : e.kind === "invoke_completed"
                      ? "inline-block h-1.5 w-1.5 bg-accent-teal"
                      : "inline-block h-1.5 w-1.5 bg-muted-foreground"
                }
              />
              <span className="font-bold uppercase tracking-wider text-foreground">
                {e.roomName}
              </span>
              <span className="truncate text-muted-foreground">
                {stripRoomNamePrefix(e.summary, e.roomName)}
              </span>
              <span className="text-muted-foreground/40">
                {timeAgo(e.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function stripRoomNamePrefix(summary: string, roomName: string): string {
  const prefix = `${roomName}: `;
  if (summary.startsWith(prefix)) return summary.slice(prefix.length);
  return summary;
}
