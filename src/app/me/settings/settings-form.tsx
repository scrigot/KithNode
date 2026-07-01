"use client";

import { useMemo, useState } from "react";
import type { MeProfileData } from "@/lib/me/profile";

const FIELDS: {
  key: keyof MeProfileData;
  label: string;
  help: string;
  placeholder: string;
  rows?: number;
  group: "Discovery profile" | "Outreach defaults" | "Warm signals";
  options?: { value: string; label: string }[];
}[] = [
  {
    key: "currentWork",
    label: "Current work",
    help: "What you're doing now and what context matters.",
    placeholder: "Part-time at Comfort, AI/data services focus, UNC student...",
    rows: 3,
    group: "Discovery profile",
  },
  {
    key: "goals",
    label: "Goals",
    help: "Used to shape discovery prompts and coffee-chat ranking.",
    placeholder: "Find AI consulting and AI engineering mentors for coffee chats...",
    rows: 3,
    group: "Discovery profile",
  },
  {
    key: "targetRoles",
    label: "Target roles",
    help: "Roles you want to meet or become.",
    placeholder: "AI engineer, AI consultant, data services consultant, applied AI lead...",
    group: "Discovery profile",
  },
  {
    key: "targetExpertise",
    label: "Target expertise",
    help: "Specific skills or domains to search for.",
    placeholder: "RAG, data engineering, LLM apps, automation, analytics engineering...",
    rows: 3,
    group: "Discovery profile",
  },
  {
    key: "targetCompanies",
    label: "Target companies",
    help: "Companies or firms to bias discovery toward.",
    placeholder: "Comfort, Anvil, Palantir, Databricks, Scale AI, local AI consultancies...",
    rows: 3,
    group: "Discovery profile",
  },
  {
    key: "targetLocations",
    label: "Target locations",
    help: "Places you care about for mentors and coffee chats.",
    placeholder: "Chapel Hill, Raleigh, New York, San Francisco, remote...",
    group: "Discovery profile",
  },
  {
    key: "searchKeywords",
    label: "Search keywords",
    help: "Extra words KithNode should include in search prompts.",
    placeholder: "AI consulting, applied AI, data services, founder, implementation...",
    rows: 3,
    group: "Discovery profile",
  },
  {
    key: "outreachStyle",
    label: "Default writing style",
    help: "Prefills generated email and LinkedIn drafts.",
    placeholder: "warm, curious, humble",
    group: "Outreach defaults",
    options: [
      { value: "", label: "Warm, curious, humble" },
      { value: "direct but friendly", label: "Direct but friendly" },
      { value: "casual student coffee chat", label: "Casual student coffee chat" },
      { value: "polished and professional", label: "Polished and professional" },
      { value: "short LinkedIn message style", label: "Short LinkedIn message style" },
    ],
  },
  {
    key: "outreachLength",
    label: "Default length",
    help: "Keeps drafts within the amount of detail you prefer.",
    placeholder: "short",
    group: "Outreach defaults",
    options: [
      { value: "", label: "Short" },
      { value: "medium", label: "Medium" },
      { value: "detailed", label: "Detailed" },
    ],
  },
  {
    key: "preferredEmailClient",
    label: "Preferred email client",
    help: "Shown first when a draft is ready.",
    placeholder: "gmail",
    group: "Outreach defaults",
    options: [
      { value: "", label: "Gmail" },
      { value: "outlook", label: "Outlook" },
      { value: "mail", label: "Mail app" },
    ],
  },
  {
    key: "outreachSignoff",
    label: "Default signoff",
    help: "Name/signature the AI should use.",
    placeholder: "Sam",
    group: "Outreach defaults",
  },
  {
    key: "outreachPositioning",
    label: "Your positioning",
    help: "How to describe what you are doing now.",
    placeholder: "UNC student exploring AI engineering and data services consulting...",
    rows: 3,
    group: "Outreach defaults",
  },
  {
    key: "outreachGoals",
    label: "Coffee-chat goals",
    help: "What you want from these conversations.",
    placeholder: "Learn how AI consultants got started, what skills matter, and which roles to target...",
    rows: 3,
    group: "Outreach defaults",
  },
  {
    key: "schools",
    label: "Schools",
    help: "Used for shared-school warmth signals.",
    placeholder: "University of North Carolina, UNC Kenan-Flagler, ...",
    group: "Warm signals",
  },
  {
    key: "pastFirms",
    label: "Past firms",
    help: "Used for shared-employer warmth signals.",
    placeholder: "Comfort, Anvil, internships, startups, ...",
    group: "Warm signals",
  },
  {
    key: "location",
    label: "Current / target locations",
    help: "Used for same-area warmth signals.",
    placeholder: "Chapel Hill, Raleigh, San Francisco, New York, ...",
    group: "Warm signals",
  },
  {
    key: "hometown",
    label: "Hometown",
    help: "Also contributes to same-area warmth.",
    placeholder: "Your hometown or home region",
    group: "Warm signals",
  },
  {
    key: "clubs",
    label: "Clubs / communities",
    help: "Stored now for prep context and future warm-signal matching.",
    placeholder: "Consulting clubs, AI groups, founder communities, Greek orgs, ...",
    rows: 4,
    group: "Warm signals",
  },
  {
    key: "profileNotes",
    label: "Private profile notes",
    help: "Freeform context for later prep and tailoring.",
    placeholder: "Anything KithNode should remember about your positioning or constraints...",
    rows: 4,
    group: "Warm signals",
  },
];

