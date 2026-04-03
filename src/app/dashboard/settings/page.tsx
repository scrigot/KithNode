"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const INDUSTRY_OPTIONS = [
  "Fintech", "AI", "Consulting", "VC", "SaaS", "Financial Services", "Real Estate", "Startup",
];
const ROLE_OPTIONS = [
  { value: "founder", label: "Founders" },
  { value: "recruiter", label: "Recruiters" },
  { value: "alumni", label: "Alumni" },
  { value: "vp_director", label: "VPs/Directors" },
];
const LOCATION_OPTIONS = [
  "Chapel Hill", "Durham", "Raleigh", "Charlotte", "Charleston", "NYC", "SF", "Remote",
];

export default function SettingsPage() {
  const [prefs, setPrefs] = useState({
    current_university: "",
    target_universities: "",
    target_industries: [] as string[],
    target_companies: "",
    greek_life: "",
    target_locations: [] as string[],
    target_roles: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rescored, setRescored] = useState(0);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs({
          current_university: data.current_university || "",
          target_universities: Array.isArray(data.target_universities)
            ? data.target_universities.join(", ")
            : "",
          target_industries: data.target_industries || [],
          target_companies: Array.isArray(data.target_companies)
            ? data.target_companies.join(", ")
            : "",
          greek_life: data.greek_life || "",
          target_locations: data.target_locations || [],
          target_roles: data.target_roles || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const payload = {
      current_university: prefs.current_university || null,
      target_universities: prefs.target_universities
        ? prefs.target_universities.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      target_industries: prefs.target_industries.length > 0 ? prefs.target_industries : null,
      target_companies: prefs.target_companies
        ? prefs.target_companies.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      greek_life: prefs.greek_life || null,
      target_locations: prefs.target_locations.length > 0 ? prefs.target_locations : null,
      target_roles: prefs.target_roles.length > 0 ? prefs.target_roles : null,
    };

    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRescored(data.rescored || 0);
      setSaved(true);
    } catch {
      // fail silently
    }
    setSaving(false);
  };

  const toggle = (
    field: "target_industries" | "target_locations" | "target_roles",
    value: string,
  ) => {
    setPrefs((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value],
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
        SETTINGS
      </h2>
      <p className="mt-1 text-[10px] text-muted-foreground">
        YOUR TARGETING PREFERENCES — CHANGES RE-SCORE ALL CONTACTS
      </p>
      <div className="mt-4 h-px bg-border" />

      <div className="mt-6 max-w-lg space-y-6">
        {/* University */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            YOUR UNIVERSITY
          </label>
          <Input
            value={prefs.current_university}
            onChange={(e) => setPrefs({ ...prefs, current_university: e.target.value })}
            className="bg-muted text-xs"
            placeholder="e.g. UNC Chapel Hill"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TARGET UNIVERSITIES (COMMA SEPARATED)
          </label>
          <Input
            value={prefs.target_universities}
            onChange={(e) => setPrefs({ ...prefs, target_universities: e.target.value })}
            className="bg-muted text-xs"
            placeholder="e.g. Duke, NC State, MIT, Harvard"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            GREEK LIFE
          </label>
          <Input
            value={prefs.greek_life}
            onChange={(e) => setPrefs({ ...prefs, greek_life: e.target.value })}
            className="bg-muted text-xs"
            placeholder="e.g. Chi Phi"
          />
        </div>

        {/* Industries */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TARGET INDUSTRIES
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.map((ind) => (
              <button
                key={ind}
                onClick={() => toggle("target_industries", ind)}
                className={`border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  prefs.target_industries.includes(ind)
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {ind.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TOP COMPANIES (COMMA SEPARATED)
          </label>
          <Input
            value={prefs.target_companies}
            onChange={(e) => setPrefs({ ...prefs, target_companies: e.target.value })}
            className="bg-muted text-xs"
            placeholder="e.g. Deloitte, KKR, McKinsey, Ramp"
          />
        </div>

        {/* Roles */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            PRIORITIZE ROLES
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                onClick={() => toggle("target_roles", role.value)}
                className={`border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  prefs.target_roles.includes(role.value)
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {role.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TARGET LOCATIONS
          </label>
          <div className="flex flex-wrap gap-2">
            {LOCATION_OPTIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => toggle("target_locations", loc)}
                className={`border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  prefs.target_locations.includes(loc)
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "SAVING & RE-SCORING..." : "SAVE PREFERENCES"}
          </Button>
          {saved && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              SAVED — {rescored} contacts re-scored
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
