"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const inputClass = "min-h-11 w-full border border-border bg-canvas px-3 text-base text-text-primary outline-none focus:border-primary";

export default function RecruitingGoalsPage() {
  const [date, setDate] = useState("");
  const [weekly, setWeekly] = useState(3);
  const [roles, setRoles] = useState("");
  const [firms, setFirms] = useState("");
  const [locations, setLocations] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/api/user/preferences").then(async (response) => { const data = await response.json(); setDate(data.recruitingDate ? String(data.recruitingDate).slice(0, 10) : ""); setWeekly(data.weeklyGoalTarget || 3); setRoles((data.targetIndustries || []).join(", ")); setFirms((data.targetFirms || []).join(", ")); setLocations((data.targetLocations || []).join(", ")); }).catch(() => setNotice("Goals could not be loaded." )).finally(() => setLoading(false)); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await apiFetch("/api/user/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recruiting_date: date || null, weekly_goal_target: weekly, target_industries: roles.split(",").map((v) => v.trim()).filter(Boolean), target_companies: firms.split(",").map((v) => v.trim()).filter(Boolean), target_locations: locations.split(",").map((v) => v.trim()).filter(Boolean) }) }); setNotice(response.ok ? "Recruiting goals saved." : "Goals could not be saved."); }
  return <div className="mx-auto max-w-3xl p-5 sm:p-8"><h2 className="font-heading text-xl font-semibold text-text-primary">Recruiting goals</h2><p className="mt-1 text-base text-text-secondary">These goals ground Overview, Career Copilot, job matching, and firm coverage.</p>{notice ? <p className="mt-4 border border-primary/25 bg-primary-soft p-3 text-sm text-primary" role="status">{notice}</p> : null}{loading ? <div className="mt-6 h-48 animate-pulse bg-surface-soft" /> : <form onSubmit={save} className="mt-6 space-y-5"><label><span className="mb-2 block text-sm font-bold text-text-primary">Primary recruiting deadline</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label><label><span className="mb-2 block text-sm font-bold text-text-primary">Weekly coffee-chat target</span><input type="number" min={1} max={25} value={weekly} onChange={(event) => setWeekly(Number(event.target.value))} className={inputClass} /></label><label><span className="mb-2 block text-sm font-bold text-text-primary">Target roles or industries</span><input value={roles} onChange={(event) => setRoles(event.target.value)} placeholder="Investment banking, private equity, consulting" className={inputClass} /></label><label><span className="mb-2 block text-sm font-bold text-text-primary">Target firms</span><textarea rows={4} value={firms} onChange={(event) => setFirms(event.target.value)} placeholder="Goldman Sachs, Evercore, Bain" className={`${inputClass} py-3`} /></label><label><span className="mb-2 block text-sm font-bold text-text-primary">Target locations</span><input value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="New York, Charlotte, London" className={inputClass} /></label><button className="min-h-11 bg-primary px-4 font-bold text-white"><Save className="mr-2 inline h-4 w-4" />Save goals</button></form>}</div>;
}