export default function SettingsForm({ initial }: { initial: MeProfileData }) {
  const [form, setForm] = useState<MeProfileData>(initial);
  const [baseline, setBaseline] = useState<MeProfileData>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  function updateField(key: keyof MeProfileData, value: string) {
    setForm({ ...form, [key]: value });
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      const next = {
        schools: data.profile.schools || "",
        clubs: data.profile.clubs || "",
        pastFirms: data.profile.pastFirms || "",
        hometown: data.profile.hometown || "",
        location: data.profile.location || "",
        currentWork: data.profile.currentWork || "",
        goals: data.profile.goals || "",
        targetRoles: data.profile.targetRoles || "",
        targetExpertise: data.profile.targetExpertise || "",
        targetCompanies: data.profile.targetCompanies || "",
        targetLocations: data.profile.targetLocations || "",
        searchKeywords: data.profile.searchKeywords || "",
        profileNotes: data.profile.profileNotes || "",
        outreachStyle: data.profile.outreachStyle || "",
        outreachLength: data.profile.outreachLength || "",
        outreachSignoff: data.profile.outreachSignoff || "",
        outreachPositioning: data.profile.outreachPositioning || "",
        outreachGoals: data.profile.outreachGoals || "",
        preferredEmailClient: data.profile.preferredEmailClient || "",
      };
      setForm(next);
      setBaseline(next);
      setSavedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {(["Discovery profile", "Outreach defaults", "Warm signals"] as const).map((group) => (
        <section key={group}>
          <h2 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">{group}</h2>
          <div className="space-y-4">
            {FIELDS.filter((field) => field.group === group).map((field) => (
              <label key={field.key} className="block rounded-xl border border-[#38332F] bg-[#232020] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077]">{field.label}</span>
                  <span className="text-[11px] text-[#6F665E]">{field.help}</span>
                </div>
                {field.options ? (
                  <select
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#38332F] bg-[#161413] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
                  >
                    {field.options.map((option) => (
                      <option key={option.value || "default"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.rows ? (
                  <textarea
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    rows={field.rows}
                    placeholder={field.placeholder}
                    className="mt-2 w-full resize-none rounded-lg border border-[#38332F] bg-[#161413] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#5C544D] focus:border-[#E8643C]"
                  />
                ) : (
                  <input
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-lg border border-[#38332F] bg-[#161413] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#5C544D] focus:border-[#E8643C]"
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 bg-[#1C1A19]/95 px-1 py-3 backdrop-blur">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f] disabled:cursor-default disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {savedAt && <span className="text-[12px] text-[#7FB069]">saved {savedAt.toLocaleTimeString()}</span>}
        {error && <span className="text-[12px] text-[#E8643C]">{error}</span>}
      </div>
    </div>
  );
}
