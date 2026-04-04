"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { trackEvent } from "@/lib/posthog";

const TOTAL_STEPS = 5;

const INDUSTRY_OPTIONS = [
  "Investment Banking",
  "Private Equity",
  "Consulting",
  "Venture Capital",
  "Corporate Finance",
  "Asset Management",
];

const FIRM_OPTIONS = [
  "Goldman Sachs",
  "JPMorgan",
  "Morgan Stanley",
  "Bank of America",
  "Evercore",
  "Lazard",
  "Centerview",
  "Moelis",
  "PJT Partners",
  "Blackstone",
  "KKR",
  "Carlyle",
  "Apollo",
  "McKinsey",
  "BCG",
  "Bain",
  "Deloitte",
];

const LOCATION_OPTIONS = [
  "New York",
  "San Francisco",
  "Chicago",
  "Charlotte",
  "Boston",
  "Houston",
  "Dallas",
  "London",
];

const STEP_ICONS = [GraduationCap, MapPin, Target, Building2, CheckCircle2];

interface Preferences {
  university: string;
  greekLifeEnabled: boolean;
  greekOrganization: string;
  hometown: string;
  targetLocations: string[];
  customLocations: string[];
  targetIndustries: string[];
  targetFirms: string[];
  customFirms: string[];
}

const STORAGE_KEY = "kithnode_preferences";

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return getDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaults(), ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return getDefaults();
}

function getDefaults(): Preferences {
  return {
    university: "",
    greekLifeEnabled: false,
    greekOrganization: "",
    hometown: "",
    targetLocations: [],
    customLocations: [],
    targetIndustries: [],
    targetFirms: [],
    customFirms: [],
  };
}

