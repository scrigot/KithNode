"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

interface FieldEditorProps {
  contactId: string;
  field:
    | "name"
    | "education"
    | "location"
    | "hometown"
    | "highSchool"
    | "clubs"
    | "passions"
    | "greekOrg"
    | "title"
    | "firmName"
    | "university"
    | "major"
    | "minor"
    | "skills"
    | "pastFirms";
  label: string;
  initialValue: string;
  placeholder?: string;
  /** Fired after a successful PATCH so the page can refresh score/affiliations. */
  onSaved?: () => void;
  /**
   * "plain" (default): bare text input.
   * "options": typeahead Combobox over `loadOptions`; free text still allowed.
   * "multi-chip": removable chips parsed from a ", "-joined value; add via the
   *   Combobox, capped at 5; saved back as a ", "-joined string.
   */
  mode?: "plain" | "options" | "multi-chip";
  /** Required for "options" mode — resolves the typeahead dataset. Optional for
   * "multi-chip": when omitted, chips are added via a free-text input. */
  loadOptions?: () => Promise<string[]>;
  /** Strip a " — City, ST" display suffix before saving (high-school dataset). */
  stripCitySuffix?: boolean;
  /** Max chips in "multi-chip" mode. Defaults to 5 (clubs); skills passes 12. */
  maxChips?: number;
}

const DEFAULT_MAX_CHIPS = 5;

// Trim + collapse inner whitespace + cap, mirroring the route's normalizeField.
function clean(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 160);
}

// Drop the "Name — City, ST" suffix the high-school dataset appends, matching
// the settings page so the stored value is just the school name.
function stripSuffix(v: string): string {
  return v.includes(" — ") ? v.split(" — ")[0] : v;
}

// Inline click-to-edit for one editable contact field. Pencil shows on hover;
// click swaps the value for an editor. Enter/select PATCHes /api/contacts/[id]
// and shows the saved value immediately; Esc cancels. Mirrors tag-editor's
// fetch shape and the page's dark dense styling.
//
// In "options" mode the editor is a typeahead Combobox so the saved value is
// canonical (e.g. "Chi Phi", not "chi phi frat"), which is what the affiliation
// matchers key on. In "multi-chip" mode the value is a ", "-joined list shown
// as removable chips, added via the same Combobox.
export function FieldEditor({
  contactId,
  field,
  label,
  initialValue,
  placeholder,
  onSaved,
  mode = "plain",
  loadOptions,
  stripCitySuffix,
  maxChips,
}: FieldEditorProps) {
  if (mode === "multi-chip") {
    return (
      <MultiChipEditor
        contactId={contactId}
        field={field}
        label={label}
        initialValue={initialValue}
        placeholder={placeholder}
        onSaved={onSaved}
        loadOptions={loadOptions}
        maxChips={maxChips}
      />
    );
  }
  return (
    <SingleValueEditor
      contactId={contactId}
      field={field}
      label={label}
      initialValue={initialValue}
      placeholder={placeholder}
      onSaved={onSaved}
      mode={mode}
      loadOptions={loadOptions}
      stripCitySuffix={stripCitySuffix}
    />
  );
}

// ── Single value (plain input OR options Combobox) ──────────────────────────────

function SingleValueEditor({
  contactId,
  field,
  label,
  initialValue,
  placeholder,
  onSaved,
  mode,
  loadOptions,
  stripCitySuffix,
}: Required<Pick<FieldEditorProps, "contactId" | "field" | "label" | "initialValue" | "mode">> &
  Pick<FieldEditorProps, "placeholder" | "loadOptions" | "stripCitySuffix" | "onSaved">) {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && mode === "plain") inputRef.current?.focus();
  }, [editing, mode]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  async function save(raw: string) {
    const next = clean(stripCitySuffix ? stripSuffix(raw) : raw);
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
    if (mode === "options" && loadOptions) {
      return (
        <p className="flex items-center gap-1.5">
          {label && <span className="text-muted-foreground">{label}: </span>}
          <Combobox
            value={draft}
            onSelect={(v) => save(v)}
            loadOptions={loadOptions}
            placeholder={placeholder}
            ariaLabel={`Edit ${label}`}
            className="flex-1"
            inputClassName="h-5 px-1.5 text-[10px] bg-background border-border focus:border-accent-blue"
          />
        </p>
      );
    }
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

// ── Multi-chip (clubs) ──────────────────────────────────────────────────────────

function parseChips(raw: string, max: number): string[] {
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, max);
}

function MultiChipEditor({
  contactId,
  field,
  label,
  initialValue,
  placeholder,
  onSaved,
  loadOptions,
  maxChips = DEFAULT_MAX_CHIPS,
}: Required<Pick<FieldEditorProps, "contactId" | "field" | "label" | "initialValue">> &
  Pick<FieldEditorProps, "placeholder" | "loadOptions" | "onSaved" | "maxChips">) {
  const [chips, setChips] = useState<string[]>(() => parseChips(initialValue, maxChips));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && !loadOptions) inputRef.current?.focus();
  }, [adding, loadOptions]);

  async function persist(next: string[]) {
    setSaving(true);
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next.join(", ") }),
    });
    setSaving(false);
    if (res.ok) {
      setChips(next);
      onSaved?.();
    }
  }

  function addChip(raw: string) {
    const chip = clean(raw);
    setDraft("");
    if (!chip || chips.includes(chip) || chips.length >= maxChips) {
      setAdding(false);
      return;
    }
    void persist([...chips, chip]);
    setAdding(false);
  }

  function removeChip(chip: string) {
    void persist(chips.filter((c) => c !== chip));
  }

  return (
    <p className="group flex flex-wrap items-center gap-1">
      {label && <span className="text-muted-foreground">{label}: </span>}
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center gap-1 border border-border bg-background px-1 leading-none text-foreground"
        >
          {chip}
          <button
            type="button"
            onClick={() => removeChip(chip)}
            disabled={saving}
            className="leading-none text-muted-foreground hover:text-accent-blue"
            aria-label={`Remove ${chip}`}
          >
            x
          </button>
        </span>
      ))}
      {adding && loadOptions ? (
        <Combobox
          value=""
          onSelect={addChip}
          loadOptions={loadOptions}
          placeholder={placeholder}
          ariaLabel={`Add ${label}`}
          className="inline-block w-40"
          inputClassName="h-5 px-1.5 text-[10px] bg-background border-border focus:border-accent-blue"
        />
      ) : adding ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={160}
          disabled={saving}
          placeholder={placeholder}
          className="h-5 w-40 border border-border bg-background px-1.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-accent-blue focus:outline-none"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setDraft("");
            setAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip(draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft("");
              setAdding(false);
            }
          }}
        />
      ) : (
        chips.length < maxChips && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-left text-muted-foreground/50 hover:text-accent-blue"
            aria-label={`Add ${label}`}
          >
            {chips.length === 0 ? placeholder ?? "Add" : "+"}
            <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
          </button>
        )
      )}
    </p>
  );
}
