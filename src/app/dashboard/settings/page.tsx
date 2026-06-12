"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { searchCities } from "@/lib/us-cities";
import {
  loadUniversities,
  loadCities,
  loadHighSchools,
  loadGreekOrgs,
  loadMajors,
  loadMinors,
  loadConcentrations,
  loadSkills,
} from "@/lib/data/onboarding-options";
import {
  FIRM_OPTIONS,
  LOCATION_OPTIONS,
  DEGREE_OPTIONS,
} from "@/lib/data/preference-options";
import type { EducationEntry, ExperienceEntry } from "@/lib/educations";
import type { ClubEntry } from "@/lib/club-memberships";
import { ClubRowsEditor } from "@/components/club-rows-editor";
import { ExperiencePeriod } from "@/components/experience-rows-editor";
import { TrackRolePicker } from "@/components/track-role-picker";
import {
  GraduationCap,
  MapPin,
  Target,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  RotateCcw,
  CalendarDays,
  FileText,
  Upload,
  Loader2,
} from "lucide-react";
import { CreditCost } from "@/components/credit-cost";
import { trackEvent } from "@/lib/posthog";

const TOTAL_STEPS = 5;

const STEP_ICONS = [GraduationCap, MapPin, Target, Building2, CheckCircle2];

interface Preferences {
  university: string;
  highSchool: string;
  greekLifeEnabled: boolean;
  greekOrganization: string;
  educations: EducationEntry[];
  minors: string[];
  experiences: ExperienceEntry[];
  clubMemberships: ClubEntry[];
  skills: string[];
  hometown: string;
  targetLocations: string[];
  customLocations: string[];
  targetIndustries: string[];
  targetFirms: string[];
  customFirms: string[];
  recruitingDate: string;
  weeklyGoalTarget: number;
}

const STORAGE_KEY = "kithnode_preferences";

function getDefaults(): Preferences {
  return {
    university: "",
    highSchool: "",
    greekLifeEnabled: false,
    greekOrganization: "",
    educations: [],
    minors: [],
    experiences: [],
    clubMemberships: [],
    skills: [],
    hometown: "",
    targetLocations: [],
    customLocations: [],
    targetIndustries: [],
    targetFirms: [],
    customFirms: [],
    recruitingDate: "",
    weeklyGoalTarget: 3,
  };
}

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return getDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaults(), ...JSON.parse(raw) };
  } catch (err) {
    Sentry.captureException(err);
    // ignore
  }
  return getDefaults();
}

function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    Sentry.captureException(err);
    // ignore
  }
}

function hasCompletedSetup(prefs: Preferences): boolean {
  return !!(
    prefs.university ||
    prefs.hometown ||
    prefs.targetIndustries.length > 0 ||
    prefs.targetFirms.length > 0 ||
    prefs.customFirms.length > 0
  );
}

async function syncToAPI(prefs: Preferences) {
  try {
    await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_university: prefs.university || null,
        high_school: prefs.highSchool || null,
        hometown: prefs.hometown || null,
        target_locations:
          [...prefs.targetLocations, ...prefs.customLocations].length > 0
            ? [...prefs.targetLocations, ...prefs.customLocations]
            : null,
        target_industries: prefs.targetIndustries.length > 0 ? prefs.targetIndustries : null,
        target_companies:
          [...prefs.targetFirms, ...prefs.customFirms].length > 0
            ? [...prefs.targetFirms, ...prefs.customFirms]
            : null,
        greek_life: prefs.greekLifeEnabled ? prefs.greekOrganization : null,
        minor: prefs.minors.join(", "),
        educations: prefs.educations,
        experiences: prefs.experiences,
        clubMemberships: prefs.clubMemberships,
        skills: prefs.skills,
        recruiting_date: prefs.recruitingDate || null,
        weekly_goal_target: prefs.weeklyGoalTarget || 3,
      }),
    });
  } catch (err) {
    Sentry.captureException(err);
    // localStorage is source of truth
  }
}

// ── City Autocomplete ─────────────────────────────────────────────────────────

