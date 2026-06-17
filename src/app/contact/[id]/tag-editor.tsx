"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";

interface TagEditorProps {
  contactId: string;
  initialTags: string[];
}

export function TagEditor({ contactId, initialTags }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addTag(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag) return;
    setError(null);

    const res = await fetch(`/api/contacts/${contactId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });

    if (res.ok) {
      if (!tags.includes(tag)) {
        setTags((prev) => [...prev, tag]);
      }
      setInput("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add tag");
    }
  }

  async function removeTag(tag: string) {
    setError(null);
    const res = await fetch(`/api/contacts/${contactId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });

    if (res.ok) {
      setTags((prev) => prev.filter((t) => t !== tag));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to remove tag");
    }
  }

  return (
    <div className="border border-border bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        TAGS
      </h3>

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="gap-1 text-xs bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 leading-none text-zinc-400 hover:text-zinc-100"
                aria-label={`Remove tag ${tag}`}
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          maxLength={40}
          placeholder="Add tag..."
          className="h-6 flex-1 border border-border bg-background px-2 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-accent-blue focus:outline-none"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          className="border border-border bg-background px-2 text-[10px] text-muted-foreground hover:border-accent-blue hover:text-accent-blue"
        >
          ADD
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-[10px] text-destructive">{error}</p>
      )}
    </div>
  );
}
