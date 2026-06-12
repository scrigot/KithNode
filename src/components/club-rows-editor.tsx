"use client";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { loadClubs } from "@/lib/data/onboarding-options";
import type { ClubEntry } from "@/lib/club-memberships";
import { Plus, X } from "lucide-react";

interface ClubRowsEditorProps {
  rows: ClubEntry[];
  onChange: (rows: ClubEntry[]) => void;
  /** When true, renders a teal ring to indicate resume-autofill just populated
   * this section. */
  resumeFilled?: boolean;
  /** Optional className applied to the Combobox's internal input element.
   * Used by the contact edit-profile modal which needs "h-9 bg-muted text-sm". */
  comboboxInputClassName?: string;
  /** className for the remove-row button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  removeButtonClassName?: string;
  /** className for the "Add club" button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  addButtonClassName?: string;
}

/**
 * Row editor for up to 6 club membership entries (Club / Role).
 * Shared by onboarding, settings, and the contact edit-profile modal.
 */
export function ClubRowsEditor({
  rows,
  onChange,
  resumeFilled,
  comboboxInputClassName,
  removeButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
  addButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
}: ClubRowsEditorProps) {
  function updateRow(i: number, patch: Partial<ClubEntry>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function addRow() {
    if (rows.length >= 6) return;
    onChange([...rows, { club: "", role: "" }]);
  }

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5"
          >
            <Combobox
              value={row.club}
              onSelect={(v) => updateRow(i, { club: v })}
              loadOptions={loadClubs}
              placeholder="Club"
              ariaLabel="Club"
              inputClassName={comboboxInputClassName}
            />
            <Input
              value={row.role}
              onChange={(e) => updateRow(i, { role: e.target.value.slice(0, 40) })}
              placeholder="President"
              maxLength={40}
              className={comboboxInputClassName ?? "h-9 bg-muted text-sm"}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className={removeButtonClassName}
              aria-label="Remove club row"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {rows.length < 6 && (
        <button
          type="button"
          onClick={addRow}
          className={`mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${addButtonClassName}`}
        >
          <Plus className="h-3 w-3" />
          Add club
        </button>
      )}
    </div>
  );
}
