"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  loadMinors,
  loadSkills,
} from "@/lib/data/onboarding-options";
import {
  FIRM_OPTIONS,
  LOCATION_OPTIONS,
} from "@/lib/data/preference-options";
import type { EducationEntry, ExperienceEntry } from "@/lib/educations";
import type { ClubEntry } from "@/lib/club-memberships";
import { EducationRowsEditor } from "@/components/education-rows-editor";
import { ExperienceRowsEditor } from "@/components/experience-rows-editor";
import { ClubRowsEditor } from "@/components/club-rows-editor";
import { TrackRolePicker } from "@/components/track-role-picker";
import { ActivationStep } from "./activation-step";
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
  Network,
  Lock,
} from "lucide-react";

// Contacts are POSTed to /api/import/linkedin in batches so the client can
// render a determinate progress bar instead of one long opaque request.
const IMPORT_BATCH_SIZE = 50;

// ─── Conversion-funnel diagnose options ──────────────────────────────────────
// Step 2 goal chips. Each goal seeds targetIndustries with the matching
// CAREER_TRACKS role name(s) so the warmth scorer + reveal have something to
// work with immediately. "Other" seeds nothing.
const GOAL_OPTIONS = [
  "Investment Banking",
  "Private Equity",
  "Consulting",
  "Software Engineering",
  "AI/ML",
  "Quant",
  "Other",
] as const;

const GOAL_TO_INDUSTRIES: Record<string, string[]> = {
  "Investment Banking": ["Investment Banking"],
  "Private Equity": ["Private Equity"],
  Consulting: ["Management Consulting"],
  "Software Engineering": ["Software Engineering"],
  "AI/ML": ["AI Engineer", "ML Engineer"],
  Quant: ["Quant"],
  Other: [],
};

const PAIN_OPTIONS = [
  "I don't know who to reach out to",
  "Cold outreach gets ignored",
  "No warm intros",
  "Can't find the right alumni",
  "My recruiting timeline is tight",
] as const;

const TIMELINE_OPTIONS = [
  "This summer",
  "This fall",
  "2027 cycle",
  "Just exploring",
] as const;

