"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

interface FieldEditorProps {
  contactId: string;
  field: "education" | "location" | "highSchool" | "clubs" | "passions";
  label: string;
  initialValue: string;
  placeholder?: string;
}

// Inline click-to-edit for one editable contact field. Pencil shows on hover;
// click swaps the value for an input. Enter PATCHes /api/contacts/[id] and
// shows the saved value immediately; Esc cancels. Mirrors tag-editor's fetch
// shape and the page's dark dense styling.
export function FieldEditor({
  contactId,
  field,
  label,
  initialValue,
  placeholder,
}: FieldEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  async function save() {
    const next = draft.trim().replace(/\s+/g, " ").slice(0, 160);
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    setSaving(false);
    if (res.ok) {
      setValue(next);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <p className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{label}: </span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={160}
          disabled={saving}
          placeholder={placeholder}
          className="h-5 flex-1 border border-border bg-background px-1.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-accent-blue focus:outline-none"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={cancel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        />
      </p>
    );
  }

  return (
    <p className="group flex items-center gap-1">
      <span className="text-muted-foreground">{label}: </span>
      <button
        type="button"
        onClick={startEdit}
        className="inline-flex items-center gap-1 text-left text-foreground hover:text-accent-blue"
        aria-label={`Edit ${label}`}
      >
        <span>
          {value || (
            <span className="text-muted-foreground/50">{placeholder ?? "Add"}</span>
          )}
        </span>
        <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    </p>
  );
}
