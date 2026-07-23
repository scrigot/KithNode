"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface JobSource {
  id: string;
  company: string;
  provider: string;
  careerUrl: string;
  active: boolean;
  lastCheckedAt: string | null;
  lastError: string;
}

const inputClass = "min-h-11 w-full border border-white/[0.12] bg-background px-3 text-sm text-text-primary outline-none focus:border-primary/60";

export function JobSourceSettings() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [company, setCompany] = useState("");
  const [careerUrl, setCareerUrl] = useState("");
  const [searchConfigured, setSearchConfigured] = useState(false);
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await apiFetch("/api/job-sources");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load job sources");
    setSources(data.sources || []);
    setSearchConfigured(Boolean(data.searchConfigured));
    setDiscoveryEnabled(data.discoveryEnabled !== false);
  }, []);

  useEffect(() => { load().catch((error) => setNotice(error instanceof Error ? error.message : "Could not load job sources")); }, [load]);

  async function addSource(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !careerUrl.trim()) return;
    setBusy("add");
    setNotice("");
    try {
      const response = await apiFetch("/api/job-sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company, careerUrl }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save source");
      setCompany("");
      setCareerUrl("");
      setNotice("Official careers source saved.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save source"); }
    finally { setBusy(""); }
  }

  async function patchSource(source: JobSource, patch: Record<string, unknown>) {
    setBusy(source.id);
    setNotice("");
    try {
      const response = await apiFetch(`/api/job-sources/${encodeURIComponent(source.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update source");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update source"); }
    finally { setBusy(""); }
  }

  async function testSource(source: JobSource) {
    setBusy(source.id);
    setNotice("");
    try {
      const response = await apiFetch(`/api/job-sources/${encodeURIComponent(source.id)}/test`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Source test failed");
      setNotice(`${source.company}: ${data.jobCount} open listing${data.jobCount === 1 ? "" : "s"} found.`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Source test failed"); await load().catch(() => undefined); }
    finally { setBusy(""); }
  }

  async function removeSource(source: JobSource) {
    setBusy(source.id);
    setNotice("");
    try {
      const response = await apiFetch(`/api/job-sources/${encodeURIComponent(source.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not remove source");
      setNotice(`${source.company} removed from job discovery.`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove source"); }
    finally { setBusy(""); }
  }

  return (
    <section className="mb-5 border border-white/[0.08] bg-card p-4" aria-labelledby="job-search-sources-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="job-search-sources-title" className="flex items-center gap-2 font-semibold"><Search size={15} />Job search sources</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Career Copilot reads only official public listings. Common AI and finance employers are resolved from KithNode&apos;s verified directory; custom firms can use the optional search connector or a careers URL you approve.</p></div>
        <div className="flex gap-2"><span className={`border px-2 py-1 text-[11px] ${discoveryEnabled ? "border-accent-green/25 text-accent-green" : "border-accent-red/25 text-accent-red"}`}>{discoveryEnabled ? "Discovery enabled" : "Discovery disabled"}</span><span className={`border px-2 py-1 text-[11px] ${searchConfigured ? "border-accent-green/25 text-accent-green" : "border-white/10 text-muted-foreground"}`}>{searchConfigured ? "Automatic search ready" : "Automatic search optional"}</span></div>
      </div>
      {notice ? <p className="mt-3 border border-white/[0.1] bg-background p-3 text-xs text-text-secondary" role="status">{notice}</p> : null}
      <form onSubmit={addSource} className="mt-4 grid gap-2 md:grid-cols-[minmax(9rem,0.35fr)_minmax(0,1fr)_auto]">
        <label><span className="sr-only">Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company" className={inputClass} /></label>
        <label><span className="sr-only">Official careers URL</span><input type="url" value={careerUrl} onChange={(event) => setCareerUrl(event.target.value)} placeholder="https://company.com/careers" className={inputClass} /></label>
        <button type="submit" disabled={!company.trim() || !careerUrl.trim() || Boolean(busy) || !discoveryEnabled} className="min-h-11 bg-primary px-4 text-xs font-bold text-white disabled:opacity-40">{busy === "add" ? <Loader2 className="mx-auto animate-spin" size={15} /> : "Add official source"}</button>
      </form>
      <div className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {sources.length === 0 ? <div className="py-5 text-sm text-muted-foreground">No custom sources saved yet. `/find-jobs` can still connect verified catalog employers automatically.</div> : sources.map((source) => (
          <div key={source.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-text-primary">{source.company}</p><span className="border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{source.provider}</span>{source.active ? <span className="inline-flex items-center gap-1 text-[11px] text-accent-green"><CheckCircle2 size={11} />Active</span> : <span className="text-[11px] text-muted-foreground">Paused</span>}</div><a href={source.careerUrl} target="_blank" rel="noreferrer" className="mt-1 flex max-w-full items-center gap-1 truncate text-xs text-primary"><ExternalLink size={11} />{source.careerUrl}</a><p className={`mt-1 text-[11px] ${source.lastError ? "text-accent-red" : "text-muted-foreground"}`}>{source.lastError || (source.lastCheckedAt ? `Last checked ${new Date(source.lastCheckedAt).toLocaleString()}` : "Not tested yet")}</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => testSource(source)} className="min-h-11 border border-white/10 px-3 text-xs disabled:opacity-40">Test</button><button type="button" disabled={Boolean(busy)} onClick={() => patchSource(source, { active: !source.active })} className="min-h-11 border border-white/10 px-3 text-xs disabled:opacity-40">{source.active ? "Pause" : "Enable"}</button><button type="button" disabled={Boolean(busy)} onClick={() => removeSource(source)} aria-label={`Remove ${source.company}`} className="flex min-h-11 min-w-11 items-center justify-center border border-accent-red/25 text-accent-red disabled:opacity-40"><Trash2 size={14} /></button></div>
          </div>
        ))}
      </div>
    </section>
  );
}