// Reveal copy keyed off the pain the user selected — echoes their own words
// back before the paywall. First matched pain wins.
const PAIN_ECHO: Record<string, string> = {
  "Cold outreach gets ignored":
    "You said cold outreach gets ignored. Warm paths get answered.",
  "I don't know who to reach out to":
    "You said you don't know who to reach out to. Here's exactly who.",
  "No warm intros": "You said no warm intros. Every match below is one.",
  "Can't find the right alumni":
    "You said you can't find the right alumni. We found them.",
  "My recruiting timeline is tight":
    "You said your timeline is tight. Start with the warmest paths first.",
};

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
// Ten funnel steps. Labels stay terse so the tracker fits the header; the
// "Step N of 10" count below it carries the progress narrative.
const STEPS = [
  "Welcome",
  "Goal",
  "Pain",
  "Timeline",
  "You",
  "Resume",
  "Targets",
  "Edges",
  "Connect",
  "Reveal",
];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className={`flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors ${
              i === step
                ? "text-accent-teal"
                : i < step
                  ? "text-foreground"
                  : "text-muted-foreground/40"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center border text-[8px] ${
                i === step
                  ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                  : i < step
                    ? "border-white/[0.12] text-foreground"
                    : "border-white/[0.06] text-muted-foreground/40"
              }`}
            >
              {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <span className="hidden h-px w-3 bg-white/[0.1] sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Single-select chip group ────────────────────────────────────────────────
function SingleChipGroup({
  options,
  selected,
  onSelect,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`border px-4 py-2 text-[12px] font-bold transition-colors ${
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

// ─── Multi-select chip group ─────────────────────────────────────────────────
function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
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
function OnboardingFunnel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?activate=1 is how the dashboard gate bounces an already-onboarded but
  // unpaid user straight to the paywall, skipping steps 1-10.
  const activateDirect = searchParams.get("activate") === "1";
  // Steps 0-9 are the funnel; step 10 renders the activation/paywall screen.
  const ACTIVATION_STEP = 10;
  const [step, setStep] = useState(activateDirect ? ACTIVATION_STEP : 0);

  // Diagnose answers (steps 2-4)
  const [onboardingGoal, setOnboardingGoal] = useState("");
  const [onboardingPain, setOnboardingPain] = useState<string[]>([]);
  const [onboardingTimeline, setOnboardingTimeline] = useState("");

  // Identity + edges (the old profile step, split across You + Edges)
  const [university, setUniversity] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [hometown, setHometown] = useState("");
  const [greekLifeEnabled, setGreekLifeEnabled] = useState(false);
  const [greekOrg, setGreekOrg] = useState("");
  // Education rows replace flat majors/degrees/concentration
  const [educations, setEducations] = useState<EducationEntry[]>([]);
  const [minors, setMinors] = useState<string[]>([]);
  const [minorInput, setMinorInput] = useState("");
  const [clubMemberships, setClubMemberships] = useState<ClubEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillKey, setSkillKey] = useState(0);

  // Resume autofill — prefills empty profile fields only.
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFilled, setResumeFilled] = useState<Set<string>>(new Set());

  // Targets (what are you hunting?)
  const [industries, setIndustries] = useState<string[]>([]);
  const [firms, setFirms] = useState<string[]>([]);
  const [customFirm, setCustomFirm] = useState("");
  // Experience rows replace flat pastFirms
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [recruitingDate, setRecruitingDate] = useState("");
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(3);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Connect network — contacts
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

  // Reveal — reuses the ranked network the pipeline step already computed.
  const [ranked, setRanked] = useState<RankedLite[]>([]);
  const [loadingRanked, setLoadingRanked] = useState(false);

  // Abort the enrich loop if the wizard unmounts mid-flight.
  useEffect(() => {
    return () => {
      enrichAbortRef.current = true;
    };
  }, []);

  // Hydrate from saved preferences so a returning user resuming onboarding
  // doesn't lose fields (including diagnose answers) they already entered.
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
        // Server synthesizes educations from flat fields when array is absent.
        if (Array.isArray(data.educations) && data.educations.length > 0) {
          setEducations(data.educations);
        }
        if (typeof data.minor === "string" && data.minor)
          setMinors(
            data.minor.split(",").map((m: string) => m.trim()).filter(Boolean).slice(0, 2),
          );
        if (Array.isArray(data.clubMemberships) && data.clubMemberships.length > 0)
          setClubMemberships(data.clubMemberships.slice(0, 6));
        if (Array.isArray(data.skills)) setSkills(data.skills.slice(0, 10));
        if (Array.isArray(data.targetIndustries))
          setIndustries(data.targetIndustries);
        // DB stores presets + customs flat; both render fine through the chip
        // group (presets toggle, customs append), so keep the full list.
        if (Array.isArray(data.targetFirms)) setFirms(data.targetFirms);
        // Experience rows from server (synthesized from flat pastFirms when absent).
        if (Array.isArray(data.experiences) && data.experiences.length > 0) {
          setExperiences(data.experiences);
        }
        if (Array.isArray(data.targetLocations))
          setLocations(data.targetLocations);
        if (data.recruitingDate)
          setRecruitingDate(String(data.recruitingDate).slice(0, 10));
        if (typeof data.weeklyGoalTarget === "number" && data.weeklyGoalTarget > 0)
          setWeeklyGoalTarget(data.weeklyGoalTarget);
        // Diagnose answers — resume the funnel where they left off.
        if (typeof data.onboardingGoal === "string")
          setOnboardingGoal(data.onboardingGoal);
        if (Array.isArray(data.onboardingPain))
          setOnboardingPain(data.onboardingPain);
        if (typeof data.onboardingTimeline === "string")
          setOnboardingTimeline(data.onboardingTimeline);
      } catch {
        // Non-fatal: a fresh user simply starts with empty fields.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Diagnose persistence ─────────────────────────────────────────────────
  // Fire-and-forget save of just the funnel field(s) on advancing past a
  // diagnose step. Partial-patch on the server means this never clobbers other
  // answers, so a user who leaves mid-funnel resumes where they stopped.
  const saveFunnel = useCallback((patch: Record<string, unknown>) => {
    void apiFetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {
      // Non-fatal: the full payload re-saves these on the You/Targets commit.
    });
  }, []);

  // ── Profile handlers ─────────────────────────────────────────────────────
  const addMinor = (v: string) => {
    const m = v.trim();
    setMinors((p) => (m && !p.includes(m) && p.length < 2 ? [...p, m] : p));
    setMinorInput("");
  };
  const removeMinor = (v: string) =>
    setMinors((p) => p.filter((m) => m !== v));
  const addSkill = (raw: string) => {
    const skill = raw.trim();
    setSkillKey((k) => k + 1); // remount the Combobox to clear its input
    setSkills((p) =>
      skill && !p.includes(skill) && p.length < 10 ? [...p, skill] : p,
    );
  };
  const removeSkill = (v: string) =>
    setSkills((p) => p.filter((s) => s !== v));

  // ── Resume autofill ──────────────────────────────────────────────────────
  // Parse a PDF client-side → base64 → POST. Prefill ONLY fields that are
  // currently empty so we never clobber what the user already typed. Tracks
  // which fields were filled to drive a brief highlight.
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
      // Map resume educations into rows (only when empty).
      if (educations.length === 0 && Array.isArray(data.educations) && data.educations.length > 0) {
        setEducations((data.educations as EducationEntry[]).slice(0, 4).map((e) => ({
          major: String(e?.major ?? "").trim(),
          degree: String(e?.degree ?? "").trim(),
          concentration: String(e?.concentration ?? "").trim(),
        })));
        filled.add("educations");
      }
      fillList("minors", setMinors, data.minors, minors, 2);
      // Map resume clubMemberships (or legacy clubs) into rows (only when empty).
      if (clubMemberships.length === 0) {
        if (Array.isArray(data.clubMemberships) && data.clubMemberships.length > 0) {
          const rows = (data.clubMemberships as ClubEntry[]).slice(0, 6).map((e) => ({
            club: String(e?.club ?? "").trim(),
            role: String(e?.role ?? "").trim(),
          })).filter((e) => e.club);
          if (rows.length) { setClubMemberships(rows); filled.add("clubMemberships"); }
        } else if (Array.isArray(data.clubs) && data.clubs.length > 0) {
          const rows = (data.clubs as string[]).slice(0, 6).map((c) => ({
            club: String(c).trim(),
            role: "",
          })).filter((e) => e.club);
          if (rows.length) { setClubMemberships(rows); filled.add("clubMemberships"); }
        }
      }
      fillList("skills", setSkills, data.skills, skills, 10);
      // Map resume experiences into rows (only when empty).
      if (experiences.length === 0 && Array.isArray(data.experiences) && data.experiences.length > 0) {
        setExperiences((data.experiences as Record<string, unknown>[]).slice(0, 8).map((e) => ({
          title: String(e?.title ?? "").trim(),
          firm: String(e?.firm ?? "").trim(),
          start: String(e?.start ?? e?.dates ?? "").trim(),
          end: String(e?.end ?? "").trim(),
        })));
        filled.add("experiences");
      }
      fillList("industries", setIndustries, data.targetIndustries, industries, 7);

      setResumeFilled(filled);
      setTimeout(() => setResumeFilled(new Set()), 2500);
    } catch {
      setResumeError("Couldn't read that resume. Fill the fields manually.");
    } finally {
      setResumeLoading(false);
    }
  };

  // ── Targets handlers ─────────────────────────────────────────────────────
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

  // ── Diagnose advance handlers ────────────────────────────────────────────
  // Goal also seeds targetIndustries with the matching role(s) when the user
  // hasn't picked any yet — so the warmth scorer + reveal have signal.
  const advanceFromGoal = () => {
    setIndustries((prev) => {
      if (prev.length > 0) return prev;
      const seeded = GOAL_TO_INDUSTRIES[onboardingGoal] ?? [];
      return seeded.length ? seeded : prev;
    });
    const seeded = GOAL_TO_INDUSTRIES[onboardingGoal] ?? [];
    saveFunnel({
      onboarding_goal: onboardingGoal,
      ...(industries.length === 0 && seeded.length
        ? { target_industries: seeded }
        : {}),
    });
    setStep(2);
  };

  const advanceFromPain = () => {
    saveFunnel({ onboarding_pain: onboardingPain });
    setStep(3);
  };

  const advanceFromTimeline = () => {
    saveFunnel({ onboarding_timeline: onboardingTimeline });
    setStep(4);
  };

  // Step "You" (identity) only gates on university (the dashboard layout
  // redirects to onboarding while it's empty); everything else is optional.
  const goFromYou = () => {
    if (!university.trim()) {
      setPrefsError("University is required.");
      return;
    }
    setPrefsError(null);
    setStep(5);
  };

  // Full profile commit — persists the entire identity + targets + edges
  // payload (and re-saves the diagnose answers). Fired when leaving Edges.
  const savePrefs = async (nextStep: number) => {
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
          minor: minors.join(", "),
          educations,
          experiences,
          clubMemberships,
          skills,
          target_industries: industries,
          target_companies: firms,
          target_locations: locations,
          recruiting_date: recruitingDate || null,
          weekly_goal_target: weeklyGoalTarget || 3,
          onboarding_goal: onboardingGoal,
          onboarding_pain: onboardingPain,
          onboarding_timeline: onboardingTimeline,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      trackEvent("onboarding_profile_saved", {
        university: university.trim(),
        firms: firms.length,
        industries: industries.length,
      });
      setStep(nextStep);
    } catch {
      setPrefsError("Could not save your preferences. Try again.");
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Connect handlers (contacts) ──────────────────────────────────────────
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
  // in the header while the user moves through the remaining steps.
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

  // Connect → Reveal: pull the ranked network the import produced so the reveal
  // can show a real count + blurred top-3 (names are redacted server-side for
  // locked contacts).
  const handleReveal = async () => {
    setStep(9);
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

  // ── Reveal → Activation ──────────────────────────────────────────────────
  const goToActivation = () => {
    trackEvent("onboarding_reveal_unlock_clicked", {
      matches: ranked.length || importedCount,
    });
    setStep(ACTIVATION_STEP);
  };

  // Warm-path match count for the reveal headline. Prefer the ranked network;
  // fall back to the raw imported count when ranking is still empty.
  const matchCount = ranked.length || importedCount;
  // Echo copy keyed off the first matched pain point the user selected.
  const painEcho =
    onboardingPain.map((p) => PAIN_ECHO[p]).find(Boolean) ??
    "Here are the people who already share your school, Greek org, or clubs.";

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-accent-teal">
              Set up KithNode
            </h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {step >= ACTIVATION_STEP
                ? "Activate your account"
                : `Step ${Math.min(step + 1, STEPS.length)} of ${STEPS.length}`}
            </p>
            {/* Background enrich progress — rides along in the header and never
                blocks navigation. */}
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
            {step < ACTIVATION_STEP && <StepIndicator step={step} />}
          </div>
        </div>
        <div className="h-px bg-border" />

        {/* ─── STEP 1: WELCOME ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <Network size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Welcome to KithNode
                </h2>
              </div>
              <p className="text-[14px] font-bold text-foreground">
                KithNode maps the warm paths hidden in your network — the
                alumni, brothers, and club-mates who can actually get you in the
                door.
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Takes about 3 minutes, and you&apos;ll see your warm network at
                the end.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { k: "Map", v: "your real connections" },
                  { k: "Score", v: "every warm path" },
                  { k: "Reach", v: "the right people first" },
                ].map((c) => (
                  <div
                    key={c.k}
                    className="border border-white/[0.06] bg-muted px-3 py-2"
                  >
                    <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent-teal">
                      {c.k}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {c.v}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(1)}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: GOAL ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <Target size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  What are you recruiting for?
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Pick the track you&apos;re hunting. We&apos;ll tune every match
                to it.
              </p>
              <SingleChipGroup
                options={GOAL_OPTIONS}
                selected={onboardingGoal}
                onSelect={setOnboardingGoal}
              />
            </section>
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(0)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={advanceFromGoal}
                disabled={!onboardingGoal}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PAIN ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  What&apos;s been hardest about networking?
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Pick all that hit. We&apos;ll aim the product at exactly these.
              </p>
              <ChipGroup
                options={PAIN_OPTIONS}
                selected={onboardingPain}
                onToggle={(v) =>
                  setOnboardingPain((p) =>
                    p.includes(v) ? p.filter((x) => x !== v) : [...p, v],
                  )
                }
              />
            </section>
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
                onClick={advanceFromPain}
                disabled={onboardingPain.length === 0}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: TIMELINE ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <CalendarDays size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  When do you need this locked?
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Sets the urgency on your pipeline.
              </p>
              <SingleChipGroup
                options={TIMELINE_OPTIONS}
                selected={onboardingTimeline}
                onSelect={setOnboardingTimeline}
              />
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
                onClick={advanceFromTimeline}
                disabled={!onboardingTimeline}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: YOU (identity) ──────────────────────────────────── */}
        {step === 4 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <GraduationCap size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Who are you?
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                The basics. Every field lights up matches in your network.
              </p>

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

                {/* Education rows editor — replaces majors/degrees/concentration */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Education{" "}
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                      {educations.length}/4
                    </span>
                  </label>
                  <EducationRowsEditor
                    rows={educations}
                    onChange={setEducations}
                    resumeFilled={resumeFilled.has("educations")}
                  />
                </div>

                {/* Minor */}
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
                      loadOptions={loadMinors}
                      placeholder="Add a minor..."
                      ariaLabel="Minor"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Grad year
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={2000}
                    max={2100}
                    placeholder="2029"
                    value={
                      recruitingDate ? recruitingDate.slice(0, 4) : ""
                    }
                    onChange={(e) => {
                      // Store the grad year as a May-15 ISO date in recruitingDate
                      // (the existing target-date field) so it persists through
                      // the same column — no schema change.
                      const y = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setRecruitingDate(y.length === 4 ? `${y}-05-15` : "");
                    }}
                    aria-label="Graduation year"
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
                onClick={() => setStep(3)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={goFromYou}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 6: RESUME ──────────────────────────────────────────── */}
        {step === 5 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <FileText size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Drop your resume, we autofill the rest
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Parsed locally, never stored. Only fills empty fields. Skip it if
                you&apos;d rather type everything.
              </p>

              <div className="border border-dashed border-accent-teal/30 bg-accent-teal/[0.04] p-3">
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
                {resumeFilled.size > 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-accent-teal">
                    <Check className="h-3 w-3" />
                    Filled {resumeFilled.size} section
                    {resumeFilled.size === 1 ? "" : "s"}. Review on the next
                    steps.
                  </p>
                )}
                {resumeError && (
                  <p className="mt-1 text-[10px] text-red-400">{resumeError}</p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { k: "Education", v: educations.length },
                  { k: "Experience", v: experiences.length },
                  { k: "Skills", v: skills.length },
                ].map((c) => (
                  <div
                    key={c.k}
                    className="border border-white/[0.06] bg-muted px-3 py-2"
                  >
                    <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                      {c.k}
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
                      {c.v}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(4)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(6)}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {resumeFilled.size > 0 ? "Continue" : "Skip for now"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 7: TARGETS ─────────────────────────────────────────── */}
        {step === 6 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Roles
                </h2>
              </div>
              <TrackRolePicker selected={industries} onToggle={toggleIndustry} />
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
                  Recruiting Cadence
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
                onClick={() => setStep(5)}
                disabled={savingPrefs}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(7)}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 8: EDGES ───────────────────────────────────────────── */}
        {step === 7 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <Network size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Your edges
                </h2>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Greek life, clubs, hometown, past roles — every shared edge is a
                warm path.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    High School
                  </label>
                  <Combobox
                    value={highSchool}
                    onSelect={(v) => {
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
                  <div>
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

            {/* Clubs (+ roles) */}
            <section
              className={`border bg-bg-card p-5 ${resumeFilled.has("clubMemberships") ? "border-accent-teal/60 ring-1 ring-accent-teal/60" : "border-white/[0.06]"}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Users size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Clubs
                </h2>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                  {clubMemberships.length}/6
                </span>
              </div>
              <ClubRowsEditor
                rows={clubMemberships}
                onChange={setClubMemberships}
                resumeFilled={resumeFilled.has("clubMemberships")}
              />
            </section>

            {/* Past experiences */}
            <section
              className={`border bg-bg-card p-5 ${resumeFilled.has("experiences") ? "border-accent-teal/60 ring-1 ring-accent-teal/60" : "border-white/[0.06]"}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Experience (up to 8)
                </h2>
              </div>
              <ExperienceRowsEditor
                rows={experiences}
                onChange={setExperiences}
                resumeFilled={resumeFilled.has("experiences")}
              />
            </section>

            {/* Skills */}
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
                <Combobox
                  key={skillKey}
                  value=""
                  onSelect={addSkill}
                  loadOptions={loadSkills}
                  placeholder="Add a skill, then press Enter..."
                  ariaLabel="Skills"
                  inputClassName="bg-muted text-sm"
                />
              )}
            </section>

            {prefsError && (
              <p className="text-[11px] text-red-400">{prefsError}</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(6)}
                disabled={savingPrefs}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => savePrefs(8)}
                disabled={savingPrefs}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {savingPrefs ? "Saving..." : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 9: CONNECT NETWORK ─────────────────────────────────── */}
        {step === 8 && (
          <div className="mt-4 space-y-3">
            {/* CSV upload */}
            <section className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                  <Upload className="h-3 w-3" />
                  Import LinkedIn (CSV)
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
                  Paste connections manually
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
                onClick={() => setStep(7)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleReveal}
                disabled={importing}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {importedCount > 0 ? "See my matches" : "Skip for now"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 10: REVEAL ─────────────────────────────────────────── */}
        {step === 9 && (
          <div className="mt-4 space-y-3">
            <section className="border border-accent-teal/30 bg-bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <Network size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent-teal">
                  Your warm network
                </h2>
              </div>
              {loadingRanked ? (
                <div className="space-y-2">
                  <div className="h-9 w-48 animate-pulse bg-muted" />
                  <div className="h-4 w-72 animate-pulse bg-muted" />
                </div>
              ) : (
                <>
                  <p className="font-mono text-4xl font-bold tabular-nums text-foreground">
                    {matchCount}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-foreground">
                    warm-path match{matchCount === 1 ? "" : "es"} in your network.
                  </p>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {painEcho} Here {matchCount === 1 ? "is" : "are"}{" "}
                    {matchCount} {matchCount === 1 ? "person" : "people"} who
                    already share your school, Greek org, or clubs.
                  </p>
                </>
              )}
            </section>

            {/* Blurred top-3 preview — names stay redacted until unlock. */}
            <section className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                  <Lock className="h-3 w-3" />
                  Top matches
                </span>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  locked
                </span>
              </div>
              <div className="p-2">
                {loadingRanked ? (
                  <div className="space-y-1 p-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(ranked.length > 0
                      ? ranked.slice(0, 3)
                      : Array.from({ length: 3 }).map((_, i) => ({
                          id: `ph-${i}`,
                          name: "",
                          title: "Warm contact",
                          company: { name: "in your target firms" },
                          score: { total_score: 0, tier: "warm" },
                        }))
                    ).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 border border-white/[0.06] px-3 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/[0.1] bg-muted">
                          <Lock className="h-3 w-3 text-muted-foreground/60" />
                        </span>
                        <div className="min-w-0 flex-1">
                          {/* Redacted: blur the name even though it's already
                              server-redacted for locked contacts. */}
                          <p className="select-none truncate text-[12px] font-bold text-foreground blur-sm">
                            {c.name || "Jordan ████████"}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.title}
                            {c.company?.name ? ` @ ${c.company.name}` : ""}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[13px] font-bold tabular-nums blur-[3px] ${
                            TIER_STYLES[c.score?.tier] || "text-zinc-400"
                          }`}
                        >
                          {Math.round(c.score?.total_score ?? 0) || 88}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(8)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={goToActivation}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                Unlock your network
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── ACTIVATION / PAYWALL ────────────────────────────────────── */}
        {step >= ACTIVATION_STEP && <ActivationStep />}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <OnboardingFunnel />
    </Suspense>
  );
}
