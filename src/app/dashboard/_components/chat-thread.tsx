"use client";

// Generic presentational chat thread. Mounts the shared useThreadMessages hook
// (Realtime + polling fallback, optimistic send) and renders a scrollable
// message list with a send box. Reused by both Node chat and DMs.

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useThreadMessages, type ThreadType } from "@/lib/kith/use-thread-messages";

export function ChatThread({
  threadType,
  threadId,
  title,
}: {
  threadType: ThreadType;
  threadId: string;
  title?: string;
}) {
  const { messages, send, status } = useThreadMessages(threadType, threadId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    send(body);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col border border-white/[0.06] bg-card">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="truncate text-[12px] font-bold uppercase tracking-wider text-foreground">
          {title ?? "Chat"}
        </div>
        <StatusDot status={status} />
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 py-3">
        {status === "loading" ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-muted-foreground">
            No messages yet. Say something.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-[13px] leading-snug">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-foreground">{m.senderName}</span>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {formatTime(m.createdAt)}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words text-foreground/90">{m.body}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message…"
          className="flex-1 border border-white/[0.12] bg-bg-primary px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="flex items-center gap-1.5 bg-accent-teal px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: ReturnType<typeof useThreadMessages>["status"] }) {
  const live = status === "realtime";
  const label = live ? "Live" : status === "polling" ? "Syncing" : status === "error" ? "Offline" : "…";
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-green-400" : "bg-amber-400"}`} />
      {label}
    </span>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