function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// Also persist to the existing API if it exists
async function syncToAPI(prefs: Preferences) {
  try {
    await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_university: prefs.university || null,
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
      }),
    });
  } catch {
    // API may not exist yet — localStorage is the source of truth
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>(getDefaults);
  const [customFirmInput, setCustomFirmInput] = useState("");
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setPrefs(loadPreferences());
    setLoaded(true);
  }, []);

  // Save to localStorage on every change (after initial load)
  useEffect(() => {
    if (loaded) savePreferences(prefs);
  }, [prefs, loaded]);

  const toggleIndustry = (ind: string) => {
    setPrefs((p) => ({
      ...p,
      targetIndustries: p.targetIndustries.includes(ind)
        ? p.targetIndustries.filter((i) => i !== ind)
        : [...p.targetIndustries, ind],
    }));
  };

  const toggleFirm = (firm: string) => {
    setPrefs((p) => ({
      ...p,
      targetFirms: p.targetFirms.includes(firm)
        ? p.targetFirms.filter((f) => f !== firm)
        : [...p.targetFirms, firm],
    }));
  };

  const addCustomFirm = () => {
    const firm = customFirmInput.trim();
    if (!firm) return;
    if (
      prefs.customFirms.includes(firm) ||
      prefs.targetFirms.includes(firm) ||
      FIRM_OPTIONS.includes(firm)
    )
      return;
    setPrefs((p) => ({ ...p, customFirms: [...p.customFirms, firm] }));
    setCustomFirmInput("");
  };

  const removeCustomFirm = (firm: string) => {
    setPrefs((p) => ({
      ...p,
      customFirms: p.customFirms.filter((f) => f !== firm),
    }));
  };

  const toggleLocation = (loc: string) => {
    setPrefs((p) => ({
      ...p,
      targetLocations: p.targetLocations.includes(loc)
        ? p.targetLocations.filter((l) => l !== loc)
        : [...p.targetLocations, loc],
    }));
  };

  const addCustomLocation = () => {
    const loc = customLocationInput.trim();
    if (!loc) return;
    if (
      prefs.customLocations.includes(loc) ||
      prefs.targetLocations.includes(loc) ||
      LOCATION_OPTIONS.includes(loc)
    )
      return;
    setPrefs((p) => ({ ...p, customLocations: [...p.customLocations, loc] }));
    setCustomLocationInput("");
  };

  const removeCustomLocation = (loc: string) => {
    setPrefs((p) => ({
      ...p,
      customLocations: p.customLocations.filter((l) => l !== loc),
    }));
  };

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
    router.push("/dashboard");
  };

  const handleSkip = () => {
    trackEvent("settings_onboarding_skipped", { step });
    router.push("/dashboard");
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const allFirmsCount = prefs.targetFirms.length + prefs.customFirms.length;

  if (!loaded) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-8">
      {/* Skip link */}
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
              <div
                className={`h-1 w-full transition-colors duration-300 ${
                  i <= step ? "bg-accent-teal" : "bg-white/[0.06]"
                }`}
              />
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

      {/* Step content */}
      <div className="w-full max-w-lg">
        <div className="border border-white/[0.06] bg-bg-card p-8">
          {/* STEP 1: Your School */}
          {step === 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your School
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Tell us where you&apos;re at so we can find your warmest alumni
                connections
              </h2>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    University
                  </label>
                  <Input
                    placeholder="University of North Carolina at Chapel Hill"
                    value={prefs.university}
                    onChange={(e) =>
                      setPrefs({ ...prefs, university: e.target.value })
                    }
                    className="bg-muted text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Greek Life
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPrefs({ ...prefs, greekLifeEnabled: true })
                      }
                      className={`border px-4 py-2 text-xs font-bold transition-colors ${
                        prefs.greekLifeEnabled
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() =>
                        setPrefs({
                          ...prefs,
                          greekLifeEnabled: false,
                          greekOrganization: "",
                        })
                      }
                      className={`border px-4 py-2 text-xs font-bold transition-colors ${
                        !prefs.greekLifeEnabled
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {prefs.greekLifeEnabled && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Organization Name
                    </label>
                    <Input
                      placeholder="e.g. Chi Phi"
                      value={prefs.greekOrganization}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          greekOrganization: e.target.value,
                        })
                      }
                      className="bg-muted text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 1 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your Location
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Where you&apos;re from and where you want to work helps us find
                local connections
              </h2>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Where are you from?
                  </label>
                  <Input
                    placeholder="Charlotte, NC"
                    value={prefs.hometown}
                    onChange={(e) =>
                      setPrefs({ ...prefs, hometown: e.target.value })
                    }
                    className="bg-muted text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Where do you want to work?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_OPTIONS.map((loc) => {
                      const active = prefs.targetLocations.includes(loc);
                      return (
                        <button
                          key={loc}
                          onClick={() => toggleLocation(loc)}
                          className={`border px-4 py-2.5 text-xs font-bold transition-colors ${
                            active
                              ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                              : "border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom locations */}
                {prefs.customLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {prefs.customLocations.map((loc) => (
                      <span
                        key={loc}
                        className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
                      >
                        {loc}
                        <button
                          onClick={() => removeCustomLocation(loc)}
                          className="text-accent-teal/60 hover:text-accent-teal"
                        >
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomLocation();
                      }
                    }}
                    className="bg-muted text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomLocation}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Target Industries */}
          {step === 2 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Target Industries
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                What areas of finance are you recruiting for?
              </h2>

              <div className="mt-6 flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((ind) => {
                  const active = prefs.targetIndustries.includes(ind);
                  return (
                    <button
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className={`border px-4 py-2.5 text-xs font-bold transition-colors ${
                        active
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ind}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Target Firms */}
          {step === 3 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Target Firms
              </p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Which firms are you most interested in? We&apos;ll prioritize
                alumni at these.
              </h2>

              <div className="mt-6 flex flex-wrap gap-2">
                {FIRM_OPTIONS.map((firm) => {
                  const active = prefs.targetFirms.includes(firm);
                  return (
                    <button
                      key={firm}
                      onClick={() => toggleFirm(firm)}
                      className={`border px-3 py-2 text-xs font-bold transition-colors ${
                        active
                          ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                          : "border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {firm}
                    </button>
                  );
                })}
              </div>

              {/* Custom firms */}
              {prefs.customFirms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {prefs.customFirms.map((firm) => (
                    <span
                      key={firm}
                      className="flex items-center gap-1.5 border border-accent-teal bg-accent-teal/15 px-3 py-2 text-xs font-bold text-accent-teal"
                    >
                      {firm}
                      <button
                        onClick={() => removeCustomFirm(firm)}
                        className="text-accent-teal/60 hover:text-accent-teal"
                      >
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
            </div>
          )}

          {/* STEP 5: All Set */}
          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-accent-teal/30 bg-accent-teal/10">
                <CheckCircle2 className="h-8 w-8 text-accent-teal" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                You&apos;re all set!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                KithNode is now configured to find your warmest paths into
                finance.
              </p>

              {/* Summary */}
              <div className="mt-6 space-y-2 text-left">
                {prefs.university && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <GraduationCap className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.university}
                      {prefs.greekLifeEnabled && prefs.greekOrganization
                        ? ` / ${prefs.greekOrganization}`
                        : ""}
                    </span>
                  </div>
                )}
                {(prefs.hometown || prefs.targetLocations.length > 0 || prefs.customLocations.length > 0) && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <MapPin className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.hometown ? `From ${prefs.hometown}` : ""}
                      {prefs.hometown && (prefs.targetLocations.length + prefs.customLocations.length) > 0
                        ? " · "
                        : ""}
                      {(prefs.targetLocations.length + prefs.customLocations.length) > 0
                        ? `${prefs.targetLocations.length + prefs.customLocations.length} target location${
                            prefs.targetLocations.length + prefs.customLocations.length === 1 ? "" : "s"
                          }`
                        : ""}
                    </span>
                  </div>
                )}
                {prefs.targetIndustries.length > 0 && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <Target className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {prefs.targetIndustries.length} industr
                      {prefs.targetIndustries.length === 1 ? "y" : "ies"}{" "}
                      selected
                    </span>
                  </div>
                )}
                {allFirmsCount > 0 && (
                  <div className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                    <Building2 className="h-4 w-4 text-accent-teal" />
                    <span className="text-xs text-foreground">
                      {allFirmsCount} firm{allFirmsCount === 1 ? "" : "s"}{" "}
                      targeted
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

        {/* Navigation buttons */}
        {step < TOTAL_STEPS - 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={goBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <Button
              size="sm"
              className="gap-1 bg-accent-teal text-xs font-bold text-white hover:bg-accent-teal/90"
              onClick={goNext}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Back button on final step */}
        {step === TOTAL_STEPS - 1 && (
          <div className="mt-4">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={goBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
