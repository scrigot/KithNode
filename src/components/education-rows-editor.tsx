"use client";

import { useState, useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { loadMajors, loadConcentrations } from "@/lib/data/onboarding-options";
import { DEGREE_OPTIONS } from "@/lib/data/preference-options";
import type { EducationEntry } from "@/lib/educations";
import { Plus, X } from "lucide-react";

interface EducationRowsEditorProps {
  rows: EducationEntry[];
  onChange: (rows: EducationEntry[]) => void;
  /** When true, renders a teal ring to indicate resume-autofill just populated
   * this section. */
  resumeFilled?: boolean;
  /** Optional className applied to each Combobox's internal input element.
   * Used by the contact edit-profile modal which needs "h-9 bg-muted text-sm". */
  comboboxInputClassName?: string;
  /** className for the remove-row button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  removeButtonClassName?: string;
  /** className for the "Add education" button. Defaults to
   * "text-muted-foreground/60 hover:text-foreground transition-colors". */
  addButtonClassName?: string;
}

/**
 * Row editor for up to 4 education entries (Major / Degree / Concentration).
 * Shared by onboarding, settings, and the contact edit-profile modal.
 */
export function EducationRowsEditor({
  rows,
  onChange,
  resumeFilled,
  comboboxInputClassName,
  removeButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
  addButtonClassName = "text-muted-foreground/60 hover:text-foreground transition-colors",
}: EducationRowsEditorProps) {
  const [concentrations, setConcentrations] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    loadConcentrations().then(setConcentrations);
  }, []);

  function updateRow(i: number, patch: Partial<EducationEntry>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function addRow() {
    if (rows.length >= 4) return;
    onChange([...rows, { major: "", degree: "", concentration: "" }]);
  }

  // Concentration pool scoped to the current major; falls back to union of all.
  function concPool(major: string): string[] {
    const scoped = major ? (concentrations[major] ?? []) : [];
    const pool =
      scoped.length > 0 ? scoped : Object.values(concentrations).flat();
    return Array.from(new Set(pool)).sort();
  }

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const pool = concPool(row.major);
          const loadConcPool = async () => pool;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5"
            >
              <Combobox
                value={row.major}
                onSelect={(v) => updateRow(i, { major: v })}
                loadOptions={loadMajors}
                placeholder="Major (opt.)"
                ariaLabel="Major"
                inputClassName={comboboxInputClassName}
              />
              <select
                value={row.degree}
                onChange={(e) => updateRow(i, { degree: e.target.value })}
                aria-label="Degree"
                className="h-9 border border-input bg-muted px-1.5 text-xs text-foreground focus:border-accent-teal focus:outline-none"
              >
                <option value="">Degree</option>
                <optgroup label="Undergrad">
                  {DEGREE_OPTIONS.undergrad.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Grad">
                  {DEGREE_OPTIONS.grad.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </optgroup>
              </select>
              <Combobox
                key={`conc-${i}-${pool.join("|").slice(0, 40)}`}
                value={row.concentration}
                onSelect={(v) => updateRow(i, { concentration: v })}
                loadOptions={loadConcPool}
                placeholder="Concentration (opt.)"
                ariaLabel="Concentration"
                inputClassName={comboboxInputClassName}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className={removeButtonClassName}
                aria-label="Remove education row"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      {rows.length < 4 && (
        <button
          type="button"
          onClick={addRow}
          className={`mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${addButtonClassName}`}
        >
          <Plus className="h-3 w-3" />
          Add education
        </button>
      )}
    </div>
  );
}
