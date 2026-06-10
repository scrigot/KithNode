"use client";

import {
  useState,
  useRef,
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
} from "@/lib/data/onboarding-options";
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
} from "lucide-react";

// Contacts are POSTed to /api/import/linkedin in batches so the client can
// render a determinate progress bar instead of one long opaque request.
const IMPORT_BATCH_SIZE = 50;

const INDUSTRY_OPTIONS = [
  "AI/ML",
  "Investment Banking",
  "Private Equity",
  "Consulting",
  "Venture Capital",
  "Corporate Finance",
  "Asset Management",
];

const FIRM_OPTIONS = [
  "Anthropic",
  "OpenAI",
  "Google DeepMind",
  "NVIDIA",
  "Vercel",
  "Goldman Sachs",
  "JPMorgan",
  "Morgan Stanley",
  "Evercore",
  "Blackstone",
  "KKR",
  "McKinsey",
  "BCG",
  "Bain",
];

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
const STEPS = ["Profile", "Contacts", "Pipeline"];

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

  // Step 1 — profile
  const [university, setUniversity] = useState("");
  const [hometown, setHometown] = useState("");
  const [greekOrg, setGreekOrg] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [firms, setFirms] = useState<string[]>([]);
  const [customFirm, setCustomFirm] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Step 2 — contacts
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
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [manualImported, setManualImported] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // Step 3 — pick
  const [ranked, setRanked] = useState<RankedLite[]>([]);
  const [loadingRanked, setLoadingRanked] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [finishing, setFinishing] = useState(false);

  // ── Step 1 handlers ──────────────────────────────────────────────────────
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

  const saveProfile = async () => {
    if (!university.trim()) {
      setProfileError("University is required.");
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const res = await apiFetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_university: university.trim(),
          hometown: hometown.trim(),
          greek_life: greekOrg.trim(),
          target_industries: industries,
          target_companies: firms,
          target_locations: locations,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      trackEvent("onboarding_profile_saved", {
        university: university.trim(),
        firms: firms.length,
        industries: industries.length,
      });
      setStep(1);
    } catch {
      setProfileError("Could not save your profile. Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Step 2 handlers ──────────────────────────────────────────────────────
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

  // Loop the enrich endpoint until there's nothing left to enrich.
  const runEnrich = useCallback(async () => {
    setEnriching(true);
    setEnrichProgress(0);
    try {
      // Guard against an unexpected loop; 25/batch covers far more than a
      // first-run import realistically needs.
      for (let i = 0; i < 40; i++) {
        const res = await apiFetch("/api/contacts/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) break;
        const data: { enriched?: number; total?: number } = await res.json();
        const enriched = data.enriched ?? 0;
        const total = data.total ?? 0;
        setEnrichProgress((p) => p + enriched);
        if (total === 0 || enriched === 0) break;
      }
    } catch {
      // Non-fatal: enrichment improves scores but isn't required to continue.
    } finally {
      setEnriching(false);
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
        await runEnrich();
      } catch {
        setContactsError("Import failed. Try again.");
      } finally {
        setImporting(false);
      }
    },
    [runEnrich],
  );

  const handleEnterPipeline = async () => {
    setStep(2);
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

  // ── Step 3 handlers ──────────────────────────────────────────────────────
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
              Three steps to your warm-path network
            </p>
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

        {/* ─── STEP 1: PROFILE ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="mt-4 space-y-3">
            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Profile
                </h2>
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
                    Greek Org
                  </label>
                  <Input
                    placeholder="e.g. Chi Phi"
                    value={greekOrg}
                    onChange={(e) => setGreekOrg(e.target.value)}
                    className="bg-muted text-sm"
                  />
                </div>
              </div>
            </section>

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

            <section className="border border-white/[0.06] bg-bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-accent-teal" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Locations
                </h2>
              </div>
              <Combobox
                value=""
                onSelect={addLocation}
                loadOptions={loadCities}
                placeholder="Add a city..."
                ariaLabel="Target locations"
              />
              {locations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {locations.map((loc) => (
                    <span
                      key={loc}
                      className="flex items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2 py-1 text-[11px] font-bold text-accent-teal"
                    >
                      {loc}
                      <button
                        type="button"
                        onClick={() => removeLocation(loc)}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {profileError && (
              <p className="text-[11px] text-red-400">{profileError}</p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={saveProfile}
                disabled={savingProfile}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {savingProfile ? "Saving..." : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: CONTACTS ────────────────────────────────────────── */}
        {step === 1 && (
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

            {/* Progress — one panel covers both the import and enrich phases */}
            {(importing || enriching || importedCount > 0) && (
              <div className="space-y-2 border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
                  <p className="text-[11px] font-bold text-accent-teal">
                    {importing
                      ? `Imported ${importDone}/${importTotal}...`
                      : enriching
                        ? `Enriching ${enrichProgress}...`
                        : manualImported
                          ? `${importedCount} contacts imported and enriched. Queue cleared.`
                          : `${importedCount} contacts imported and enriched.`}
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
                onClick={() => setStep(0)}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleEnterPipeline}
                disabled={importing || enriching}
                className="gap-1 bg-accent-teal text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/90"
              >
                {importedCount > 0 ? "Pick contacts" : "Skip for now"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PICK 5 ──────────────────────────────────────────── */}
        {step === 2 && (
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
                onClick={() => setStep(1)}
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
