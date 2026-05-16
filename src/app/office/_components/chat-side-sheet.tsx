"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import type { OfficeRoom } from "./types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export function ChatSideSheet({
  room,
  onClose,
}: {
  room: OfficeRoom | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load history when a room opens.
  useEffect(() => {
    if (!room) {
      setMessages([]);
      setStreamingText("");
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setMessages([]);
    setStreamingText("");
    setLoadError(null);
    globalThis
      .fetch(`/api/office/rooms/${room.id}/messages`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { messages: Message[] }) => {
        if (cancelled) return;
        setMessages(d.messages || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  // Auto-scroll on new content.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, streaming]);

  if (!room) return null;

  async function handleSend() {
    if (!room || !input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    const optimisticUser: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await globalThis.fetch(
        `/api/office/rooms/${room.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        },
      );
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: split by \n\n, each block starts with `data: `.
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as
              | { type: "token"; content: string }
              | { type: "done"; finalText: string }
              | { type: "error"; message: string };
            if (evt.type === "token") {
              assembled += evt.content;
              setStreamingText(assembled);
            } else if (evt.type === "done") {
              assembled = evt.finalText || assembled;
              setStreamingText(assembled);
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch {
            // Ignore malformed chunk.
          }
        }
      }

      const finalAssistant: Message = {
        id: `local-asst-${Date.now()}`,
        role: "assistant",
        content: assembled,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, finalAssistant]);
      setStreamingText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stream error";
      const errAssistant: Message = {
        id: `local-err-${Date.now()}`,
        role: "assistant",
        content: `[error] ${message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errAssistant]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Side panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-white/[0.06] bg-bg-secondary shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] bg-[#0B1424] px-4 py-3">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              ROOM · FLOOR {room.floor}
            </div>
            <div className="mt-0.5 font-heading text-base font-bold text-foreground">
              {room.name}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-teal">
              {room.role.replace(/_/g, " ")} ·{" "}
              {room.adapterType === "anthropic_sdk" ? "LIVE" : "STUB"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        >
          {loadError ? (
            <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
              {loadError}
            </div>
          ) : null}
          {messages.length === 0 && !streaming ? (
            <div className="py-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/40">
              No messages yet. Say hi.
            </div>
          ) : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {streaming ? (
            <MessageBubble
              role="assistant"
              content={streamingText || "..."}
              streaming
            />
          ) : null}
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.06] bg-[#0B1424] px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              placeholder={
                streaming
                  ? "Streaming response..."
                  : `Talk to ${room.name.toLowerCase()}...`
              }
              className="flex-1 border border-white/[0.08] bg-bg-primary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:border-accent-teal focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="border border-accent-teal/40 bg-accent-teal px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0A1628] transition-opacity disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className={role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          role === "user"
            ? "max-w-[85%] border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground"
            : "max-w-[85%] border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground"
        }
      >
        <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {role === "user" ? "YOU" : "AGENT"}
          {streaming ? " · streaming" : ""}
        </div>
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
