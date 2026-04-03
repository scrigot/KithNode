"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";

const INDUSTRY_OPTIONS = [
  "Fintech",
  "AI",
  "Consulting",
  "VC",
  "SaaS",
  "Financial Services",
  "Real Estate",
  "Startup",
];

const ROLE_OPTIONS = [
  { value: "founder", label: "Founders / CEOs" },
  { value: "recruiter", label: "Recruiters / HR" },
  { value: "alumni", label: "Alumni / Professors" },
  { value: "vp_director", label: "VPs / Directors" },
];

const LOCATION_OPTIONS = [
  "Chapel Hill",
  "Durham",
  "Raleigh",
  "Charlotte",
  "Charleston",
  "NYC",
  "SF",
  "Remote",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    current_university: "",
    target_universities: "",
    target_industries: [] as string[],
    target_companies: "",
    greek_life: "",
    target_locations: [] as string[],
    target_roles: [] as string[],
  });

  const toggleIndustry = (ind: string) => {
    setPrefs((p) => ({
      ...p,
      target_industries: p.target_industries.includes(ind)
        ? p.target_industries.filter((i) => i !== ind)
        : [...p.target_industries, ind],
    }));
  };

  const toggleRole = (role: string) => {
    setPrefs((p) => ({
      ...p,
      target_roles: p.target_roles.includes(role)
        ? p.target_roles.filter((r) => r !== role)
        : [...p.target_roles, role],
    }));
  };

  const toggleLocation = (loc: string) => {
    setPrefs((p) => ({
      ...p,
      target_locations: p.target_locations.includes(loc)
        ? p.target_locations.filter((l) => l !== loc)
        : [...p.target_locations, loc],
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      current_university: prefs.current_university || null,
      target_universities: prefs.target_universities
        ? prefs.target_universities.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      target_industries:
        prefs.target_industries.length > 0 ? prefs.target_industries : null,
      target_companies: prefs.target_companies
        ? prefs.target_companies.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      greek_life: prefs.greek_life || null,
      target_locations:
        prefs.target_locations.length > 0 ? prefs.target_locations : null,
      target_roles:
        prefs.target_roles.length > 0 ? prefs.target_roles : null,
    };

    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      trackEvent("onboarding_completed", payload);
    } catch {
      // continue anyway
    }

    setSaving(false);
    router.push("/dashboard");
  };

  const handleSkip = () => {
    trackEvent("onboarding_skipped", { step });
    router.push("/dashboard");
  };

  const STEPS = [
    // Step 0: University
    <div key="uni">
      <p className="text-[10px] uppercase tracking-wider text-primary">
        YOUR SCHOOL
      </p>
      <h2 className="mt-1 text-lg font-bold text-foreground">
        What university are you at?
      </h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            YOUR UNIVERSITY
          </label>
          <Input
            placeholder="e.g. UNC Chapel Hill"
            value={prefs.current_university}
            onChange={(e) =>
              setPrefs({ ...prefs, current_university: e.target.value })
            }
            className="bg-muted text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TARGET UNIVERSITIES (COMMA SEPARATED)
          </label>
          <Input
            placeholder="e.g. Duke, NC State, Kenan-Flagler, MIT, Harvard"
            value={prefs.target_universities}
            onChange={(e) =>
              setPrefs({ ...prefs, target_universities: e.target.value })
            }
            className="bg-muted text-xs"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Alumni from these schools will be weighted higher in scoring
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            FRATERNITY / SORORITY (OPTIONAL)
          </label>
          <Input
            placeholder="e.g. Chi Phi"
            value={prefs.greek_life}
            onChange={(e) =>
              setPrefs({ ...prefs, greek_life: e.target.value })
            }
            className="bg-muted text-xs"
          />
        </div>
      </div>
    </div>,

    // Step 1: Industries
    <div key="ind">
      <p className="text-[10px] uppercase tracking-wider text-primary">
        INDUSTRIES
      </p>
      <h2 className="mt-1 text-lg font-bold text-foreground">
        What industries are you targeting?
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Select all that apply. These will boost contacts in matching industries.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {INDUSTRY_OPTIONS.map((ind) => {
          const active = prefs.target_industries.includes(ind);
          return (
            <button
              key={ind}
              onClick={() => toggleIndustry(ind)}
              className={`border px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ind.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>,

    // Step 2: Companies + Roles
    <div key="companies">
      <p className="text-[10px] uppercase tracking-wider text-primary">
        TARGETING
      </p>
      <h2 className="mt-1 text-lg font-bold text-foreground">
        Dream companies & roles
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TOP COMPANIES (COMMA SEPARATED)
          </label>
          <Input
            placeholder="e.g. Deloitte, KKR, McKinsey, Ramp, Anthropic"
            value={prefs.target_companies}
            onChange={(e) =>
              setPrefs({ ...prefs, target_companies: e.target.value })
            }
            className="bg-muted text-xs"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Contacts at these companies will score highest
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            PRIORITIZE THESE ROLES
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => {
              const active = prefs.target_roles.includes(role.value);
              return (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={`border px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,

    // Step 3: Locations
    <div key="locations">
      <p className="text-[10px] uppercase tracking-wider text-primary">
        LOCATIONS
      </p>
      <h2 className="mt-1 text-lg font-bold text-foreground">
        Where do you want to work?
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Contacts in these areas will be weighted higher.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {LOCATION_OPTIONS.map((loc) => {
          const active = prefs.target_locations.includes(loc);
          return (
            <button
              key={loc}
              onClick={() => toggleLocation(loc)}
              className={`border px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {loc.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>,
  ];

  const totalSteps = STEPS.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-6 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {/* Current step */}
        {STEPS[step]}

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            SKIP
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setStep(step - 1)}
              >
                BACK
              </Button>
            )}
            {step < totalSteps - 1 ? (
              <Button
                size="sm"
                className="text-xs"
                onClick={() => setStep(step + 1)}
              >
                NEXT
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "SAVING..." : "GET STARTED"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
