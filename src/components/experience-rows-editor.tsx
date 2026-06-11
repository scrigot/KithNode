"use client";

import { useCallback } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { FIRM_OPTIONS } from "@/lib/data/preference-options";
import type { ExperienceEntry } from "@/lib/educations";
import { Plus, X } from "lucide-react";

interface ExperienceRowsEditorProps {
  rows: ExperienceEntry[];
  onChange: (rows: ExperienceEntry[]) => void;
  /** When true, renders a teal ring to indicate resume-autofill just populated
   * this section. */
  resumeFilled?: boolean;
  /** Optional className applied to the Firm Combobox's internal input element.
   * Used by the contact edit-profile modal which needs "h-9 bg-muted text-sm". */
  comboboxInputClassName?: string;
  /** Width class for the Dates input. Defaults to "w-28". */
  datesWidthClassName?: string;
  /** className for the remove-row button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  removeButtonClassName?: string;
  /** className for the "Add experience" button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  addButtonClassName?: string;
}

/**
 * Row editor for up to 8 experience entries (Position / Firm / Dates).
 * Shared by onboarding, settings, and the contact edit-profile modal.
 */
export function ExperienceRowsEditor({
  rows,
  onChange,
  resumeFilled,
  comboboxInputClassName,
  datesWidthClassName = "w-28",
  removeButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
  addButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
}: ExperienceRowsEditorProps) {
  const loadFirmOptions = useCallback(async () => FIRM_OPTIONS, []);

  function updateRow(i: number, patch: Partial<ExperienceEntry>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function addRow() {
    if (rows.length >= 8) return;
    onChange([...rows, { title: "", firm: "", dates: "" }]);
  }

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-1.5"
          >
            <Input
              value={row.title}
              onChange={(e) => updateRow(i, { title: e.target.value })}
              placeholder="Position"
              className="h-9 bg-muted text-sm"
            />
            <Combobox
              value={row.firm}
              onSelect={(v) => updateRow(i, { firm: v })}
              loadOptions={loadFirmOptions}
              placeholder="Firm"
              ariaLabel="Firm"
              inputClassName={comboboxInputClassName}
            />
            <Input
              value={row.dates}
              onChange={(e) =>
                updateRow(i, { dates: e.target.value.slice(0, 40) })
              }
              placeholder="Summer 2026"
              className={`h-9 bg-muted text-sm ${datesWidthClassName}`}
              maxLength={40}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className={removeButtonClassName}
              aria-label="Remove experience row"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {rows.length < 8 && (
        <button
          type="button"
          onClick={addRow}
          className={`mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${addButtonClassName}`}
        >
          <Plus className="h-3 w-3" />
          Add experience
        </button>
      )}
    </div>
  );
}
