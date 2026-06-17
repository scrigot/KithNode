"use client";

// Shared messaging hook the chat UIs mount. Loads history, then tries Realtime
// (private per-user topic 'kith:user:{myEmail}'); if Realtime can't be set up
// (no JWT secret server-side, or the channel errors) it falls back to short
// polling. Optimistic send. Designed to never throw to the UI.

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

export type ThreadType = "dm" | "node";

export interface ThreadMessage {
  id: string;
  threadType: ThreadType;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export type ThreadStatus = "loading" | "realtime" | "polling" | "error";

const POLL_MS = 3000;

/** Merge new rows into existing, de-duped by id, kept in createdAt order. */
function mergeMessages(prev: ThreadMessage[], incoming: ThreadMessage[]): ThreadMessage[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function useThreadMessages(threadType: ThreadType, threadId: string) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [status, setStatus] = useState<ThreadStatus>("loading");

  // Latest createdAt cursor for the polling fallback. Ref (not state) so the
  // poll loop reads the freshest value without re-subscribing.
  const lastAtRef = useRef<string | null>(null);

  const apply = useCallback((incoming: ThreadMessage[]) => {
    setMessages((prev) => {
      const next = mergeMessages(prev, incoming);
      const newest = next[next.length - 1];
      if (newest) lastAtRef.current = newest.createdAt;
      return next;
    });
  }, []);

  // History load — runs on thread change.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessages([]);
    lastAtRef.current = null;

    (async () => {
      try {
        const res = await fetch(
          `/api/kith/messages?threadType=${threadType}&threadId=${encodeURIComponent(threadId)}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const history = (await res.json()) as ThreadMessage[];
        if (cancelled) return;
        apply(history);
      } catch {
        // Non-fatal: an empty thread or transient error still lets send/poll work.
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadType, threadId, apply]);

  // Realtime (with polling fallback) — runs on thread change.
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let client: SupabaseClient | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const since = lastAtRef.current;
        const res = await fetch(
          `/api/kith/messages?threadType=${threadType}&threadId=${encodeURIComponent(threadId)}` +
            (since ? `&since=${encodeURIComponent(since)}` : ""),
        );
        if (!res.ok) return;
        const rows = (await res.json()) as ThreadMessage[];
        if (!cancelled && rows.length) apply(rows);
      } catch {
        // swallow — next tick retries
      }
    };

    const startPolling = () => {
      if (cancelled || pollTimer) return;
      setStatus("polling");
      pollTimer = setInterval(poll, POLL_MS);
    };

    (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Mint a Realtime token. 503 (secret unconfigured) or any failure → poll.
      let token: string | null = null;
      let myEmail: string | null = null;
      try {
        const res = await fetch("/api/kith/realtime-token", { method: "POST" });
        if (res.ok) {
          const json = (await res.json()) as { token?: string };
          token = json.token ?? null;
          // The token's `email` claim is the per-user topic suffix; decode it.
          if (token) myEmail = decodeEmailClaim(token);
        }
      } catch {
        token = null;
      }

      if (cancelled) return;
      if (!token || !myEmail || !url || !anon) {
        startPolling();
        return;
      }

      try {
        client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
        client.realtime.setAuth(token);
        channel = client
          .channel(`kith:user:${myEmail}`, { config: { private: true } })
          .on("broadcast", { event: "msg" }, (payload) => {
            const msg = payload.payload as ThreadMessage | undefined;
            // We subscribe to ALL of our messages (every thread); keep only this thread's.
            if (msg && msg.threadType === threadType && msg.threadId === threadId) apply([msg]);
          })
          .subscribe((s) => {
            if (cancelled) return;
            if (s === "SUBSCRIBED") setStatus("realtime");
            else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") startPolling();
          });
      } catch {
        startPolling();
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (channel && client) client.removeChannel(channel);
    };
  }, [threadType, threadId, apply]);

  const send = useCallback(
    async (bodyRaw: string) => {
      const body = bodyRaw.trim();
      if (!body) return;

      // Optimistic append — replaced/de-duped by the real row (server id) on
      // the POST response or the realtime echo.
      const tempId = `temp-${Date.now()}`;
      const optimistic: ThreadMessage = {
        id: tempId,
        threadType,
        threadId,
        senderId: "",
        senderName: "You",
        body,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => mergeMessages(prev, [optimistic]));

      try {
        const res = await fetch("/api/kith/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadType, threadId, body }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const real = (await res.json()) as ThreadMessage;
        // Drop the optimistic placeholder, add the durable row.
        setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== tempId), [real]));
      } catch {
        // Roll back the optimistic message on failure.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [threadType, threadId],
  );

  return { messages, send, status };
}

/** Decode the `email` claim from a JWT without verifying (we only need the topic). */
function decodeEmailClaim(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}
