"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

interface FieldEditorProps {
  contactId: string;
  field: "name";
  label: string;
  initialValue: string;
  placeholder?: string;
  /** Fired after a successful PATCH so the page can refresh score/affiliations. */
  onSaved?: () => void;
}

// Trim + collapse inner whitespace + cap, mirroring the route's normalizeField.
function clean(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 160);
}

// Drop the "Name — City, ST" suffix the high-school dataset appends so the
// stored value is just the school name. Shared with the edit-profile modal.
export function stripCitySuffix(v: string): string {
  return v.includes(" — ") ? v.split(" — ")[0] : v;
}

// Inline click-to-edit for the contact NAME in the page header. Pencil shows on
// hover; click swaps the value for a text input. Enter PATCHes
// /api/contacts/[id] and shows the saved value immediately; Esc/blur cancels.
//
// Every OTHER contact field now lives in the Edit Profile modal — this inline
// editor is intentionally limited to the single name field the header renders.
export function FieldEditor({
  contactId,
  field,
  label,
  initialValue,
  placeholder,
  onSaved,
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

  async function save(raw: string) {
    const next = clean(raw);
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
      onSaved?.();
    }
  }

  if (editing) {
    return (
      <p className="flex items-center gap-1.5">
        {label && <span className="text-muted-foreground">{label}: </span>}
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
              save(draft);
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
      {label && <span className="text-muted-foreground">{label}: </span>}
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

// ── ChipField — controlled multi-chip selector (used by the Edit Profile modal) ──
//
// Fully presentational: holds NO fetch state and never persists on its own. The
// parent owns `values` and is notified via `onChange`, so chips added here can
// never be lost by a blur or a tab switch — they live in the modal's local form
// state until the user hits Save. Mirrors the onboarding chip UI: a label with a
// "count/cap" badge, removable accent chips, and a Combobox (or free-text input
// when no `loadOptions`) that hides once the cap is reached.

export function ChipField({
  label,
  values,
  onChange,
  loadOptions,
  placeholder,
  cap,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  /** Typeahead dataset; omit for a free-text chip input (e.g. past employers). */
  loadOptions?: () => Promise<string[]>;
  placeholder?: string;
  cap: number;
}) {
  // Remount the Combobox after each add so its internal input clears, matching
  // onboarding's addSkill behavior.
  const [addKey, setAddKey] = useState(0);
  const [draft, setDraft] = useState("");
  const freeRef = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const chip = clean(raw);
    setAddKey((k) => k + 1);
    setDraft("");
    if (!chip || values.includes(chip) || values.length >= cap) return;
    onChange([...values, chip]);
  }

  function remove(chip: string) {
    onChange(values.filter((c) => c !== chip));
  }

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
          {values.length}/{cap}
        </span>
      </label>
      {values.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {values.map((chip) => (
            <span
              key={chip}
              className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[12px] font-bold text-accent-teal"
            >
              {chip}
              <button
                type="button"
                onClick={() => remove(chip)}
                className="text-accent-teal/60 hover:text-accent-teal"
                aria-label={`Remove ${chip}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {values.length < cap &&
        (loadOptions ? (
          <Combobox
            key={addKey}
            value=""
            onSelect={add}
            loadOptions={loadOptions}
            placeholder={placeholder}
            ariaLabel={`Add ${label}`}
            inputClassName="h-9 bg-muted text-sm"
          />
        ) : (
          <input
            ref={freeRef}
            type="text"
            value={draft}
            maxLength={160}
            placeholder={placeholder}
            className="h-9 w-full border border-input bg-muted px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-teal focus:outline-none"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              }
            }}
          />
        ))}
    </div>
  );
}
