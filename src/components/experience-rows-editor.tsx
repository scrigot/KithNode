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
 * Start / End period control with a "Now" toggle that sets the end to
 * "Present" when the person still works there. Exported so the settings page's
 * inline editor reuses the exact same Present behavior.
 */
export function ExperiencePeriod({
  start,
  end,
  onStart,
  onEnd,
  widthClassName = "w-28",
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  widthClassName?: string;
}) {
  const isPresent = end.trim().toLowerCase() === "present";
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={start}
        onChange={(e) => onStart(e.target.value.slice(0, 40))}
        placeholder="Start (e.g. Jun 2025)"
        className={`h-9 bg-muted text-sm ${widthClassName}`}
        maxLength={40}
      />
      <span className="text-xs text-muted-foreground">to</span>
      {isPresent ? (
        <button
          type="button"
          onClick={() => onEnd("")}
          title="Click to set an end date"
          className={`h-9 border border-accent-teal/40 bg-accent-teal/15 px-3 text-xs font-bold text-accent-teal ${widthClassName}`}
        >
          Present
        </button>
      ) : (
        <Input
          value={end}
          onChange={(e) => onEnd(e.target.value.slice(0, 40))}
          placeholder="End (e.g. Aug 2025)"
          className={`h-9 bg-muted text-sm ${widthClassName}`}
          maxLength={40}
        />
      )}
      <button
        type="button"
        onClick={() => onEnd(isPresent ? "" : "Present")}
        title={isPresent ? "Set an end date" : "Still here (Present)"}
        className={`h-9 border px-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
          isPresent
            ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
            : "border-white/[0.12] text-muted-foreground hover:text-foreground"
        }`}
      >
        Now
      </button>
    </div>
  );
}

/**
 * Row editor for up to 8 experience entries (Position / Firm / Start–End).
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
    onChange([...rows, { title: "", firm: "", start: "", end: "" }]);
  }

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5"
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
            <button
              type="button"
              onClick={() => removeRow(i)}
              className={removeButtonClassName}
              aria-label="Remove experience row"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="col-span-3">
              <ExperiencePeriod
                start={row.start}
                end={row.end}
                onStart={(v) => updateRow(i, { start: v })}
                onEnd={(v) => updateRow(i, { end: v })}
                widthClassName={datesWidthClassName}
              />
            </div>
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
