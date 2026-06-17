"use client";

// DM inbox: dense list of the user's conversations, newest-activity first.
// Each row links to the thread view. Data comes from GET /api/kith/threads.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface DmThread {
  threadId: string;
  other: { email: string; name: string };
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
}

function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal">
      {initials}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MessagesClient() {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch("/api/kith/threads");
    if (res.ok) setThreads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Messages
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Direct messages with your Kith & Nodes.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-white/[0.06] bg-card px-6 py-12 text-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-[13px] text-muted-foreground">
            No conversations yet — message a friend from your Friends page or a node member.
          </p>
        </div>
      ) : (
        <div className="border border-white/[0.06] bg-card">
          {threads.map((t) => (
            <Link
              key={t.threadId}
              href={`/dashboard/messages/${encodeURIComponent(t.threadId)}`}
              className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.04]"
            >
              <Avatar name={t.other.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">{t.other.name}</span>
                  {t.lastMessage && (
                    <span className="shrink-0 text-[10px] text-muted-foreground/60">
                      {relativeTime(t.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="truncate text-[12px] text-muted-foreground">
                  {t.lastMessage?.body ?? "No messages yet"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
