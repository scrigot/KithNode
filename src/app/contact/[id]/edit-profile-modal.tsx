"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { ChipField, stripCitySuffix } from "./field-editor";
import {
  loadUniversities,
  loadCities,
  loadHighSchools,
  loadGreekOrgs,
  loadClubs,
  loadMajors,
  loadMinors,
  loadConcentrations,
  loadSkills,
} from "@/lib/data/onboarding-options";
import { DEGREE_OPTIONS } from "@/lib/data/preference-options";
import type { ContactDetail } from "@/lib/api";

// LinkedIn-style "Edit profile" modal. A centered overlay over the contact
// detail page, replacing the old per-field click-to-edit rows in the DETAILS
// card. Everything the user types lives in LOCAL state for the lifetime of the
// modal, so blurring a field or (there are no tabs here, but by the same
// principle) any re-render can never drop an edit — nothing persists until Save.
//
// Save diffs the form against the values the modal opened with and sends a
// SINGLE PATCH containing only the CHANGED columns. The route already accepts a
// multi-field body and rescores once (see EDITABLE_FIELDS in
// /api/contacts/[id]/route.ts), so one request re-tiers the contact. On success
// we refresh the page data and close; on failure we surface the error inline and
// keep the modal (and every edit) open.

interface EditProfileModalProps {
  contact: ContactDetail;
  /** Refetch the contact (rescored server-side) after a successful save. */
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}

// The editable shape the modal owns. Single-value fields are strings; chip
// fields are string arrays joined back to ", " strings only at PATCH time.
interface FormState {
  title: string;
  firmName: string;
  pastFirms: string[];
  education: string;
  major: string[];
  minor: string[];
  // Comma-joined degree tokens ("BS, MBA"); toggled via the chip rows.
  degrees: string;
  concentration: string;
  highSchool: string;
  location: string;
  hometown: string;
  greekOrg: string;
  clubs: string[];
  skills: string[];
  passions: string;
}

// Parse a ", "-joined column into a capped, de-duped chip array.
function parseChips(raw: string, cap: number): string[] {
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, cap);
}

function initialForm(contact: ContactDetail): FormState {
  // degrees/concentration are new ", "-joined columns the contacts route now
  // persists; read defensively so this compiles regardless of the api.ts type.
  const academic = contact as { degrees?: string; concentration?: string };
  return {
    title: contact.title || "",
    firmName: contact.company.name || "",
    pastFirms: parseChips(contact.past_firms || "", 5),
    education: contact.education || "",
    major: parseChips(contact.major || "", 2),
    minor: parseChips(contact.minor || "", 2),
    degrees: academic.degrees || "",
    concentration: academic.concentration || "",
    highSchool: contact.high_school || "",
    location: contact.linkedin_location || "",
    hometown: contact.hometown || "",
    greekOrg: contact.greek_org || "",
    clubs: parseChips(contact.clubs || "", 5),
    skills: parseChips(contact.skills || "", 12),
    passions: contact.passions || "",
  };
}

// Section label — uppercase micro-label matching the DETAILS/AFFILIATIONS heads.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
      {children}
    </h4>
  );
}

// A labeled single-line text input (Title, Company, Passions). Taller and larger
// than the old inline editors so the boxes are easy to see and fill.
function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value}
        maxLength={160}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full border border-input bg-muted px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-teal focus:outline-none"
      />
    </div>
  );
}

// A labeled typeahead combobox row (Education, High School, Location, Hometown,
// Greek). `stripSuffix` strips the "Name — City, ST" high-school display label.
function ComboField({
  label,
  value,
  onSelect,
  loadOptions,
  placeholder,
  stripSuffix,
  matchAcronyms,
}: {
  label: string;
  value: string;
  onSelect: (v: string) => void;
  loadOptions: () => Promise<string[]>;
  placeholder?: string;
  stripSuffix?: boolean;
  matchAcronyms?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Combobox
        value={value}
        onSelect={(v) => onSelect(stripSuffix ? stripCitySuffix(v) : v)}
        loadOptions={loadOptions}
        placeholder={placeholder}
        ariaLabel={label}
        matchAcronyms={matchAcronyms}
        inputClassName="h-9 bg-muted text-sm"
      />
    </div>
  );
}