function CityAutocomplete({
  value,
  onChange,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const suggestions = useMemo(() => searchCities(value), [value]);

  const select = (city: string) => {
    if (onCommit) onCommit(city);
    else onChange(city);
    setOpen(false);
    setHighlighted(-1);
  };

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (open && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(h - 1, -1));
              return;
            }
            if (e.key === "Escape") {
              setOpen(false);
              setHighlighted(-1);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (highlighted >= 0) {
                select(suggestions[highlighted]);
                return;
              }
            }
          }
          if (e.key === "Enter" && onCommit) {
            e.preventDefault();
            onCommit(value);
          }
        }}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto border border-white/[0.06] bg-bg-card shadow-lg">
          {suggestions.map((city, i) => (
            <li
              key={city}
              onMouseDown={(e) => {
                e.preventDefault();
                select(city);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted
                  ? "bg-accent-teal/15 text-accent-teal"
                  : "text-text-secondary hover:bg-muted"
              }`}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Education Rows Editor ─────────────────────────────────────────────────────
// Inline component — used in both EditPanel and Wizard step 0.

function EducationRowsEditor({
  rows,
  onChange,
  resumeFilled,
}: {
  rows: EducationEntry[];
  onChange: (rows: EducationEntry[]) => void;
  resumeFilled?: boolean;
}) {
  const [concentrations, setConcentrations] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadConcentrations().then(setConcentrations);
  }, []);

  function updateRow(i: number, patch: Partial<EducationEntry>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function addRow() {
    if (rows.length >= 4) return;
    onChange([...rows, { major: "", degree: "", concentration: "" }]);
  }

  // Concentration pool for a given major: scoped to that major's entries, fallback union of all.
  function concPool(major: string): string[] {
    const scoped = major ? (concentrations[major] ?? []) : [];
    const pool = scoped.length > 0 ? scoped : Object.values(concentrations).flat();
    return Array.from(new Set(pool)).sort();
  }

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const pool = concPool(row.major);
          const loadConcPool = async () => pool;
          return (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
              {/* Major */}
              <Combobox
                value={row.major}
                onSelect={(v) => updateRow(i, { major: v })}
                loadOptions={loadMajors}
                placeholder="Major (opt.)"
                ariaLabel="Major"
              />
              {/* Degree */}
              <select
                value={row.degree}
                onChange={(e) => updateRow(i, { degree: e.target.value })}
                aria-label="Degree"
                className="h-9 border border-input bg-muted px-1.5 text-xs text-foreground focus:border-accent-teal focus:outline-none"
              >
                <option value="">Degree</option>
                <optgroup label="Undergrad">
                  {DEGREE_OPTIONS.undergrad.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </optgroup>
                <optgroup label="Grad">
                  {DEGREE_OPTIONS.grad.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </optgroup>
              </select>
              {/* Concentration */}
              <Combobox
                key={`conc-${i}-${pool.join("|").slice(0, 40)}`}
                value={row.concentration}
                onSelect={(v) => updateRow(i, { concentration: v })}
                loadOptions={loadConcPool}
                placeholder="Concentration (opt.)"
                ariaLabel="Concentration"
              />
              {/* Remove */}
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-text-muted hover:text-white transition-colors"
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
          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-white transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add education
        </button>
      )}
    </div>
  );
}

// ── Experience Rows Editor ────────────────────────────────────────────────────
// Inline component — used in EditPanel and Wizard step 1.

function ExperienceRowsEditor({
  rows,
  onChange,
  resumeFilled,
}: {
  rows: ExperienceEntry[];
  onChange: (rows: ExperienceEntry[]) => void;
  resumeFilled?: boolean;
}) {
  function updateRow(i: number, patch: Partial<ExperienceEntry>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  function addRow() {
    if (rows.length >= 8) return;
    onChange([...rows, { title: "", firm: "", start: "", end: "" }]);
  }

  const loadFirmOptions = useCallback(async () => FIRM_OPTIONS, []);

  return (
    <div className={resumeFilled ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            {/* Position */}
            <Input
              value={row.title}
              onChange={(e) => updateRow(i, { title: e.target.value })}
              placeholder="Position"
              className="h-9 bg-muted text-sm"
            />
            {/* Firm */}
            <Combobox
              value={row.firm}
              onSelect={(v) => updateRow(i, { firm: v })}
              loadOptions={loadFirmOptions}
              placeholder="Firm"
              ariaLabel="Firm"
            />
            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-text-muted hover:text-white transition-colors"
              aria-label="Remove experience row"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {/* Start – End (with "Now" → Present) */}
            <div className="col-span-3">
              <ExperiencePeriod
                start={row.start}
                end={row.end}
                onStart={(v) => updateRow(i, { start: v })}
                onEnd={(v) => updateRow(i, { end: v })}
              />
            </div>
          </div>
        ))}
      </div>
      {rows.length < 8 && (
        <button
          type="button"
          onClick={addRow}
          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-white transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add experience
        </button>
      )}
    </div>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────────────

function EditPanel({
  prefs,
  onSave,
  onRestartWizard,
}: {
  prefs: Preferences;
  onSave: (p: Preferences) => Promise<void>;
  onRestartWizard: () => void;
}) {
  const [local, setLocal] = useState<Preferences>(prefs);
  const [customFirmInput, setCustomFirmInput] = useState("");
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [minorInput, setMinorInput] = useState("");
  const [skillKey, setSkillKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFilled, setResumeFilled] = useState<Set<string>>(new Set());

  const toggleIndustry = (ind: string) =>
    setLocal((p) => ({
      ...p,
      targetIndustries: p.targetIndustries.includes(ind)
        ? p.targetIndustries.filter((i) => i !== ind)
        : [...p.targetIndustries, ind],
    }));

  const toggleFirm = (firm: string) =>
    setLocal((p) => ({
      ...p,
      targetFirms: p.targetFirms.includes(firm)
        ? p.targetFirms.filter((f) => f !== firm)
        : [...p.targetFirms, firm],
    }));

  const addCustomFirm = () => {
    const firm = customFirmInput.trim();
    if (!firm || local.customFirms.includes(firm) || local.targetFirms.includes(firm) || FIRM_OPTIONS.includes(firm)) return;
    setLocal((p) => ({ ...p, customFirms: [...p.customFirms, firm] }));
    setCustomFirmInput("");
  };

  const toggleLocation = (loc: string) =>
    setLocal((p) => ({
      ...p,
      targetLocations: p.targetLocations.includes(loc)
        ? p.targetLocations.filter((l) => l !== loc)
        : [...p.targetLocations, loc],
    }));

  const addCustomLocation = (raw?: string) => {
    const loc = (raw ?? customLocationInput).trim();
    if (!loc || local.customLocations.includes(loc) || local.targetLocations.includes(loc) || LOCATION_OPTIONS.includes(loc)) return;
    setLocal((p) => ({ ...p, customLocations: [...p.customLocations, loc] }));
    setCustomLocationInput("");
  };

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    setSkillKey((k) => k + 1); // remount the Combobox to clear its input
    if (!skill || local.skills.includes(skill) || local.skills.length >= 10) return;
    setLocal((p) => ({ ...p, skills: [...p.skills, skill] }));
  };

  const addMinor = (v: string) => {
    const m = v.trim();
    if (m && !local.minors.includes(m) && local.minors.length < 2) {
      setLocal((p) => ({ ...p, minors: [...p.minors, m] }));
    }
    setMinorInput("");
  };

  // Resume autofill — parse PDF client-side → base64 → POST, then prefill the
  // local form's EMPTY fields only (never clobber what's already set). User
  // still hits Save to persist. Functional update re-checks emptiness at apply.
  const handleResumeFile = async (file: File) => {
    setResumeError(null);
    if (file.type !== "application/pdf") {
      setResumeError("Please upload a PDF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setResumeError("PDF too large (max 4MB).");
      return;
    }
    setResumeLoading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const view = new Uint8Array(buf);
      for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
      const base64 = btoa(binary);

      const res = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64 }),
      });
      if (!res.ok) throw new Error("extract failed");
      const data = await res.json();

      const filled = new Set<string>();
      setLocal((p) => {
        const next = { ...p };
        const fillStr = (key: keyof Preferences, value: unknown) => {
          if (!String(next[key]).trim() && typeof value === "string" && value.trim()) {
            (next[key] as string) = value.trim();
            filled.add(key);
          }
        };
        const fillList = (key: keyof Preferences, value: unknown, cap: number) => {
          if ((next[key] as string[]).length === 0 && Array.isArray(value)) {
            const list = value.map((v) => String(v).trim()).filter(Boolean).slice(0, cap);
            if (list.length) {
              (next[key] as string[]) = list;
              filled.add(key);
            }
          }
        };

        fillStr("university", data.university);
        fillStr("highSchool", data.highSchool);
        fillStr("hometown", data.hometown);
        if (!next.greekOrganization.trim() && typeof data.greekOrg === "string" && data.greekOrg.trim()) {
          next.greekLifeEnabled = true;
          next.greekOrganization = data.greekOrg.trim();
          filled.add("greekOrganization");
        }
        // Map resume educations array into rows (only when empty).
        if (next.educations.length === 0 && Array.isArray(data.educations) && data.educations.length > 0) {
          next.educations = (data.educations as EducationEntry[]).slice(0, 4).map((e) => ({
            major: String(e?.major ?? "").trim(),
            degree: String(e?.degree ?? "").trim(),
            concentration: String(e?.concentration ?? "").trim(),
          }));
          filled.add("educations");
        }
        // Map resume experiences array into rows (only when empty).
        if (next.experiences.length === 0 && Array.isArray(data.experiences) && data.experiences.length > 0) {
          next.experiences = (data.experiences as Record<string, unknown>[]).slice(0, 8).map((e) => ({
            title: String(e?.title ?? "").trim(),
            firm: String(e?.firm ?? "").trim(),
            start: String(e?.start ?? e?.dates ?? "").trim(),
            end: String(e?.end ?? "").trim(),
          }));
          filled.add("experiences");
        }
        fillList("minors", data.minors, 2);
        // Map resume clubMemberships (or legacy clubs) into rows (only when empty).
        if (next.clubMemberships.length === 0) {
          if (Array.isArray(data.clubMemberships) && data.clubMemberships.length > 0) {
            next.clubMemberships = (data.clubMemberships as ClubEntry[]).slice(0, 6).map((e) => ({
              club: String(e?.club ?? "").trim(),
              role: String(e?.role ?? "").trim(),
            })).filter((e) => e.club);
            if (next.clubMemberships.length) filled.add("clubMemberships");
          } else if (Array.isArray(data.clubs) && data.clubs.length > 0) {
            next.clubMemberships = (data.clubs as string[]).slice(0, 6).map((c) => ({
              club: String(c).trim(),
              role: "",
            })).filter((e) => e.club);
            if (next.clubMemberships.length) filled.add("clubMemberships");
          }
        }
        fillList("skills", data.skills, 10);
        fillList("targetIndustries", data.targetIndustries, 7);
        return next;
      });

      setResumeFilled(filled);
      setTimeout(() => setResumeFilled(new Set()), 2500);
    } catch {
      setResumeError("Couldn't read that resume. Fill the fields manually.");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allFirms = [...local.targetFirms, ...local.customFirms];
  const allLocations = [...local.targetLocations, ...local.customLocations];

  return (
    <div className="mx-auto max-w-xl p-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-white">Settings</h2>
          <p className="mt-0.5 text-[12px] text-text-secondary">Edit your recruiting preferences</p>
        </div>
        <button
          onClick={onRestartWizard}
          className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-white transition-colors duration-150"
        >
          <RotateCcw size={12} />
          Restart Setup
        </button>
      </div>

      {/* Resume autofill — prefills empty fields only, never stored. */}
      <div className="mb-6 border border-dashed border-accent-teal/30 bg-accent-teal/[0.04] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-accent-teal" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">
              Autofill from resume (PDF)
            </span>
          </div>
          <label
            className={`flex cursor-pointer items-center gap-1.5 border border-accent-teal/40 bg-accent-teal/10 px-3 py-1.5 text-[11px] font-bold text-accent-teal transition-colors hover:bg-accent-teal/20 ${
              resumeLoading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {resumeLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload PDF
                <CreditCost action="resume" />
              </>
            )}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={resumeLoading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleResumeFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[10px] text-text-muted">
          Parsed locally, never stored. Only fills empty fields, then hit Save.
        </p>
        {resumeError && (
          <p className="mt-1 text-[10px] text-red-400">{resumeError}</p>
        )}
      </div>

      <div className="space-y-6">
        {/* Recruiting timeline + weekly goal */}
        <section className="border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={15} className="text-accent-teal" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Recruiting
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Target recruiting date
              </label>
              <Input
                type="date"
                value={local.recruitingDate}
                onChange={(e) =>
                  setLocal({ ...local, recruitingDate: e.target.value })
                }
                className="bg-muted text-sm"
              />
              <p className="mt-1 text-[10px] text-text-muted">
                Drives the countdown on Overview.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Weekly coffee-chat goal
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={local.weeklyGoalTarget}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    weeklyGoalTarget:
                      Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  })
                }
                className="bg-muted text-sm"
              />
              <p className="mt-1 text-[10px] text-text-muted">
                Appears as the target in the weekly progress bar.
              </p>
            </div>
          </div>
        </section>

        {/* School */}
        <section className="border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap size={15} className="text-accent-teal" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">School</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                University
              </label>
              <Combobox
                value={local.university}
                onSelect={(v) => setLocal({ ...local, university: v })}
                loadOptions={loadUniversities}
                placeholder="University of North Carolina at Chapel Hill"
                ariaLabel="University"
                matchAcronyms
              />
            </div>

            {/* Education rows editor (up to 4) */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Education{" "}
                <span className="font-mono text-[9px] tabular-nums text-text-muted/60">
                  {local.educations.length}/4
                </span>
              </label>
              <EducationRowsEditor
                rows={local.educations}
                onChange={(rows) => setLocal((p) => ({ ...p, educations: rows }))}
                resumeFilled={resumeFilled.has("educations")}
              />
            </div>

            {/* Minor stays exactly as-is */}
            <div className={resumeFilled.has("minors") ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Minor <span className="font-mono text-[9px] tabular-nums text-text-muted/60">{local.minors.length}/2</span>
              </label>
              {local.minors.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {local.minors.map((m) => (
                    <span
                      key={m}
                      className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                    >
                      {m}
                      <button
                        onClick={() => setLocal((p) => ({ ...p, minors: p.minors.filter((x) => x !== m) }))}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {local.minors.length < 2 && (
                <Combobox
                  value={minorInput}
                  onSelect={addMinor}
                  loadOptions={loadMinors}
                  placeholder="Add a minor..."
                  ariaLabel="Minor"
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                High School
              </label>
              <Combobox
                value={local.highSchool}
                onSelect={(v) => {
                  // Display label is "Name — City, ST"; store only the school name.
                  const name = v.includes(" — ") ? v.split(" — ")[0] : v;
                  setLocal({ ...local, highSchool: name });
                }}
                loadOptions={loadHighSchools}
                placeholder="East Chapel Hill High School"
                ariaLabel="High School"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Greek Life
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocal({ ...local, greekLifeEnabled: true })}
                  className={`border px-4 py-2 text-xs font-bold transition-colors ${
                    local.greekLifeEnabled
                      ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                      : "border-white/[0.06] text-text-muted hover:text-white"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setLocal({ ...local, greekLifeEnabled: false, greekOrganization: "" })}
                  className={`border px-4 py-2 text-xs font-bold transition-colors ${
                    !local.greekLifeEnabled
                      ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                      : "border-white/[0.06] text-text-muted hover:text-white"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>
            {local.greekLifeEnabled && (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Organization
                </label>
                <Combobox
                  value={local.greekOrganization}
                  onSelect={(v) => setLocal({ ...local, greekOrganization: v })}
                  loadOptions={loadGreekOrgs}
                  placeholder="e.g. Chi Phi"
                  ariaLabel="Greek Organization"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Clubs{" "}
                <span className="font-mono text-[9px] tabular-nums text-text-muted/60">
                  {local.clubMemberships.length}/6
                </span>
              </label>
              <ClubRowsEditor
                rows={local.clubMemberships}
                onChange={(rows) => setLocal((p) => ({ ...p, clubMemberships: rows }))}
                resumeFilled={resumeFilled.has("clubMemberships")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Skills (up to 10)
              </label>
              {local.skills.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {local.skills.map((skill) => (
                    <span
                      key={skill}
                      className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
                    >
                      {skill}
                      <button
                        onClick={() => setLocal((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }))}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {local.skills.length < 10 && (
                <Combobox
                  key={skillKey}
                  value=""
                  onSelect={addSkill}
                  loadOptions={loadSkills}
                  placeholder="Add a skill, then press Enter..."
                  ariaLabel="Skills"
                />
              )}
              {local.skills.length > 0 && (
                <p className="mt-1 text-[10px] text-text-muted">{local.skills.length}/10 selected</p>
              )}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={15} className="text-accent-teal" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Location</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Hometown
              </label>
              <Combobox
                value={local.hometown}
                onSelect={(v) => setLocal({ ...local, hometown: v })}
                loadOptions={loadCities}
                placeholder="Charlotte, NC"
                ariaLabel="Hometown"
              />
            </div>
            <div>
              <label className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Target Locations
              </label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_OPTIONS.map((loc) => {
                  const active = local.targetLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className={`border px-3 py-2 text-xs font-bold transition-colors ${
                        active
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] text-text-muted hover:text-white"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
                {local.customLocations.map((loc) => (
                  <span
                    key={loc}
                    className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
                  >
                    {loc}
                    <button
                      onClick={() => setLocal((p) => ({ ...p, customLocations: p.customLocations.filter((l) => l !== loc) }))}
                      className="text-accent-teal/60 hover:text-accent-teal"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {allLocations.length > 0 && (
                <p className="mt-2 text-[11px] text-text-muted">{allLocations.length} selected</p>
              )}
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <CityAutocomplete
                    placeholder="Add a location..."
                    value={customLocationInput}
                    onChange={setCustomLocationInput}
                    onCommit={addCustomLocation}
                    className="bg-muted text-sm"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => addCustomLocation()} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Target roles — track-grouped. Selected ROLE names persist into
            targetIndustries (storage shape unchanged). */}
        <section className="border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target size={15} className="text-accent-teal" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Target Roles</h3>
          </div>
          <TrackRolePicker selected={local.targetIndustries} onToggle={toggleIndustry} />
          {local.targetIndustries.length > 0 && (
            <p className="mt-3 text-[11px] text-text-muted">{local.targetIndustries.length} selected</p>
          )}
        </section>

        {/* Firms + Experience */}
        <section className="border border-white/[0.06] bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-accent-teal" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Target Firms</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {FIRM_OPTIONS.map((firm) => {
              const active = local.targetFirms.includes(firm);
              return (
                <button
                  key={firm}
                  onClick={() => toggleFirm(firm)}
                  className={`border px-3 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                      : "border-white/[0.06] text-text-muted hover:text-white"
                  }`}
                >
                  {firm}
                </button>
              );
            })}
            {local.customFirms.map((firm) => (
              <span
                key={firm}
                className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
              >
                {firm}
                <button
                  onClick={() => setLocal((p) => ({ ...p, customFirms: p.customFirms.filter((f) => f !== firm) }))}
                  className="text-accent-teal/60 hover:text-accent-teal"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {allFirms.length > 0 && (
            <p className="mt-3 text-[11px] text-text-muted">{allFirms.length} selected</p>
          )}
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Add a firm..."
              value={customFirmInput}
              onChange={(e) => setCustomFirmInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFirm(); } }}
              className="bg-muted text-sm"
            />
            <Button size="sm" variant="outline" onClick={addCustomFirm} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Experience rows editor (up to 8) — replaces flat pastFirms */}
          <div className="mt-6">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Experience{" "}
              <span className="font-mono text-[9px] tabular-nums text-text-muted/60">
                up to 8
              </span>
            </label>
            <ExperienceRowsEditor
              rows={local.experiences}
              onChange={(rows) => setLocal((p) => ({ ...p, experiences: rows }))}
              resumeFilled={resumeFilled.has("experiences")}
            />
          </div>
        </section>

        {/* Save */}
        <Button
          className="w-full bg-accent-teal py-5 text-sm font-bold text-white hover:bg-accent-teal/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Saved!" : (
            <span className="flex items-center gap-2"><Pencil size={14} /> Save Changes</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

function Wizard({
  initialPrefs,
  onComplete,
}: {
  initialPrefs: Preferences;
  onComplete: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const [customFirmInput, setCustomFirmInput] = useState("");
  const [customLocationInput, setCustomLocationInput] = useState("");

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  const toggleIndustry = (ind: string) =>
    setPrefs((p) => ({
      ...p,
      targetIndustries: p.targetIndustries.includes(ind)
        ? p.targetIndustries.filter((i) => i !== ind)
        : [...p.targetIndustries, ind],
    }));

  const toggleFirm = (firm: string) =>
    setPrefs((p) => ({
      ...p,
      targetFirms: p.targetFirms.includes(firm)
        ? p.targetFirms.filter((f) => f !== firm)
        : [...p.targetFirms, firm],
    }));

  const addCustomFirm = () => {
    const firm = customFirmInput.trim();
    if (!firm || prefs.customFirms.includes(firm) || prefs.targetFirms.includes(firm) || FIRM_OPTIONS.includes(firm)) return;
    setPrefs((p) => ({ ...p, customFirms: [...p.customFirms, firm] }));
    setCustomFirmInput("");
  };

  const removeCustomFirm = (firm: string) =>
    setPrefs((p) => ({ ...p, customFirms: p.customFirms.filter((f) => f !== firm) }));

  const toggleLocation = (loc: string) =>
    setPrefs((p) => ({
      ...p,
      targetLocations: p.targetLocations.includes(loc)
        ? p.targetLocations.filter((l) => l !== loc)
        : [...p.targetLocations, loc],
    }));

  const addCustomLocation = () => {
    const loc = customLocationInput.trim();
    if (!loc || prefs.customLocations.includes(loc) || prefs.targetLocations.includes(loc) || LOCATION_OPTIONS.includes(loc)) return;
    setPrefs((p) => ({ ...p, customLocations: [...p.customLocations, loc] }));
    setCustomLocationInput("");
  };

  const removeCustomLocation = (loc: string) =>
    setPrefs((p) => ({ ...p, customLocations: p.customLocations.filter((l) => l !== loc) }));

  const handleFinish = async () => {
    savePreferences(prefs);
    await syncToAPI(prefs);
    trackEvent("settings_onboarding_completed", {
      university: prefs.university,
      hometown: prefs.hometown,
      targetLocations: [...prefs.targetLocations, ...prefs.customLocations],
      industries: prefs.targetIndustries,
      firms: [...prefs.targetFirms, ...prefs.customFirms],
      greekLife: prefs.greekLifeEnabled ? prefs.greekOrganization : null,
    });
    onComplete();
    router.push("/dashboard");
  };

  const handleSkip = () => {
    trackEvent("settings_onboarding_skipped", { step });
    router.push("/dashboard");
  };

  const goNext = () => { if (step < TOTAL_STEPS - 1) setStep(step + 1); };
  const goBack = () => { if (step > 0) setStep(step - 1); };

  const allFirmsCount = prefs.targetFirms.length + prefs.customFirms.length;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-8">
      {step < TOTAL_STEPS - 1 && (
        <div className="w-full max-w-lg">
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleSkip}
              className="text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8 w-full max-w-lg">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 w-full transition-colors duration-300 ${i <= step ? "bg-accent-teal" : "bg-white/[0.06]"}`} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={i}
                className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors duration-300 ${
                  i <= step ? "text-accent-teal" : "text-muted-foreground/40"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-lg">
        <div className="border border-white/[0.06] bg-bg-card p-8">
          {step === 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your School</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Tell us where you&apos;re at so we can find your warmest alumni connections
              </h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">University</label>
                  <Input
                    placeholder="University of North Carolina at Chapel Hill"
                    value={prefs.university}
                    onChange={(e) => setPrefs({ ...prefs, university: e.target.value })}
                    className="bg-muted text-sm"
                  />
                </div>
                {/* Education rows in wizard step 0 */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Education{" "}
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                      {prefs.educations.length}/4
                    </span>
                  </label>
                  <EducationRowsEditor
                    rows={prefs.educations}
                    onChange={(rows) => setPrefs((p) => ({ ...p, educations: rows }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Greek Life</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrefs({ ...prefs, greekLifeEnabled: true })}
                      className={`border px-4 py-2 text-xs font-bold transition-colors ${prefs.greekLifeEnabled ? "border-accent-teal bg-accent-teal/15 text-accent-teal" : "border-white/[0.06] text-muted-foreground hover:text-foreground"}`}
                    >YES</button>
                    <button
                      onClick={() => setPrefs({ ...prefs, greekLifeEnabled: false, greekOrganization: "" })}
                      className={`border px-4 py-2 text-xs font-bold transition-colors ${!prefs.greekLifeEnabled ? "border-accent-teal bg-accent-teal/15 text-accent-teal" : "border-white/[0.06] text-muted-foreground hover:text-foreground"}`}
                    >NO</button>
                  </div>
                </div>
                {prefs.greekLifeEnabled && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organization Name</label>
                    <Input
                      placeholder="e.g. Chi Phi"
                      value={prefs.greekOrganization}
                      onChange={(e) => setPrefs({ ...prefs, greekOrganization: e.target.value })}
                      className="bg-muted text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your Location</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Where you&apos;re from and where you want to work helps us find local connections
              </h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Where are you from?</label>
                  <Input
                    placeholder="Charlotte, NC"
                    value={prefs.hometown}
                    onChange={(e) => setPrefs({ ...prefs, hometown: e.target.value })}
                    className="bg-muted text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Where do you want to work?</label>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_OPTIONS.map((loc) => {
                      const active = prefs.targetLocations.includes(loc);
                      return (
                        <button
                          key={loc}
                          onClick={() => toggleLocation(loc)}
                          className={`border px-4 py-2.5 text-xs font-bold transition-colors ${active ? "border-accent-teal bg-accent-teal/15 text-accent-teal" : "border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground"}`}
                        >{loc}</button>
                      );
                    })}
                  </div>
                </div>
                {prefs.customLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {prefs.customLocations.map((loc) => (
                      <span key={loc} className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal">
                        {loc}
                        <button onClick={() => removeCustomLocation(loc)} className="text-accent-teal/60 hover:text-accent-teal">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a location..."
                    value={customLocationInput}
                    onChange={(e) => setCustomLocationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomLocation(); } }}
                    className="bg-muted text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={addCustomLocation} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Experience rows in wizard step 1 */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Experience{" "}
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                      up to 8
                    </span>
                  </label>
                  <ExperienceRowsEditor
                    rows={prefs.experiences}
                    onChange={(rows) => setPrefs((p) => ({ ...p, experiences: rows }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Target Roles</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">Which roles are you recruiting for?</h2>
              <div className="mt-6">
                <TrackRolePicker selected={prefs.targetIndustries} onToggle={toggleIndustry} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Target Firms</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Which firms are you most interested in? We&apos;ll prioritize alumni at these.
              </h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {FIRM_OPTIONS.map((firm) => {
                  const active = prefs.targetFirms.includes(firm);
                  return (
                    <button
                      key={firm}
                      onClick={() => toggleFirm(firm)}
                      className={`border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-accent-teal bg-accent-teal/15 text-accent-teal" : "border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground"}`}
                    >{firm}</button>
                  );
                })}
              </div>
              {prefs.customFirms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {prefs.customFirms.map((firm) => (
                    <span key={firm} className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal">
                      {firm}
                      <button onClick={() => removeCustomFirm(firm)} className="text-accent-teal/60 hover:text-accent-teal">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Add a firm..."
                  value={customFirmInput}
                  onChange={(e) => setCustomFirmInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFirm(); } }}
                  className="bg-muted text-sm"
                />
                <Button size="sm" variant="outline" onClick={addCustomFirm} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-accent-teal/30 bg-accent-teal/10">
                <CheckCircle2 className="h-8 w-8 text-accent-teal" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">You&apos;re all set!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                KithNode is now configured to find your warmest paths into finance.
              </p>
              <div className="mt-6 space-y-2 text-left">
                {prefs.university && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <GraduationCap className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.university}{prefs.greekLifeEnabled && prefs.greekOrganization ? ` / ${prefs.greekOrganization}` : ""}
                    </span>
                  </div>
                )}
                {(prefs.hometown || prefs.targetLocations.length > 0 || prefs.customLocations.length > 0) && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <MapPin className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.hometown ? `From ${prefs.hometown}` : ""}
                      {prefs.hometown && (prefs.targetLocations.length + prefs.customLocations.length) > 0 ? " · " : ""}
                      {(prefs.targetLocations.length + prefs.customLocations.length) > 0
                        ? `${prefs.targetLocations.length + prefs.customLocations.length} target location${prefs.targetLocations.length + prefs.customLocations.length === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </div>
                )}
                {prefs.targetIndustries.length > 0 && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <Target className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.targetIndustries.length} industr{prefs.targetIndustries.length === 1 ? "y" : "ies"} selected
                    </span>
                  </div>
                )}
                {allFirmsCount > 0 && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <Building2 className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {allFirmsCount} firm{allFirmsCount === 1 ? "" : "s"} targeted
                    </span>
                  </div>
                )}
              </div>
              <Button
                className="mt-8 w-full bg-accent-teal py-5 text-sm font-bold text-white hover:bg-accent-teal/90"
                onClick={handleFinish}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>

        {step < TOTAL_STEPS - 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" />Back
                </Button>
              )}
            </div>
            <Button size="sm" className="gap-1 bg-accent-teal text-xs font-bold text-white hover:bg-accent-teal/90" onClick={goNext}>
              Continue<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === TOTAL_STEPS - 1 && (
          <div className="mt-4">
            <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(getDefaults);
  const [mode, setMode] = useState<"loading" | "wizard" | "panel">("loading");

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const data = await res.json();
          if (data && (data.university || data.hometown || data.greekOrg || data.targetIndustries?.length || data.targetFirms?.length || data.recruitingDate)) {
            const merged: Preferences = {
              university: data.university || "",
              highSchool: data.highSchool || "",
              greekLifeEnabled: !!data.greekOrg,
              greekOrganization: data.greekOrg || "",
              // Server synthesizes educations from flat fields when the array is absent.
              educations: Array.isArray(data.educations) ? data.educations : [],
              minors:
                typeof data.minor === "string" && data.minor
                  ? data.minor.split(",").map((m: string) => m.trim()).filter(Boolean).slice(0, 2)
                  : [],
              experiences: Array.isArray(data.experiences) ? data.experiences : [],
              clubMemberships: Array.isArray(data.clubMemberships) ? data.clubMemberships : [],
              skills: Array.isArray(data.skills) ? data.skills : [],
              hometown: data.hometown || "",
              // DB stores presets + customs as one flat list; split against the
              // preset option arrays or custom entries render nowhere (and the
              // dupe-guard then silently blocks re-adding them).
              targetLocations: Array.isArray(data.targetLocations)
                ? data.targetLocations.filter((l: string) => LOCATION_OPTIONS.includes(l))
                : [],
              customLocations: Array.isArray(data.targetLocations)
                ? data.targetLocations.filter((l: string) => !LOCATION_OPTIONS.includes(l))
                : [],
              targetIndustries: Array.isArray(data.targetIndustries) ? data.targetIndustries : [],
              targetFirms: Array.isArray(data.targetFirms)
                ? data.targetFirms.filter((f: string) => FIRM_OPTIONS.includes(f))
                : [],
              customFirms: Array.isArray(data.targetFirms)
                ? data.targetFirms.filter((f: string) => !FIRM_OPTIONS.includes(f))
                : [],
              recruitingDate: data.recruitingDate
                ? String(data.recruitingDate).slice(0, 10)
                : "",
              weeklyGoalTarget:
                typeof data.weeklyGoalTarget === "number" && data.weeklyGoalTarget > 0
                  ? data.weeklyGoalTarget
                  : 3,
            };
            setPrefs(merged);
            savePreferences(merged);
            setMode("panel");
            return;
          }
        }
      } catch (err) {
    Sentry.captureException(err);
        // fall through
      }
      // Check localStorage as fallback
      const local = loadPreferences();
      setPrefs(local);
      setMode(hasCompletedSetup(local) ? "panel" : "wizard");
    }
    init();
  }, []);

  const handlePanelSave = async (updated: Preferences) => {
    setPrefs(updated);
    savePreferences(updated);
    await syncToAPI(updated);
    trackEvent("settings_updated", {
      university: updated.university,
      hometown: updated.hometown,
      industries: updated.targetIndustries,
      firms: [...updated.targetFirms, ...updated.customFirms],
    });
  };

  if (mode === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>
    );
  }

  if (mode === "panel") {
    return (
      <EditPanel
        prefs={prefs}
        onSave={handlePanelSave}
        onRestartWizard={() => setMode("wizard")}
      />
    );
  }

  return (
    <Wizard
      initialPrefs={prefs}
      onComplete={() => setMode("panel")}
    />
  );
}
