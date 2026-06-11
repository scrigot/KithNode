"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/posthog";
import {
  loadUniversities,
  loadCities,
  loadHighSchools,
  loadGreekOrgs,
  loadClubs,
  loadMajors,
} from "@/lib/data/onboarding-options";
import {
  INDUSTRY_OPTIONS,
  FIRM_OPTIONS,
  LOCATION_OPTIONS,
} from "@/lib/data/preference-options";
import {
  parseLinkedInCSV,
  type CsvContact,
} from "@/lib/linkedin-csv";
import {
  GraduationCap,
  Target,
  Building2,
  Upload,
  Users,
  Plus,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarDays,
  FileText,
  Loader2,
} from "lucide-react";

// Contacts are POSTed to /api/import/linkedin in batches so the client can
// render a determinate progress bar instead of one long opaque request.
const IMPORT_BATCH_SIZE = 50;

const SAMPLE_CONTACTS: CsvContact[] = [
  {
    name: "Jordan Avery",
    title: "Investment Banking Analyst",
    firmName: "Goldman Sachs",
    email: "",
    education: "University of North Carolina at Chapel Hill",
    location: "New York",
    linkedInUrl: "https://linkedin.com/in/jordan-avery",
  },
  {
    name: "Morgan Patel",
    title: "Associate",
    firmName: "Blackstone",
    email: "",
    education: "Duke University",
    location: "New York",
    linkedInUrl: "https://linkedin.com/in/morgan-patel",
  },
  {
    name: "Casey Nguyen",
    title: "Consultant",
    firmName: "McKinsey",
    email: "",
    education: "University of North Carolina at Chapel Hill",
    location: "Charlotte",
    linkedInUrl: "https://linkedin.com/in/casey-nguyen",
  },
  {
    name: "Riley Thompson",
    title: "Product Manager",
    firmName: "Vercel",
    email: "",
    education: "University of North Carolina at Chapel Hill",
    location: "San Francisco",
    linkedInUrl: "https://linkedin.com/in/riley-thompson",
  },
  {
    name: "Taylor Brooks",
    title: "VP",
    firmName: "Morgan Stanley",
    email: "",
    education: "University of Virginia",
    location: "New York",
    linkedInUrl: "https://linkedin.com/in/taylor-brooks",
  },
];

interface RankedLite {
  id: string;
  name: string;
  title: string;
  company: { name: string };
  score: { total_score: number; tier: string };
}

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