export function EditProfileModal({
  contact,
  onSaved,
  onClose,
}: EditProfileModalProps) {
  // Snapshot the values the modal opened with so Save can diff against them.
  const initial = useMemo(() => initialForm(contact), [contact]);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concentrations, setConcentrations] = useState<Record<string, string[]>>({});
  // Exit guard: with unsaved changes, every close path (Esc, backdrop, X,
  // CANCEL) routes through a confirm dialog — explicit Save or Discard only.
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Computed before the Escape effect below — its deps array evaluates at
  // render time. buildPatch is a hoisted function declaration, so this is safe.
  const dirtyCount = Object.keys(buildPatch()).length;

  function requestClose() {
    if (saving) return;
    if (dirtyCount > 0) setConfirmDiscard(true);
    else onClose();
  }

  // Lock body scroll + Escape closes (unless a save is in flight). Matches the
  // intro-modal convention.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      if (confirmDiscard) {
        setConfirmDiscard(false); // Esc on the confirm = keep editing
      } else if (dirtyCount > 0) {
        setConfirmDiscard(true);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [saving, onClose, confirmDiscard, dirtyCount]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Load the major→concentration map once so the Concentration combobox can
  // scope its pool to the contact's selected majors (fallback: union of all).
  useEffect(() => {
    loadConcentrations().then(setConcentrations);
  }, []);

  // Toggle a degree token in/out of the ", "-joined form value.
  const degreeList = form.degrees
    ? form.degrees.split(",").map((d) => d.trim()).filter(Boolean)
    : [];
  function toggleDegree(deg: string) {
    const next = degreeList.includes(deg)
      ? degreeList.filter((d) => d !== deg)
      : [...degreeList, deg];
    set("degrees", next.join(", "));
  }

  // Concentration pool: union of concentrations for every selected major; when
  // no selected major has an entry, fall back to the union of ALL values.
  const concentrationPool = useMemo(() => {
    const scoped = form.major.flatMap((m) => concentrations[m] ?? []);
    const pool = scoped.length > 0 ? scoped : Object.values(concentrations).flat();
    return Array.from(new Set(pool)).sort();
  }, [form.major, concentrations]);
  const loadConcentrationPool = useCallback(
    async () => concentrationPool,
    [concentrationPool],
  );

  // Build the PATCH body: only the columns whose value differs from the opened
  // snapshot. Chip arrays serialize to ", "-joined strings, matching how the
  // route stores and the GET reads them.
  function buildPatch(): Record<string, string> {
    const patch: Record<string, string> = {};
    const single: (keyof FormState)[] = [
      "title",
      "firmName",
      "education",
      "degrees",
      "concentration",
      "highSchool",
      "location",
      "hometown",
      "greekOrg",
      "passions",
    ];
    for (const key of single) {
      const next = (form[key] as string).trim();
      if (next !== (initial[key] as string).trim()) patch[key] = next;
    }
    const chips: (keyof FormState)[] = [
      "pastFirms",
      "major",
      "minor",
      "clubs",
      "skills",
    ];
    for (const key of chips) {
      const next = (form[key] as string[]).join(", ");
      if (next !== (initial[key] as string[]).join(", ")) patch[key] = next;
    }
    return patch;
  }

  async function handleSave() {
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Try again.");
      setSaving(false);
      setConfirmDiscard(false); // surface the error in the form, nothing lost
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onMouseDown={(e) => {
        // Backdrop click closes; clicks inside the card don't bubble here.
        if (e.target === e.currentTarget && !saving) requestClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col border border-primary/30 bg-card shadow-2xl shadow-primary/20">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h3
            id="edit-profile-title"
            className="text-[11px] font-bold uppercase tracking-wider text-primary"
          >
            EDIT PROFILE
          </h3>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* WORK */}
          <section className="space-y-3">
            <SectionLabel>Work</SectionLabel>
            <TextField
              label="Title"
              value={form.title}
              onChange={(v) => set("title", v)}
              placeholder="e.g. Investment Banking Analyst"
            />
            <TextField
              label="Company"
              value={form.firmName}
              onChange={(v) => set("firmName", v)}
              placeholder="e.g. Goldman Sachs"
            />
            <ChipField
              label="Past employers"
              values={form.pastFirms}
              onChange={(v) => set("pastFirms", v)}
              placeholder="Add a past employer, then press Enter..."
              cap={5}
            />
          </section>

          {/* EDUCATION */}
          <section className="space-y-3">
            <SectionLabel>Education</SectionLabel>
            <ComboField
              label="Education"
              value={form.education}
              onSelect={(v) => set("education", v)}
              loadOptions={loadUniversities}
              placeholder="e.g. University of North Carolina"
              matchAcronyms
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChipField
                label="Major"
                values={form.major}
                onChange={(v) => set("major", v)}
                loadOptions={loadMajors}
                placeholder="Add a major..."
                cap={2}
              />
              <ChipField
                label="Minor"
                values={form.minor}
                onChange={(v) => set("minor", v)}
                loadOptions={loadMinors}
                placeholder="Add a minor..."
                cap={2}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Degrees
              </label>
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Undergrad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEGREE_OPTIONS.undergrad.map((deg) => {
                      const active = degreeList.includes(deg);
                      return (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => toggleDegree(deg)}
                          className={`border px-2 py-1 text-[11px] font-bold transition-colors ${
                            active
                              ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                              : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {deg}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Grad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEGREE_OPTIONS.grad.map((deg) => {
                      const active = degreeList.includes(deg);
                      return (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => toggleDegree(deg)}
                          className={`border px-2 py-1 text-[11px] font-bold transition-colors ${
                            active
                              ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                              : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {deg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Concentration
              </label>
              <Combobox
                key={`conc-${concentrationPool.join("|")}`}
                value={form.concentration}
                onSelect={(v) => set("concentration", v)}
                loadOptions={loadConcentrationPool}
                placeholder="e.g. Finance"
                ariaLabel="Concentration"
                inputClassName="h-9 bg-muted text-sm"
              />
            </div>
            <ComboField
              label="High School"
              value={form.highSchool}
              onSelect={(v) => set("highSchool", v)}
              loadOptions={loadHighSchools}
              placeholder="e.g. East Chapel Hill High School"
              stripSuffix
            />
          </section>

          {/* LOCATION */}
          <section className="space-y-3">
            <SectionLabel>Location</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ComboField
                label="Location (current)"
                value={form.location}
                onSelect={(v) => set("location", v)}
                loadOptions={loadCities}
                placeholder="Charlotte, NC"
              />
              <ComboField
                label="Hometown"
                value={form.hometown}
                onSelect={(v) => set("hometown", v)}
                loadOptions={loadCities}
                placeholder="Charlotte, NC"
              />
            </div>
          </section>

          {/* CAMPUS & INTERESTS */}
          <section className="space-y-3">
            <SectionLabel>Campus &amp; Interests</SectionLabel>
            <ComboField
              label="Greek Life"
              value={form.greekOrg}
              onSelect={(v) => set("greekOrg", v)}
              loadOptions={loadGreekOrgs}
              placeholder="e.g. Chi Phi"
            />
            <ChipField
              label="Clubs"
              values={form.clubs}
              onChange={(v) => set("clubs", v)}
              loadOptions={loadClubs}
              placeholder="Add a club..."
              cap={5}
            />
            <ChipField
              label="Skills"
              values={form.skills}
              onChange={(v) => set("skills", v)}
              loadOptions={loadSkills}
              placeholder="Add a skill, then press Enter..."
              cap={12}
            />
            <TextField
              label="Passions"
              value={form.passions}
              onChange={(v) => set("passions", v)}
              placeholder="e.g. Sailing, jazz, distance running"
            />
          </section>

          {error && (
            <div className="border border-red-500/20 bg-red-500/5 px-3 py-2">
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                SAVING...
              </>
            ) : dirtyCount > 0 ? (
              `SAVE (${dirtyCount})`
            ) : (
              "SAVE"
            )}
          </button>
        </div>
      </div>

      {/* Unsaved-changes guard: explicit Save or Discard only */}
      {confirmDiscard && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmDiscard(false);
          }}
        >
          <div className="w-full max-w-[400px] border border-primary/30 bg-card p-5 shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Unsaved changes
            </p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              You have {dirtyCount} unsaved {dirtyCount === 1 ? "field" : "fields"}.
              Save or discard before leaving.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onClose();
                }}
                className="flex-1 border border-red-500/30 bg-red-500/5 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  void handleSave();
                }}
                className="flex-1 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
              >
                SAVE CHANGES
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="mt-3 w-full text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Keep editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
