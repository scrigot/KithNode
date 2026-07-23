"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Copy, FileJson, History, IdCard, Loader2, Plus, RotateCcw, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { CareerToolkitNav } from "@/components/career-toolkit-nav";
import { auditLinkedInProfile, type LinkedInAudit } from "@/lib/linkedin-profile/audit";
import {
  EMPTY_LINKEDIN_PROFILE,
  SECTION_DEFINITIONS,
  normalizeLinkedInProfile,
  type LinkedInProfileContent,
  type LinkedInSectionItem,
  type LinkedInSectionKey,
} from "@/lib/linkedin-profile/schema";

interface Revision {
  id: string;
  version: number;
  score: number;
  changeSummary: string;
  source: string;
  createdAt: string;
}

interface StoredProfile {
  id: string;
  name: string;
  linkedInUrl: string;
  source: string;
  status: string;
  isPrimary: boolean;
  score: number;
  content: unknown;
  audit: unknown;
  updatedAt: string;
  revisions?: Revision[];
  _count?: { revisions: number };
}

const inputClass = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";
const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

async function jsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { error: `Server returned a non-JSON response (${response.status})` }; }
}

function newItem(key: LinkedInSectionKey): LinkedInSectionItem {
  return {
    id: `${key}-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
    title: "",
    subtitle: "",
    organization: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    url: "",
    skills: [],
    media: [],
    extra: {},
  };
}

export default function LinkedInWorkspacePage() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selected, setSelected] = useState<StoredProfile | null>(null);
  const [content, setContent] = useState<LinkedInProfileContent>(() => normalizeLinkedInProfile(EMPTY_LINKEDIN_PROFILE));
  const [audit, setAudit] = useState<LinkedInAudit>(() => auditLinkedInProfile(EMPTY_LINKEDIN_PROFILE));
  const [tab, setTab] = useState<"editor" | "audit" | "history">("editor");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadProfiles = useCallback(async (preferredId?: string) => {
    const response = await apiFetch("/api/linkedin-profiles");
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(String(data.error || "Could not load LinkedIn profiles"));
    const rows = Array.isArray(data.profiles) ? data.profiles as StoredProfile[] : [];
    setProfiles(rows);
    const target = preferredId || rows[0]?.id;
    if (target) await openProfile(target, false);
    else {
      setSelected(null);
      setContent(normalizeLinkedInProfile(EMPTY_LINKEDIN_PROFILE));
    }
  }, []);

  useEffect(() => {
    loadProfiles().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load profiles"));
  }, [loadProfiles]);

  async function openProfile(id: string, showBusy = true) {
    if (showBusy) setBusy("load");
    setError("");
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${encodeURIComponent(id)}`);
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not load profile"));
      const profile = data.profile as unknown as StoredProfile;
      const normalized = normalizeLinkedInProfile(profile.content);
      setSelected(profile);
      setContent(normalized);
      setAudit(auditLinkedInProfile(normalized));
      setChangeSummary("");
      setSaved("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load profile");
    } finally {
      if (showBusy) setBusy("");
    }
  }

  async function createProfile(source: "manual" | "json_import", imported?: unknown) {
    setBusy("create");
    setError("");
    try {
      const normalized = imported === undefined ? EMPTY_LINKEDIN_PROFILE : normalizeLinkedInProfile(imported);
      const response = await apiFetch("/api/linkedin-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, content: normalized }),
      });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not create profile"));
      const profile = data.profile as unknown as StoredProfile;
      setImportOpen(false);
      setImportJson("");
      await loadProfiles(profile.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create profile");
    } finally { setBusy(""); }
  }

  async function submitImport() {
    try {
      const parsed = JSON.parse(importJson);
      await createProfile("json_import", parsed);
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "The pasted profile is not valid JSON" : caught instanceof Error ? caught.message : "Could not import profile");
    }
  }

  async function saveProfile() {
    if (!selected) return;
    setBusy("save");
    setError("");
    setSaved("");
    try {
      const displayName = [content.basics.firstName, content.basics.lastName].filter(Boolean).join(" ") || selected.name;
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          linkedInUrl: content.basics.profileUrl,
          content,
          changeSummary: changeSummary || "Edited profile",
        }),
      });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not save profile"));
      setAudit(auditLinkedInProfile(content));
      setSaved("Saved with a new revision");
      await loadProfiles(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile");
    } finally { setBusy(""); }
  }

  async function duplicateProfile() {
    if (!selected) return;
    setBusy("duplicate");
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}/duplicate`, { method: "POST" });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not duplicate profile"));
      await loadProfiles((data.profile as unknown as StoredProfile).id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not duplicate profile"); }
    finally { setBusy(""); }
  }

  async function archiveProfile() {
    if (!selected) return;
    setBusy("archive");
    setError("");
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "archived",
          isPrimary: false,
          content,
          changeSummary: "Archived profile",
        }),
      });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not archive profile"));
      await loadProfiles();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not archive profile"); }
    finally { setBusy(""); }
  }

  async function deleteProfile() {
    if (!selected) return;
    setBusy("delete");
    setError("");
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}`, { method: "DELETE" });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not delete profile"));
      setDeleteOpen(false);
      const promotedProfileId = typeof data.promotedProfileId === "string" ? data.promotedProfileId : undefined;
      await loadProfiles(promotedProfileId);
      setSaved("Profile deleted permanently");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete profile");
    } finally {
      setBusy("");
    }
  }

  async function setPrimaryProfile() {
    if (!selected) return;
    setBusy("primary");
    setError("");
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true, status: "current", content, changeSummary: "Set as primary profile" }),
      });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not set primary profile"));
      await loadProfiles(selected.id);
      setSaved("Set as primary profile");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not set primary profile"); }
    finally { setBusy(""); }
  }

  async function copyProfileJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setSaved("Profile JSON copied");
    } catch {
      setError("Clipboard access was unavailable. Use the JSON import/export workflow in a supported browser.");
    }
  }

  async function restoreRevision(revision: Revision) {
    if (!selected) return;
    setBusy(`restore:${revision.id}`);
    try {
      const response = await apiFetch(`/api/linkedin-profiles/${selected.id}/revisions/${revision.id}/restore`, { method: "POST" });
      const data = await jsonResponse(response);
      if (!response.ok) throw new Error(String(data.error || "Could not restore revision"));
      await loadProfiles(selected.id);
      setSaved(`Restored version ${revision.version}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not restore revision"); }
    finally { setBusy(""); }
  }

  function patchBasics(key: keyof LinkedInProfileContent["basics"], value: string | boolean) {
    setContent((current) => ({ ...current, basics: { ...current.basics, [key]: value } }));
  }
  function patchPositioning(key: keyof LinkedInProfileContent["positioning"], value: string | string[]) {
    setContent((current) => ({ ...current, positioning: { ...current.positioning, [key]: value } }));
  }
  function patchItem(section: LinkedInSectionKey, id: string, patch: Partial<LinkedInSectionItem>) {
    setContent((current) => ({ ...current, sections: { ...current.sections, [section]: current.sections[section].map((item) => item.id === id ? { ...item, ...patch } : item) } }));
  }
  function addItem(section: LinkedInSectionKey) {
    setContent((current) => ({ ...current, sections: { ...current.sections, [section]: [...current.sections[section], newItem(section)] } }));
  }
  function removeItem(section: LinkedInSectionKey, id: string) {
    setContent((current) => ({ ...current, sections: { ...current.sections, [section]: current.sections[section].filter((item) => item.id !== id) } }));
  }

  const currentAudit = useMemo(() => auditLinkedInProfile(content), [content]);
  const revisions = selected?.revisions || [];

  return (
    <div className="min-h-full bg-bg-primary">
      <CareerToolkitNav />
      <div className="flex min-h-[calc(100vh-112px)] bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border-soft bg-card md:flex md:flex-col">
        <div className="border-b border-border-soft p-4">
          <div className="flex items-center gap-2 text-primary"><IdCard size={18} /><h1 className="font-bold">Profile workspace</h1></div>
          <p className="mt-1 text-xs text-muted-foreground">Private copies, audits, and revision history.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => createProfile("manual")} disabled={Boolean(busy)} className="flex items-center justify-center gap-1 bg-primary px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"><Plus size={13} /> New</button>
            <button onClick={() => setImportOpen(true)} disabled={Boolean(busy)} className="flex items-center justify-center gap-1 border border-border px-2 py-2 text-xs disabled:opacity-50"><FileJson size={13} /> Import</button>
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {profiles.map((profile) => (
            <button key={profile.id} onClick={() => openProfile(profile.id)} className={`w-full border p-3 text-left ${selected?.id === profile.id ? "border-primary/40 bg-primary/10" : "border-transparent hover:border-border hover:bg-background"}`}>
              <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{profile.name}</span><span className="font-mono text-xs text-primary">{profile.score}</span></div>
              <p className="mt-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">{profile.isPrimary && <CheckCircle2 size={10} className="text-accent-green" />}{profile.status} · {profile._count?.revisions || 0} versions</p>
            </button>
          ))}
          {!profiles.length && <p className="p-3 text-xs text-muted-foreground">Create a profile copy or import structured JSON to begin.</p>}
        </div>
        <div className="border-t border-border-soft p-3 text-[10px] leading-relaxed text-muted-foreground"><ShieldCheck size={12} className="mb-1 text-accent-green" />KithNode does not log into LinkedIn or publish changes. You review and copy edits manually.</div>
      </aside>

      <main className="min-w-0 flex-1 p-4 lg:p-6">
        {importOpen && (
          <section className="mb-4 border border-primary/30 bg-card p-4">
            <h2 className="text-sm font-bold">Import a profile copy</h2>
            <p className="mt-1 text-xs text-muted-foreground">Paste KithNode extension output or structured profile JSON. Unknown executable content is never run.</p>
            <textarea value={importJson} onChange={(event) => setImportJson(event.target.value)} rows={8} placeholder='{"name":"Your name","headline":"...","experiences":[]}' className={`mt-3 font-mono ${inputClass}`} />
            <div className="mt-2 flex gap-2"><button onClick={submitImport} disabled={!importJson.trim() || Boolean(busy)} className="bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Import copy</button><button onClick={() => setImportOpen(false)} className="border border-border px-3 py-2 text-xs">Cancel</button></div>
          </section>
        )}

        {!selected ? (
          <div className="mx-auto mt-24 max-w-xl border border-border-soft bg-card p-8 text-center"><IdCard className="mx-auto text-primary" size={32} /><h2 className="mt-3 text-lg font-bold">Build your LinkedIn source of truth</h2><p className="mt-2 text-sm text-muted-foreground">Keep multiple versions, audit every section, and preserve the history of every revision.</p><button onClick={() => createProfile("manual")} className="mt-5 bg-primary px-4 py-2 text-sm font-semibold text-white">Create profile copy</button></div>
        ) : (
          <div className="mx-auto max-w-7xl">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold">{selected.name}</h1>{selected.isPrimary && <span className="bg-accent-green/10 px-2 py-1 text-[10px] font-bold uppercase text-accent-green">Primary</span>}</div><p className="mt-1 text-xs text-muted-foreground">Last saved {new Date(selected.updatedAt).toLocaleString()} · score {selected.score}/100</p></div>
              <div className="flex flex-wrap gap-2">{!selected.isPrimary && <button onClick={setPrimaryProfile} disabled={Boolean(busy)} className="flex items-center gap-1 border border-accent-green/30 px-3 py-2 text-xs text-accent-green"><CheckCircle2 size={13} /> Set primary</button>}<button onClick={copyProfileJson} disabled={Boolean(busy)} className="flex items-center gap-1 border border-border px-3 py-2 text-xs"><FileJson size={13} /> Copy JSON</button><button onClick={duplicateProfile} disabled={Boolean(busy)} className="flex items-center gap-1 border border-border px-3 py-2 text-xs"><Copy size={13} /> Duplicate</button><button onClick={archiveProfile} disabled={Boolean(busy)} className="flex items-center gap-1 border border-border px-3 py-2 text-xs text-muted-foreground"><Archive size={13} /> Archive</button><button onClick={() => setDeleteOpen(true)} disabled={Boolean(busy)} className="flex items-center gap-1 border border-accent-red/30 px-3 py-2 text-xs text-accent-red disabled:opacity-50"><Trash2 size={13} /> Delete</button><button onClick={saveProfile} disabled={Boolean(busy)} className="flex items-center gap-1 bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save revision</button></div>
            </header>
            {(error || saved) && <div className={`mb-4 border p-3 text-sm ${error ? "border-accent-red/30 bg-accent-red/10 text-accent-red" : "border-accent-green/30 bg-accent-green/10 text-accent-green"}`}>{error || saved}</div>}
            <div className="mb-4 flex border-b border-border-soft">
              {(["editor", "audit", "history"] as const).map((item) => <button key={item} onClick={() => { setTab(item); if (item === "audit") setAudit(currentAudit); }} className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{item === "audit" ? `Audit · ${currentAudit.score}` : item}</button>)}
            </div>

            {tab === "editor" && (
              <div className="space-y-4">
                <section className="border border-border-soft bg-card p-4">
                  <h2 className="text-sm font-bold">Top card & contact info</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {([[
                      "firstName", "First name"], ["lastName", "Last name"], ["pronouns", "Pronouns"], ["location", "Location"], ["industry", "Industry"], ["profileUrl", "LinkedIn URL"], ["website", "Website"], ["email", "Email"], ["phone", "Phone"], ["profilePhotoUrl", "Profile photo URL"], ["bannerImageUrl", "Banner image URL"], ["customButtonLabel", "Custom button label"], ["customButtonUrl", "Custom button URL"]] as Array<[keyof LinkedInProfileContent["basics"], string]>).map(([key, label]) => <label key={key as string}><span className={labelClass}>{label}</span><input value={String(content.basics[key] || "")} onChange={(event) => patchBasics(key, event.target.value)} className={inputClass} /></label>)}
                    <label className="sm:col-span-2 lg:col-span-3"><span className={labelClass}>Headline</span><input value={content.basics.headline} onChange={(event) => patchBasics("headline", event.target.value)} maxLength={300} className={inputClass} /><span className="mt-1 block text-right text-[10px] text-muted-foreground">{content.basics.headline.length}/300</span></label>
                    <label className="sm:col-span-2 lg:col-span-3"><span className={labelClass}>About</span><textarea value={content.basics.about} onChange={(event) => patchBasics("about", event.target.value)} rows={8} className={inputClass} /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4">{([[
                    "openToWork", "Open to work"], ["hiring", "Hiring"], ["creatorMode", "Creator mode"], ["providingServices", "Providing services"]] as Array<[keyof LinkedInProfileContent["basics"], string]>).map(([key, label]) => <label key={key as string} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(content.basics[key])} onChange={(event) => patchBasics(key, event.target.checked)} />{label}</label>)}</div>
                </section>

                <section className="border border-border-soft bg-card p-4">
                  <h2 className="text-sm font-bold">Target positioning & recruiter search</h2><p className="mt-1 text-xs text-muted-foreground">Private planning fields guide the audit; they are not assumed to be public LinkedIn fields.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([[
                      "targetRoles", "Target roles"], ["targetIndustries", "Target industries"], ["targetLocations", "Target locations"], ["keywords", "Search keywords"]] as Array<["targetRoles" | "targetIndustries" | "targetLocations" | "keywords", string]>).map(([key, label]) => <label key={key}><span className={labelClass}>{label} · comma separated</span><input value={content.positioning[key].join(", ")} onChange={(event) => patchPositioning(key, event.target.value.split(",").map((value) => value.trim()).filter(Boolean))} className={inputClass} /></label>)}
                    <label className="sm:col-span-2"><span className={labelClass}>Value proposition</span><textarea rows={3} value={content.positioning.valueProposition} onChange={(event) => patchPositioning("valueProposition", event.target.value)} className={inputClass} /></label>
                    <label className="sm:col-span-2"><span className={labelClass}>Call to action</span><input value={content.positioning.callToAction} onChange={(event) => patchPositioning("callToAction", event.target.value)} className={inputClass} /></label>
                  </div>
                </section>

                {SECTION_DEFINITIONS.map((definition) => (
                  <details key={definition.key} className="border border-border-soft bg-card" open={definition.key === "experience" || definition.key === "education" || definition.key === "skills"}>
                    <summary className="cursor-pointer list-none p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">{definition.label} <span className="font-mono text-xs text-primary">{content.sections[definition.key].length}</span></h2><p className="mt-1 text-xs text-muted-foreground">{definition.hint}</p></div><button type="button" onClick={(event) => { event.preventDefault(); addItem(definition.key); }} className="flex shrink-0 items-center gap-1 border border-border px-2 py-1 text-xs text-primary"><Plus size={12} /> Add</button></div></summary>
                    <div className="space-y-3 border-t border-border-soft p-4">
                      {!content.sections[definition.key].length && <p className="text-xs text-muted-foreground">No {definition.label.toLowerCase()} recorded.</p>}
                      {content.sections[definition.key].map((item, index) => (
                        <article key={item.id} className="border border-border-soft bg-background p-3">
                          <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase text-muted-foreground">{definition.singular} {index + 1}</p><button onClick={() => removeItem(definition.key, item.id)} className="text-muted-foreground hover:text-accent-red" aria-label={`Remove ${definition.singular}`}><Trash2 size={13} /></button></div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <label><span className={labelClass}>Title / name</span><input value={item.title} onChange={(event) => patchItem(definition.key, item.id, { title: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>Subtitle / credential</span><input value={item.subtitle} onChange={(event) => patchItem(definition.key, item.id, { subtitle: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>Organization / issuer</span><input value={item.organization} onChange={(event) => patchItem(definition.key, item.id, { organization: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>Location</span><input value={item.location} onChange={(event) => patchItem(definition.key, item.id, { location: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>Start / issued date</span><input value={item.startDate} onChange={(event) => patchItem(definition.key, item.id, { startDate: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>End / expiration date</span><input value={item.endDate} onChange={(event) => patchItem(definition.key, item.id, { endDate: event.target.value })} className={inputClass} /></label>
                            <label className="sm:col-span-2"><span className={labelClass}>URL / verification link</span><input value={item.url} onChange={(event) => patchItem(definition.key, item.id, { url: event.target.value })} className={inputClass} /></label>
                            <label><span className={labelClass}>Skills · comma separated</span><input value={item.skills.join(", ")} onChange={(event) => patchItem(definition.key, item.id, { skills: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} className={inputClass} /></label>
                            <label className="sm:col-span-2 lg:col-span-3"><span className={labelClass}>Description / details</span><textarea value={item.description} onChange={(event) => patchItem(definition.key, item.id, { description: event.target.value })} rows={4} className={inputClass} /></label>
                          </div>
                        </article>
                      ))}
                      <button onClick={() => addItem(definition.key)} className="flex items-center gap-1 text-xs font-semibold text-primary"><Plus size={12} /> Add {definition.singular}</button>
                    </div>
                  </details>
                ))}
                <section className="border border-border-soft bg-card p-4"><label><span className={labelClass}>Private workspace notes</span><textarea value={content.notes} onChange={(event) => setContent((current) => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></label></section>
                <section className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 border border-primary/20 bg-card/95 p-3 shadow-sm backdrop-blur"><input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="What changed? (optional)" className={`min-w-60 flex-1 ${inputClass}`} /><button onClick={saveProfile} disabled={Boolean(busy)} className="flex items-center gap-1 bg-primary px-4 py-2 text-xs font-bold text-white"><Save size={13} /> Save revision</button></section>
              </div>
            )}

            {tab === "audit" && <AuditPanel audit={audit} onRun={() => setAudit(auditLinkedInProfile(content))} />}

            {tab === "history" && (
              <section className="border border-border-soft bg-card p-4"><div className="flex items-center gap-2"><History size={16} className="text-primary" /><h2 className="text-sm font-bold">Revision history</h2></div><p className="mt-1 text-xs text-muted-foreground">Every save is immutable. Restoring an old version creates a new revision; it never erases history.</p><div className="mt-4 space-y-2">{revisions.map((revision) => <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 border border-border-soft bg-background p-3"><div><p className="text-sm font-semibold">Version {revision.version} · {revision.changeSummary || revision.source}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(revision.createdAt).toLocaleString()} · score {revision.score}/100 · {revision.source}</p></div><button onClick={() => restoreRevision(revision)} disabled={Boolean(busy)} className="flex items-center gap-1 border border-border px-3 py-2 text-xs disabled:opacity-50">{busy === `restore:${revision.id}` ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Restore</button></div>)}</div></section>
            )}
          </div>
        )}
      </main>
      </div>
      {deleteOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-linkedin-profile-title"
            className="w-full max-w-md border border-accent-red/30 bg-card shadow-2xl"
          >
            <div className="border-b border-border-soft p-5">
              <div className="flex h-10 w-10 items-center justify-center border border-accent-red/30 bg-accent-red/10 text-accent-red"><Trash2 size={18} /></div>
              <h2 id="delete-linkedin-profile-title" className="mt-4 text-lg font-bold">Delete this profile permanently?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{selected.name}</span> and its {selected.revisions?.length || selected._count?.revisions || 0} saved revision{(selected.revisions?.length || selected._count?.revisions || 0) === 1 ? "" : "s"} will be deleted. This cannot be undone.
              </p>
              {selected.isPrimary && <p className="mt-3 border border-primary/20 bg-primary/10 p-3 text-xs text-primary">This is your primary profile. KithNode will promote the most recently updated remaining profile.</p>}
            </div>
            <div className="flex justify-end gap-2 p-4">
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={busy === "delete"} className="border border-border px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
              <button type="button" onClick={deleteProfile} disabled={busy === "delete"} className="flex items-center gap-2 bg-accent-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AuditPanel({ audit, onRun }: { audit: LinkedInAudit; onRun: () => void }) {
  return <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
    <aside className="space-y-4"><section className="border border-border-soft bg-card p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile score</p><p className="mt-2 font-mono text-5xl font-bold text-primary">{audit.score}</p><p className="text-xs text-muted-foreground">out of 100</p><button onClick={onRun} className="mt-4 flex w-full items-center justify-center gap-1 bg-primary px-3 py-2 text-xs font-bold text-white"><Sparkles size={13} /> Audit current draft</button></section><section className="border border-border-soft bg-card p-4"><h3 className="text-xs font-bold uppercase text-muted-foreground">Dimensions</h3><div className="mt-3 space-y-3">{audit.dimensions.map((dimension) => <div key={dimension.key}><div className="flex justify-between text-xs"><span>{dimension.label}</span><span className="font-mono text-primary">{dimension.score}/{dimension.max}</span></div><div className="mt-1 h-1.5 bg-surface-selected"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (dimension.score / dimension.max) * 100)}%` }} /></div></div>)}</div></section></aside>
    <div className="space-y-4"><section className="border border-border-soft bg-card p-4"><h2 className="text-sm font-bold">Priority fixes</h2><div className="mt-3 space-y-2">{audit.issues.map((issue) => <article key={issue.id} className={`border-l-2 p-3 ${issue.severity === "high" ? "border-accent-red bg-accent-red/5" : issue.severity === "medium" ? "border-accent-amber bg-accent-amber/5" : "border-primary bg-primary/5"}`}><div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase text-muted-foreground">{issue.severity} · {issue.section}</span></div><p className="mt-1 text-sm font-semibold">{issue.title}</p><p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p><p className="mt-2 text-xs"><strong>Revise:</strong> {issue.recommendation}</p></article>)}{!audit.issues.length && <p className="text-sm text-accent-green">No audit issues found.</p>}</div></section>{audit.strengths.length > 0 && <section className="border border-accent-green/20 bg-accent-green/5 p-4"><h3 className="text-xs font-bold uppercase text-accent-green">Strengths</h3><ul className="mt-2 space-y-1 text-sm">{audit.strengths.map((strength) => <li key={strength} className="flex items-center gap-2"><CheckCircle2 size={13} className="text-accent-green" />{strength}</li>)}</ul></section>}<section className="border border-border-soft bg-card p-4"><h3 className="text-xs font-bold uppercase text-muted-foreground">Keyword coverage</h3><div className="mt-3 flex flex-wrap gap-2">{audit.keywordCoverage.present.map((keyword) => <span key={keyword} className="bg-accent-green/10 px-2 py-1 text-xs text-accent-green">{keyword}</span>)}{audit.keywordCoverage.missing.map((keyword) => <span key={keyword} className="bg-accent-amber/10 px-2 py-1 text-xs text-accent-amber">Missing: {keyword}</span>)}{!audit.keywordCoverage.present.length && !audit.keywordCoverage.missing.length && <span className="text-xs text-muted-foreground">Add target keywords in Positioning to measure coverage.</span>}</div></section></div>
  </div>;
}