// ─── Step indicator ────────────────────────────────────────────────────────
const STEPS = ["Profile", "Targets", "Contacts", "Pipeline"];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
              i === step
                ? "text-accent-teal"
                : i < step
                  ? "text-foreground"
                  : "text-muted-foreground/40"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center border text-[9px] ${
                i === step
                  ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                  : i < step
                    ? "border-white/[0.12] text-foreground"
                    : "border-white/[0.06] text-muted-foreground/40"
              }`}
            >
              {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            {label}
          </div>
          {i < STEPS.length - 1 && (
            <span className="h-px w-6 bg-white/[0.1]" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Chip toggle group ─────────────────────────────────────────────────────
function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              active
                ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                : "border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — profile (who are you?)
  const [university, setUniversity] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [hometown, setHometown] = useState("");
  const [greekLifeEnabled, setGreekLifeEnabled] = useState(false);
  const [greekOrg, setGreekOrg] = useState("");
  const [majors, setMajors] = useState<string[]>([]);
  const [majorInput, setMajorInput] = useState("");
  const [minors, setMinors] = useState<string[]>([]);
  const [minorInput, setMinorInput] = useState("");
  const [clubs, setClubs] = useState<string[]>([]);
  const [clubInput, setClubInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Resume autofill — prefills empty step-1 + step-2 fields only.
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFilled, setResumeFilled] = useState<Set<string>>(new Set());

  // Step 2 — targets (what are you hunting?)
  const [industries, setIndustries] = useState<string[]>([]);
  const [firms, setFirms] = useState<string[]>([]);
  const [customFirm, setCustomFirm] = useState("");
  const [pastFirms, setPastFirms] = useState<string[]>([]);
  const [pastFirmInput, setPastFirmInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [recruitingDate, setRecruitingDate] = useState("");
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(3);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Step 3 — contacts
  const [csvContacts, setCsvContacts] = useState<CsvContact[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualName, setManualName] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContacts, setManualContacts] = useState<CsvContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  // Determinate import progress (chunked POSTs) across all import sources.
  const [importDone, setImportDone] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [enrichDone, setEnrichDone] = useState(0);
  const [enrichRemaining, setEnrichRemaining] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [manualImported, setManualImported] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  // Aborts the background enrich loop when the wizard unmounts so we never
  // keep POSTing after navigation.
  const enrichAbortRef = useRef(false);

  // Step 4 — pick
  const [ranked, setRanked] = useState<RankedLite[]>([]);
  const [loadingRanked, setLoadingRanked] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);

  // Abort the enrich loop if the wizard unmounts mid-flight.
  useEffect(() => {
    return () => {
      enrichAbortRef.current = true;
    };
  }, []);

  // Hydrate step 1 + 2 from any saved preferences so a returning user resuming
  // onboarding doesn't lose fields they already entered.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/user/preferences");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        if (typeof data.university === "string") setUniversity(data.university);
        if (typeof data.highSchool === "string") setHighSchool(data.highSchool);
        if (typeof data.hometown === "string") setHometown(data.hometown);
        if (typeof data.greekOrg === "string" && data.greekOrg) {
          setGreekLifeEnabled(true);
          setGreekOrg(data.greekOrg);
        }
        // major/minor are comma-joined strings on the User row → chip arrays.
        if (typeof data.major === "string" && data.major)
          setMajors(
            data.major.split(",").map((m: string) => m.trim()).filter(Boolean).slice(0, 2),
          );
        if (typeof data.minor === "string" && data.minor)
          setMinors(
            data.minor.split(",").map((m: string) => m.trim()).filter(Boolean).slice(0, 2),
          );
        if (Array.isArray(data.clubs)) setClubs(data.clubs.slice(0, 3));
        if (Array.isArray(data.skills)) setSkills(data.skills.slice(0, 10));
        if (Array.isArray(data.targetIndustries))
          setIndustries(data.targetIndustries);
        // DB stores presets + customs flat; both render fine through the chip
        // group (presets toggle, customs append), so keep the full list.
        if (Array.isArray(data.targetFirms)) setFirms(data.targetFirms);
        if (Array.isArray(data.pastFirms)) setPastFirms(data.pastFirms.slice(0, 8));
        if (Array.isArray(data.targetLocations))
          setLocations(data.targetLocations);
        if (data.recruitingDate)
          setRecruitingDate(String(data.recruitingDate).slice(0, 10));
        if (typeof data.weeklyGoalTarget === "number" && data.weeklyGoalTarget > 0)
          setWeeklyGoalTarget(data.weeklyGoalTarget);
      } catch {
        // Non-fatal: a fresh user simply starts with empty fields.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Step 1 handlers (profile) ────────────────────────────────────────────
  const addMajor = (v: string) => {
    const m = v.trim();
    setMajors((p) => (m && !p.includes(m) && p.length < 2 ? [...p, m] : p));
    setMajorInput("");
  };
  const removeMajor = (v: string) =>
    setMajors((p) => p.filter((m) => m !== v));
  const addMinor = (v: string) => {
    const m = v.trim();
    setMinors((p) => (m && !p.includes(m) && p.length < 2 ? [...p, m] : p));
    setMinorInput("");
  };
  const removeMinor = (v: string) =>
    setMinors((p) => p.filter((m) => m !== v));
  const addClub = (v: string) => {
    const club = v.trim();
    setClubs((p) =>
      club && !p.includes(club) && p.length < 3 ? [...p, club] : p,
    );
    setClubInput("");
  };
  const removeClub = (v: string) => setClubs((p) => p.filter((c) => c !== v));
  const addSkill = () => {
    const skill = skillInput.trim();
    setSkills((p) =>
      skill && !p.includes(skill) && p.length < 10 ? [...p, skill] : p,
    );
    setSkillInput("");
  };
  const removeSkill = (v: string) =>
    setSkills((p) => p.filter((s) => s !== v));

  // ── Resume autofill ──────────────────────────────────────────────────────
  // Parse a PDF client-side → base64 → POST. Prefill ONLY fields that are
  // currently empty so we never clobber what the user already typed. Tracks
  // which fields were filled to drive a brief highlight. Uses functional state
  // updates that re-check emptiness at apply time (avoids stale closures when
  // multiple fields fill in the same tick).
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

      const res = await apiFetch("/api/profile/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64 }),
      });
      if (!res.ok) throw new Error("extract failed");
      const data = await res.json();

      const filled = new Set<string>();
      const fillStr = (key: string, setter: (v: string) => void, value: unknown, cur: string) => {
        if (!cur.trim() && typeof value === "string" && value.trim()) {
          setter(value.trim());
          filled.add(key);
        }
      };
      const fillList = (
        key: string,
        setter: (v: string[]) => void,
        value: unknown,
        cur: string[],
        cap: number,
      ) => {
        if (cur.length === 0 && Array.isArray(value)) {
          const next = value
            .map((v) => String(v).trim())
            .filter(Boolean)
            .slice(0, cap);
          if (next.length) {
            setter(next);
            filled.add(key);
          }
        }
      };

      fillStr("university", setUniversity, data.university, university);
      fillStr("highSchool", setHighSchool, data.highSchool, highSchool);
      fillStr("hometown", setHometown, data.hometown, hometown);
      if (!greekOrg.trim() && typeof data.greekOrg === "string" && data.greekOrg.trim()) {
        setGreekLifeEnabled(true);
        setGreekOrg(data.greekOrg.trim());
        filled.add("greekOrg");
      }
      fillList("majors", setMajors, data.majors, majors, 2);
      fillList("minors", setMinors, data.minors, minors, 2);
      fillList("clubs", setClubs, data.clubs, clubs, 3);
      fillList("skills", setSkills, data.skills, skills, 10);
      fillList("pastFirms", setPastFirms, data.pastFirms, pastFirms, 8);
      fillList("industries", setIndustries, data.targetIndustries, industries, 7);

      setResumeFilled(filled);
      setTimeout(() => setResumeFilled(new Set()), 2500);
    } catch {
      setResumeError("Couldn't read that resume. Fill the fields manually.");
    } finally {
      setResumeLoading(false);
    }
  };

  // ── Step 2 handlers (targets) ────────────────────────────────────────────
  const toggleIndustry = (v: string) =>
    setIndustries((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleFirm = (v: string) =>
    setFirms((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const addLocation = (v: string) => {
    const loc = v.trim();
    if (!loc) return;
    setLocations((p) => (p.includes(loc) ? p : [...p, loc]));
  };
  const removeLocation = (v: string) =>
    setLocations((p) => p.filter((x) => x !== v));

  const addCustomFirm = () => {
    const f = customFirm.trim();
    if (!f || firms.includes(f)) return;
    setFirms((p) => [...p, f]);
    setCustomFirm("");
  };

  const addPastFirm = () => {
    const f = pastFirmInput.trim();
    if (!f || pastFirms.includes(f) || pastFirms.length >= 8) return;
    setPastFirms((p) => [...p, f]);
    setPastFirmInput("");
  };
  const removePastFirm = (v: string) =>
    setPastFirms((p) => p.filter((x) => x !== v));

  // Step 1 only gates on university (the dashboard layout redirects to
  // onboarding while it's empty); everything else on this step is optional.
  const goToTargets = () => {
    if (!university.trim()) {
      setPrefsError("University is required.");
      return;
    }
    setPrefsError(null);
    setStep(1);
  };

  // Step 2 → 3: persist the FULL step 1 + 2 payload before advancing. On
  // failure, surface a retry and stay put rather than silently moving on.
  const savePrefs = async () => {
    setSavingPrefs(true);
    setPrefsError(null);
    try {
      const res = await apiFetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_university: university.trim(),
          high_school: highSchool.trim(),
          hometown: hometown.trim(),
          greek_life: greekLifeEnabled ? greekOrg.trim() : "",
          major: majors.join(", "),
          minor: minors.join(", "),
          clubs,
          skills,
          past_firms: pastFirms,
          target_industries: industries,
          target_companies: firms,
          target_locations: locations,
          recruiting_date: recruitingDate || null,
          weekly_goal_target: weeklyGoalTarget || 3,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      trackEvent("onboarding_profile_saved", {
        university: university.trim(),
        firms: firms.length,
        industries: industries.length,
      });
      setStep(2);
    } catch {
      setPrefsError("Could not save your preferences. Try again.");
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Step 3 handlers (contacts) ───────────────────────────────────────────
  const handleCSVFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setContactsError("Only .csv files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const contacts = parseLinkedInCSV(text);
        setCsvContacts(contacts);
        setCsvFileName(file.name);
        setContactsError(null);
      } catch (err) {
        setContactsError(
          err instanceof Error ? err.message : "Failed to parse CSV.",
        );
        setCsvContacts([]);
        setCsvFileName(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
  };

  const addManualContact = () => {
    const name = manualName.trim();
    if (!name) return;
    setManualContacts((p) => [
      ...p,
      {
        name,
        title: manualTitle.trim(),
        firmName: manualCompany.trim(),
        email: "",
        education: "",
        location: "",
        linkedInUrl: "",
      },
    ]);
    setManualName("");
    setManualCompany("");
    setManualTitle("");
  };

  // Background enrich loop, mirroring the dashboard contacts "Enrich All"
  // pattern: POST /api/contacts/enrich repeatedly until the server reports
  // remaining === 0, a request fails, a 402 (Pro paywall) is hit, or the
  // wizard unmounts. Never blocks navigation — the progress chip rides along
  // in the header while the user moves through steps 3-4.
  const runEnrich = useCallback(async () => {
    enrichAbortRef.current = false;
    setEnriching(true);
    setEnrichDone(0);
    setEnrichRemaining(0);
    let totalEnriched = 0;
    try {
      // Safety cap: 40 batches × 25 = 1000 contacts max.
      for (let batch = 0; batch < 40; batch++) {
        if (enrichAbortRef.current) break;
        const res = await apiFetch("/api/contacts/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        // Enrich is a Pro feature; a 402 just ends the loop quietly here.
        if (res.status === 402) break;
        if (!res.ok) break;
        const data: { enriched?: number; remaining?: number } =
          await res.json();
        const enriched = data.enriched ?? 0;
        const remaining = data.remaining ?? 0;
        totalEnriched += enriched;
        setEnrichDone(totalEnriched);
        setEnrichRemaining(remaining);
        // Nothing left, or a batch made no progress (persistent-failure guard).
        if (remaining === 0 || enriched === 0) break;
      }
    } catch {
      // Non-fatal: enrichment improves scores but isn't required to continue.
    } finally {
      if (!enrichAbortRef.current) setEnriching(false);
    }
  }, []);

  const importContacts = useCallback(
    async (contacts: CsvContact[], label: string) => {
      if (contacts.length === 0) return;
      setImporting(true);
      setManualImported(false);
      setContactsError(null);
      setImportTotal(contacts.length);
      setImportDone(0);
      let importedTotal = 0;
      try {
        // Chunk the POSTs so the bar advances per batch instead of hanging on
        // one slow request for the whole CSV.
        for (let i = 0; i < contacts.length; i += IMPORT_BATCH_SIZE) {
          const batch = contacts.slice(i, i + IMPORT_BATCH_SIZE);
          const res = await apiFetch("/api/import/linkedin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contacts: batch }),
          });
          if (!res.ok) throw new Error("import failed");
          const data: { imported: number } = await res.json();
          importedTotal += data.imported ?? 0;
          setImportDone(Math.min(i + batch.length, contacts.length));
        }
        setImportedCount((c) => c + importedTotal);
        trackEvent("onboarding_contacts_imported", {
          source: label,
          imported: importedTotal,
        });
        if (label === "manual") {
          // A successful manual import drains the queued chips and flags the
          // success state so the user gets clear confirmation.
          setManualContacts([]);
          setManualImported(true);
        }
        // Auto-start enrichment in the background. Fire-and-forget so import is
        // considered done immediately and the user can advance through the
        // wizard while the enrich chip keeps progressing in the header.
        setImporting(false);
        void runEnrich();
      } catch {
        setContactsError("Import failed. Try again.");
        setImporting(false);
      }
    },
    [runEnrich],
  );

  const handleEnterPipeline = async () => {
    setStep(3);
    setLoadingRanked(true);
    try {
      const res = await apiFetch("/api/contacts");
      const data: RankedLite[] = res.ok ? await res.json() : [];
      setRanked(data.slice(0, 15));
    } catch {
      setRanked([]);
    } finally {
      setLoadingRanked(false);
    }
  };

  // ── Step 4 handlers (pick) ───────────────────────────────────────────────
  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await Promise.all(
        Array.from(picked).map((id) =>
          apiFetch(`/api/pipeline/${id}`, { method: "POST" }),
        ),
      );
      trackEvent("onboarding_completed", { pipelined: picked.size });
    } catch {
      // Best-effort: still land them on discover.
    } finally {
      router.push("/dashboard/discover");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-accent-teal">
              Set up KithNode
            </h1>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Four steps to your warm-path network
            </p>
            {/* Background enrich progress — rides along in the header across
                steps 3-4 and never blocks navigation. */}
            {enriching && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 font-mono text-[10px] font-bold tabular-nums text-accent-teal">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Enriching {enrichDone}
                {enrichRemaining > 0 ? `/${enrichDone + enrichRemaining}` : ""}
                ...
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground"
            >
              Sign out
            </button>
            <StepIndicator step={step} />
          </div>
        </div>
        <div className="h-px bg-border" />

        {/* ─── STEP 1: PROFILE — WHO ARE YOU? ──────────────────────────── */}
        {step === 0 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <GraduationCap size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Who are you?
                </h2>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Every field lights up matches in your network. Skip what
                doesn&apos;t apply.
              </p>

              {/* Resume autofill — prefills empty fields only, never stored. */}
              <div className="mb-3 border border-dashed border-accent-teal/30 bg-accent-teal/[0.04] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-accent-teal" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
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
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Parsed locally, never stored. Only fills empty fields, review
                  before you continue.
                </p>
                {resumeError && (
                  <p className="mt-1 text-[10px] text-red-400">{resumeError}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    University <span className="text-accent-teal">*</span>
                  </label>
                  <Combobox
                    value={university}
                    onSelect={setUniversity}
                    loadOptions={loadUniversities}
                    placeholder="University of North Carolina at Chapel Hill"
                    ariaLabel="University"
                    matchAcronyms
                  />
                </div>
                <div className={resumeFilled.has("majors") ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Major <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">{majors.length}/2</span>
                  </label>
                  {majors.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {majors.map((m) => (
                        <span
                          key={m}
                          className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => removeMajor(m)}
                            className="text-accent-teal/60 hover:text-accent-teal"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {majors.length < 2 && (
                    <Combobox
                      value={majorInput}
                      onSelect={addMajor}
                      loadOptions={loadMajors}
                      placeholder="Add a major..."
                      ariaLabel="Major"
                    />
                  )}
                </div>
                <div className={resumeFilled.has("minors") ? "rounded-sm ring-1 ring-accent-teal/60" : ""}>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Minor <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">{minors.length}/2</span>
                  </label>
                  {minors.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {minors.map((m) => (
                        <span
                          key={m}
                          className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => removeMinor(m)}
                            className="text-accent-teal/60 hover:text-accent-teal"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {minors.length < 2 && (
                    <Combobox
                      value={minorInput}
                      onSelect={addMinor}
                      loadOptions={loadMajors}
                      placeholder="Add a minor..."
                      ariaLabel="Minor"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    High School
                  </label>
                  <Combobox
                    value={highSchool}
                    onSelect={(v) => {
                      // Display label is "Name — City, ST"; store only the name.
                      const name = v.includes(" — ") ? v.split(" — ")[0] : v;
                      setHighSchool(name);
                    }}
                    loadOptions={loadHighSchools}
                    placeholder="East Chapel Hill High School"
                    ariaLabel="High School"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Hometown
                  </label>
                  <Combobox
                    value={hometown}
                    onSelect={setHometown}
                    loadOptions={loadCities}
                    placeholder="Charlotte, NC"
                    ariaLabel="Hometown"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    In greek life?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGreekLifeEnabled(true)}
                      className={`border px-4 py-1.5 text-[11px] font-bold transition-colors ${
                        greekLifeEnabled
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGreekLifeEnabled(false);
                        setGreekOrg("");
                      }}
                      className={`border px-4 py-1.5 text-[11px] font-bold transition-colors ${
                        !greekLifeEnabled
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
                {greekLifeEnabled && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Organization
                    </label>
                    <Combobox
                      value={greekOrg}
                      onSelect={setGreekOrg}
                      loadOptions={loadGreekOrgs}
                      placeholder="e.g. Chi Phi"
                      ariaLabel="Greek Organization"
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Users size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Top Clubs
                </h2>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                  {clubs.length}/3
                </span>
              </div>
              {clubs.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {clubs.map((club) => (
                    <span
                      key={club}
                      className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                    >
                      {club}
                      <button
                        type="button"
                        onClick={() => removeClub(club)}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {clubs.length < 3 && (
                <Combobox
                  value={clubInput}
                  onSelect={addClub}
                  loadOptions={loadClubs}
                  placeholder="Add a club..."
                  ariaLabel="Top clubs"
                />
              )}
            </section>

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Skills
                </h2>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                  {skills.length}/10
                </span>
              </div>
              {skills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {skills.length < 10 && (
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add a skill, then press Enter..."
                  aria-label="Skills"
                  className="bg-muted text-sm"
                />
              )}
            </section>

            {prefsError && (
              <p className="text-[11px] text-red-400">{prefsError}</p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={goToTargets}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: TARGETS — WHAT ARE YOU HUNTING? ─────────────────── */}
        {step === 1 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Industries
                </h2>
              </div>
              <ChipGroup
                options={INDUSTRY_OPTIONS}
                selected={industries}
                onToggle={toggleIndustry}
              />
            </section>

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Firms
                </h2>
              </div>
              <ChipGroup
                options={[
                  ...FIRM_OPTIONS,
                  ...firms.filter((f) => !FIRM_OPTIONS.includes(f)),
                ]}
                selected={firms}
                onToggle={toggleFirm}
              />
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add a firm..."
                  value={customFirm}
                  onChange={(e) => setCustomFirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomFirm();
                    }
                  }}
                  className="bg-muted text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addCustomFirm}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <section
              className={`border bg-bg-card p-5 ${resumeFilled.has("pastFirms") ? "border-accent-teal/60 ring-1 ring-accent-teal/60" : "border-white/[0.06]"}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Past Employers
                </h2>
              </div>
              {pastFirms.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pastFirms.map((firm) => (
                    <span
                      key={firm}
                      className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
                    >
                      {firm}
                      <button
                        onClick={() => removePastFirm(firm)}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {pastFirms.length < 8 && (
                <Input
                  placeholder="Add a past employer..."
                  value={pastFirmInput}
                  onChange={(e) => setPastFirmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPastFirm();
                    }
                  }}
                  className="bg-muted text-sm"
                />
              )}
            </section>

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Locations
                </h2>
              </div>
              <ChipGroup
                options={[
                  ...LOCATION_OPTIONS,
                  ...locations.filter((l) => !LOCATION_OPTIONS.includes(l)),
                ]}
                selected={locations}
                onToggle={(v) =>
                  locations.includes(v) ? removeLocation(v) : addLocation(v)
                }
              />
              <div className="mt-3">
                <Combobox
                  value=""
                  onSelect={addLocation}
                  loadOptions={loadCities}
                  placeholder="Add a city..."
                  ariaLabel="Target locations"
                />
              </div>
            </section>

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recruiting Timeline
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target recruiting date
                  </label>
                  <Input
                    type="date"
                    value={recruitingDate}
                    onChange={(e) => setRecruitingDate(e.target.value)}
                    aria-label="Target recruiting date"
                    className="bg-muted text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Weekly coffee-chat goal
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={weeklyGoalTarget}
                    onChange={(e) =>
                      setWeeklyGoalTarget(Number(e.target.value))
                    }
                    aria-label="Weekly coffee-chat goal"
                    className="bg-muted text-sm"
                  />
                </div>
              </div>
            </section>

            {prefsError && (
              <p className="text-[11px] text-red-400">{prefsError}</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(0)}
                disabled={savingPrefs}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={savePrefs}
                disabled={savingPrefs}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {savingPrefs ? "Saving..." : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: CONTACTS ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-4 space-y-3">
            {/* CSV upload */}
            <section className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                  <Upload className="h-3 w-3" />
                  LinkedIn CSV
                </span>
                {csvContacts.length > 0 && (
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    {csvContacts.length} parsed
                  </span>
                )}
              </div>
              <div className="p-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-colors ${
                    dragging
                      ? "border-accent-teal bg-accent-teal/10"
                      : csvFileName
                        ? "border-accent-teal/40 bg-accent-teal/5"
                        : "border-white/[0.1] bg-muted hover:border-white/[0.25]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {csvFileName ? (
                    <div className="text-center">
                      <p className="text-[12px] font-bold text-foreground">
                        {csvFileName}
                      </p>
                      <p className="mt-1 text-[10px] text-accent-teal">
                        {csvContacts.length} contacts found
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Drop CSV here or click to browse
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                        LinkedIn &gt; Settings &gt; Get a copy of your data
                      </p>
                    </div>
                  )}
                </div>
                {csvContacts.length > 0 && (
                  <Button
                    onClick={() => importContacts(csvContacts, "csv")}
                    disabled={importing || enriching}
                    className="mt-3 w-full bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
                  >
                    {importing
                      ? "Importing..."
                      : `Import ${csvContacts.length} Contacts`}
                  </Button>
                )}
              </div>
            </section>

            {/* Manual add */}
            <section className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                  <Users className="h-3 w-3" />
                  Add a few manually
                </span>
                {manualContacts.length > 0 && (
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    {manualContacts.length} queued
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-muted text-sm"
                  />
                  <Input
                    placeholder="Company"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    className="bg-muted text-sm"
                  />
                  <Input
                    placeholder="Title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addManualContact();
                      }
                    }}
                    className="bg-muted text-sm"
                  />
                </div>
                {manualContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {manualContacts.map((c, i) => (
                      <span
                        key={`${c.name}-${i}`}
                        className="flex items-center gap-1.5 border border-white/[0.06] bg-muted px-2 py-1 text-[10px] text-foreground"
                      >
                        {c.name}
                        {c.firmName ? (
                          <span className="text-muted-foreground">
                            @ {c.firmName}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setManualContacts((p) =>
                              p.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-muted-foreground/60 hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addManualContact}
                    disabled={!manualName.trim()}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                  {manualContacts.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => importContacts(manualContacts, "manual")}
                      disabled={importing || enriching}
                      className="bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
                    >
                      {importing
                        ? "Importing..."
                        : `Import ${manualContacts.length}`}
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Sample / skip */}
            <section className="flex items-center justify-between border border-white/[0.06] bg-bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                No CSV handy? Load a few sample contacts to try it out.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => importContacts(SAMPLE_CONTACTS, "sample")}
                disabled={importing || enriching}
                className="text-[11px] font-bold uppercase tracking-wider"
              >
                Use Sample
              </Button>
            </section>

            {/* Import progress — determinate, per-batch. Enrichment shows in
                the header chip and continues in the background. */}
            {(importing || importedCount > 0) && (
              <div className="space-y-2 border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
                  <p className="text-[11px] font-bold text-accent-teal">
                    {importing
                      ? `Imported ${importDone}/${importTotal}...`
                      : manualImported
                        ? `${importedCount} contacts imported. Enriching in the background. Queue cleared.`
                        : `${importedCount} contacts imported. Enriching in the background.`}
                  </p>
                </div>
                <div className="h-1 w-full bg-white/[0.08]">
                  <div
                    className="h-full bg-accent-teal transition-all duration-200"
                    style={{
                      width: importing
                        ? `${importTotal > 0 ? Math.round((importDone / importTotal) * 100) : 0}%`
                        : "100%",
                    }}
                  />
                </div>
              </div>
            )}

            {contactsError && (
              <p className="text-[11px] text-red-400">{contactsError}</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleEnterPipeline}
                disabled={importing}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {importedCount > 0 ? "Pick contacts" : "Skip for now"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: PICK 5 ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                  <Users className="h-3 w-3" />
                  Pick up to 5 for your pipeline
                </span>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  {picked.size}/5 selected
                </span>
              </div>
              <div className="p-2">
                {loadingRanked ? (
                  <div className="space-y-1 p-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse bg-muted" />
                    ))}
                  </div>
                ) : ranked.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <Users className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-[12px] text-muted-foreground">
                      No ranked contacts yet. You can add some later from Import
                      or Discover.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {ranked.map((c) => {
                      const isPicked = picked.has(c.id);
                      const atLimit = picked.size >= 5 && !isPicked;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => togglePick(c.id)}
                          disabled={atLimit}
                          className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors ${
                            isPicked
                              ? "border-accent-teal bg-accent-teal/10"
                              : atLimit
                                ? "cursor-not-allowed border-white/[0.06] opacity-40"
                                : "border-white/[0.06] hover:bg-white/[0.02]"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                              isPicked
                                ? "border-accent-teal bg-accent-teal text-white"
                                : "border-white/[0.2]"
                            }`}
                          >
                            {isPicked && <Check className="h-3 w-3" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-bold text-foreground">
                              {c.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {c.title}
                              {c.company?.name ? ` @ ${c.company.name}` : ""}
                            </p>
                          </div>
                          <span className="text-right">
                            <span
                              className={`font-mono text-[13px] font-bold tabular-nums ${
                                TIER_STYLES[c.score?.tier] || "text-zinc-400"
                              }`}
                            >
                              {Math.round(c.score?.total_score ?? 0)}
                            </span>
                            <span className="block text-[8px] uppercase text-muted-foreground">
                              {c.score?.tier}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={finish}
                disabled={finishing}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {finishing
                  ? "Finishing..."
                  : picked.size > 0
                    ? `Add ${picked.size} & finish`
                    : "Go to Discover"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
