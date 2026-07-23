"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Link2,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { buildLinkedInPeopleSearch } from "@/lib/guided-research/source-policy";
import { normalizeResearchSkills, RESEARCH_FIELDS, RESEARCH_SCALAR_FIELDS, type ResearchPayload, type ResearchPosition } from "@/lib/guided-research/schema";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";

type Intent = "research" | "suggested" | "queue";
type Draft = {
  id: string;
  status: string;
  sourceType: string;
  sourceUrl: string;
  target: Record<string, string>;
  payload: ResearchPayload;
  selectedFields: string[];
  updatedAt: string;
};

const emptyPayload: ResearchPayload = {
  name: "",
  title: "",
  firmName: "",
  location: "",
  education: "",
  skills: [],
  linkedInUrl: "",
  notes: "",
  whyRelevant: "",
  positions: [],
};

const fieldLabels: Record<(typeof RESEARCH_FIELDS)[number], string> = {
  name: "Name",
  title: "Role / headline",
  firmName: "Current firm",
  location: "Location",
  education: "Education",
  notes: "Research notes",
  skills: "Professional skills",
  positions: "Current positions",
};

export function DiscoverIntentNav({ active }: { active: Intent }) {
  const router = useRouter();
  const items: Array<{ id: Intent; label: string; detail: string }> = [
    { id: "research", label: "Research a target", detail: "Open a focused search and review facts" },
    { id: "suggested", label: "Suggested people", detail: "Review KithNode's ranked network" },
    { id: "queue", label: "Review queue", detail: "Finish private research drafts" },
  ];
  return (
    <nav aria-label="Discover workspace" className="grid grid-cols-3 border-b border-white/[0.08] bg-bg-secondary">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => router.push(`/dashboard/discover?view=${item.id}`)}
          aria-current={active === item.id ? "page" : undefined}
          className={`min-h-14 min-w-0 border-r px-2 py-2.5 text-left transition-colors sm:min-h-16 sm:px-4 sm:py-3 ${
            active === item.id
              ? "border-primary bg-primary/[0.10] text-text-primary"
              : "border-white/[0.08] text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          }`}
        >
          <span className="flex items-start gap-1.5 text-xs font-bold leading-4 sm:items-center sm:gap-2 sm:text-sm">
            <span className="font-mono text-[10px] text-accent-teal sm:text-[11px]">0{index + 1}</span>
            {item.label}
          </span>
          <span className="mt-1 hidden text-sm text-text-muted sm:block">{item.detail}</span>
        </button>
      ))}
    </nav>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text-secondary">{label}</span>{children}</label>;
}

const inputClass = "min-h-11 w-full border border-white/[0.12] bg-bg-primary px-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

function SkillEditor({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const additions = raw.split(/[\n,;•]+/).map((skill) => skill.trim()).filter(Boolean);
    if (additions.length) onChange(normalizeResearchSkills([...skills, ...additions]));
    setDraft("");
  };
  return (
    <div className="border border-white/[0.12] bg-bg-secondary p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-text-primary">Professional skills</p><p className="mt-0.5 text-xs text-text-muted">Add every reviewed LinkedIn skill. AI and finance terms become searchable.</p></div>
        <span className="font-mono text-[11px] text-text-muted">{skills.length}/100</span>
      </div>
      {skills.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <button key={skill.toLocaleLowerCase()} type="button" onClick={() => onChange(skills.filter((item) => item !== skill))} className="inline-flex min-h-9 items-center gap-1.5 border border-primary/30 bg-primary/10 px-2.5 text-sm text-accent-teal hover:border-red-400/40 hover:text-red-200">{skill}<X className="h-3.5 w-3.5" /></button>)}</div>}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input aria-label="Add professional skill" className={inputClass} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(draft); } }} onPaste={(event) => { const text = event.clipboardData.getData("text"); if (/[\n,;•]/.test(text)) { event.preventDefault(); add(text); } }} onBlur={() => { if (draft.trim()) add(draft); }} placeholder="Paste a list, or add one skill at a time" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(draft)} disabled={!draft.trim() || skills.length >= 100} className="min-h-11 border border-primary/40 px-4 text-sm font-bold text-accent-teal hover:bg-primary/10 disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}

export function GuidedResearchWorkspace({ initialView, activeDraftId }: { initialView: "research" | "queue"; activeDraftId?: string | null }) {
  const router = useRouter();
  const [target, setTarget] = useState({ company: "", role: "", location: "", school: "" });
  const [payload, setPayload] = useState<ResearchPayload>(emptyPayload);
  const [selected, setSelected] = useState<string[]>([...RESEARCH_FIELDS]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftId, setDraftId] = useState(activeDraftId || "");
  const [loading, setLoading] = useState(initialView === "queue" || !!activeDraftId);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/research/drafts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Could not load research drafts.");
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load research drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialView === "queue") void loadDrafts();
  }, [initialView, loadDrafts]);

  useEffect(() => {
    if (!activeDraftId) return;
    setLoading(true);
    apiFetch(`/api/research/drafts?id=${encodeURIComponent(activeDraftId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Draft not found.");
        const draft = data.draft as Draft;
        setDraftId(draft.id);
        setTarget({ company: draft.target.company || "", role: draft.target.role || "", location: draft.target.location || "", school: draft.target.school || "" });
        setPayload({ ...emptyPayload, ...draft.payload, skills: draft.payload.skills || [] });
        setSelected(draft.selectedFields?.length ? draft.selectedFields : [...RESEARCH_FIELDS]);
        setPreviewOpen(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Draft not found."))
      .finally(() => setLoading(false));
  }, [activeDraftId]);

  const searchUrl = useMemo(() => buildLinkedInPeopleSearch(target), [target]);
  const missing = RESEARCH_SCALAR_FIELDS.filter((field) => field !== "notes" && !payload[field].trim());
  const canPreview = Boolean(payload.name.trim() && payload.linkedInUrl.trim());

  const updatePayload = (field: Exclude<keyof ResearchPayload, "positions" | "skills">, value: string) => setPayload((current) => ({ ...current, [field]: value }));
  const updatePosition = (index: number, patch: Partial<ResearchPosition>) => setPayload((current) => ({
    ...current,
    positions: current.positions.map((position, positionIndex) => positionIndex === index ? { ...position, ...patch } : position),
  }));
  const addPosition = () => setPayload((current) => ({
    ...current,
    positions: [...current.positions, {
      title: current.positions.length ? "" : current.title,
      firm: current.positions.length ? "" : current.firmName,
      employmentType: "",
      start: "",
      end: "Present",
    }],
  }));
  const removePosition = (index: number) => setPayload((current) => ({
    ...current,
    positions: current.positions.filter((_, positionIndex) => positionIndex !== index),
  }));
  const previewValue = (field: (typeof RESEARCH_FIELDS)[number]) => field === "positions"
    ? payload.positions.map((position) => [position.title, position.firm].filter(Boolean).join(" at ")).filter(Boolean).join("; ")
    : field === "skills" ? payload.skills.join(", ") : payload[field];

  async function saveDraft() {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/research/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "linkedin_manual", sourceUrl: payload.linkedInUrl, target, payload, selectedFields: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error === "invalid_research_draft" ? "Add a name and valid LinkedIn profile URL." : data.message || data.error || "Could not save draft.");
      setDraftId(data.draft.id);
      setPreviewOpen(true);
      setNotice("Private draft saved. Nothing has changed in your network yet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function commitDraft() {
    if (!draftId) return;
    setCommitting(true);
    setError("");
    try {
      const res = await apiFetch(`/api/research/drafts/${draftId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedFields: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Could not add this person.");
      setNotice(data.overlay ? "Added to your network with a private profile overlay." : "Added to your network with verified field sources.");
      setPreviewOpen(false);
      router.push(`/contact/${data.contactId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this person.");
    } finally {
      setCommitting(false);
    }
  }

  async function discard(id: string) {
    await apiFetch(`/api/research/drafts/${id}`, { method: "DELETE" });
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  if (loading) return <><DiscoverIntentNav active={initialView} /><WorkspaceLoading label="Loading private research" /></>;
  if (initialView === "queue" && error) return <><DiscoverIntentNav active="queue" /><WorkspaceError message={error} onRetry={loadDrafts} /></>;

  if (initialView === "queue") {
    return (
      <div className="min-h-full bg-bg-primary">
        <DiscoverIntentNav active="queue" />
        <WorkspaceHeader eyebrow="Network intelligence" title="Review queue" description="Private research drafts waiting for your field-by-field approval." />
        <div className="p-4 sm:p-6">
          {drafts.length === 0 ? (
            <div className="border border-white/[0.08] bg-card p-8 sm:p-10">
              <FileCheck2 className="h-8 w-8 text-accent-teal" />
              <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">Your queue is clear</h2>
              <p className="mt-2 max-w-xl text-base text-text-secondary">Start with a company or role. KithNode will keep the research focused and hold your notes for review.</p>
              <button onClick={() => router.push("/dashboard/discover?view=research")} className="mt-5 min-h-11 bg-primary px-4 text-sm font-bold text-white hover:bg-primary/80">Research a target</button>
            </div>
          ) : (
            <div className="overflow-hidden border border-white/[0.08] bg-card">
              <div className="grid grid-cols-[1fr_auto] border-b border-white/[0.08] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted sm:grid-cols-[1.2fr_1fr_160px_auto]">
                <span>Person</span><span className="hidden sm:block">Context</span><span className="hidden sm:block">Updated</span><span>Action</span>
              </div>
              {drafts.map((draft) => (
                <div key={draft.id} className="grid min-h-20 grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.08] px-4 py-3 last:border-0 sm:grid-cols-[1.2fr_1fr_160px_auto]">
                  <div><p className="font-semibold text-text-primary">{draft.payload.name}</p><p className="text-sm text-text-secondary">{draft.payload.title || "Role not recorded"}</p></div>
                  <p className="hidden text-sm text-text-secondary sm:block">{draft.payload.firmName || draft.target.company || "No firm"}</p>
                  <p className="hidden font-mono text-xs text-text-muted sm:block">{new Date(draft.updatedAt).toLocaleDateString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/dashboard/discover?view=research&draft=${draft.id}`)} className="min-h-11 border border-primary/40 px-3 text-sm font-bold text-accent-teal hover:bg-primary/10">Review</button>
                    <button onClick={() => void discard(draft.id)} aria-label={`Discard ${draft.payload.name}`} className="min-h-11 min-w-11 border border-white/[0.12] text-text-muted hover:text-red-300"><Trash2 className="mx-auto h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg-primary">
      <DiscoverIntentNav active="research" />
      <WorkspaceHeader
        eyebrow="Guided network research"
        title="Find the right person—with evidence"
        description="Define the relationship you need, open a focused LinkedIn search, then bring back only the facts you personally reviewed."
        actions={<StatusBadge tone="success"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Review required</StatusBadge>}
      />
      <main className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="p-4 sm:p-6">
          {error && <div role="alert" className="mb-4 border border-red-400/30 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">{error}</div>}
          {notice && <div role="status" className="mb-4 border border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-200">{notice}</div>}

          <section className="border border-white/[0.08] bg-card">
            <div className="flex items-start gap-4 border-b border-white/[0.08] p-4 sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-accent-teal">01</span>
              <div><h2 className="font-heading text-lg font-semibold text-text-primary">Define the target</h2><p className="mt-1 text-sm text-text-secondary">Be specific enough to make every result explainable.</p></div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Company"><div className="relative"><Building2 className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" /><input className={`${inputClass} pl-10`} value={target.company} onChange={(e) => setTarget({ ...target, company: e.target.value })} placeholder="e.g. Deloitte" /></div></Field>
              <Field label="Role or function"><div className="relative"><UserRound className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" /><input className={`${inputClass} pl-10`} value={target.role} onChange={(e) => setTarget({ ...target, role: e.target.value })} placeholder="e.g. Strategy analyst" /></div></Field>
              <Field label="Location"><div className="relative"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" /><input className={`${inputClass} pl-10`} value={target.location} onChange={(e) => setTarget({ ...target, location: e.target.value })} placeholder="e.g. New York" /></div></Field>
              <Field label="Shared school or context"><input className={inputClass} value={target.school} onChange={(e) => setTarget({ ...target, school: e.target.value })} placeholder="e.g. UNC / Kenan-Flagler" /></Field>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/[0.08] bg-bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-text-primary">KithNode will open this search in a new tab.</p><p className="text-sm text-text-muted">You stay in control of navigation and what you choose to record.</p></div>
              <a href={searchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-sm font-bold text-white hover:bg-primary/80"><Search className="h-4 w-4" />Open focused search<ExternalLink className="h-4 w-4" /></a>
            </div>
          </section>

          <section className="mt-5 border border-white/[0.08] bg-card">
            <div className="flex items-start gap-4 border-b border-white/[0.08] p-4 sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-accent-teal">02</span>
              <div><h2 className="font-heading text-lg font-semibold text-text-primary">Record reviewed facts</h2><p className="mt-1 text-sm text-text-secondary">Paste or type only what you saw. Empty fields stay explicitly unknown.</p></div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Full name"><input className={inputClass} value={payload.name} onChange={(e) => updatePayload("name", e.target.value)} placeholder="Required" /></Field>
              <Field label="LinkedIn profile URL"><div className="relative"><Link2 className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" /><input className={`${inputClass} pl-10`} value={payload.linkedInUrl} onChange={(e) => updatePayload("linkedInUrl", e.target.value)} placeholder="https://www.linkedin.com/in/..." /></div></Field>
              <Field label="Role / headline"><input className={inputClass} value={payload.title} onChange={(e) => updatePayload("title", e.target.value)} /></Field>
              <Field label="Current firm"><input className={inputClass} value={payload.firmName} onChange={(e) => updatePayload("firmName", e.target.value)} /></Field>
              <Field label="Location"><input className={inputClass} value={payload.location} onChange={(e) => updatePayload("location", e.target.value)} /></Field>
              <Field label="Education"><input className={inputClass} value={payload.education} onChange={(e) => updatePayload("education", e.target.value)} /></Field>
              <SkillEditor skills={payload.skills} onChange={(skills) => setPayload((current) => ({ ...current, skills }))} />
              <div className="border border-white/[0.08] bg-bg-secondary sm:col-span-2">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
                  <div><p className="text-sm font-semibold text-text-primary">Current positions</p><p className="mt-0.5 text-xs text-text-muted">Keep concurrent roles separate so firm coverage stays accurate.</p></div>
                  <button type="button" onClick={addPosition} className="inline-flex min-h-11 items-center gap-2 border border-primary/40 px-3 text-sm font-bold text-accent-teal hover:bg-primary/10"><Plus className="h-4 w-4" />Add position</button>
                </div>
                {payload.positions.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-text-muted">No structured positions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-white/[0.08]">
                    {payload.positions.map((position, index) => (
                      <div key={index} className="grid gap-3 p-4 sm:grid-cols-2">
                        <Field label={`Position ${index + 1} title`}><input className={inputClass} value={position.title} onChange={(e) => updatePosition(index, { title: e.target.value })} placeholder="e.g. Junior Solutions Architect" /></Field>
                        <Field label="Organization"><input className={inputClass} value={position.firm} onChange={(e) => updatePosition(index, { firm: e.target.value })} placeholder="e.g. Red Hat" /></Field>
                        <Field label="Work type"><input className={inputClass} value={position.employmentType} onChange={(e) => updatePosition(index, { employmentType: e.target.value })} placeholder="Full-time, part-time, freelance" /></Field>
                        <div className="grid grid-cols-[1fr_44px] items-end gap-2">
                          <Field label="Started"><input className={inputClass} value={position.start} onChange={(e) => updatePosition(index, { start: e.target.value })} placeholder="e.g. Jun 2026" /></Field>
                          <button type="button" onClick={() => removePosition(index)} aria-label={`Remove position ${index + 1}`} className="min-h-11 min-w-11 border border-white/[0.12] text-text-muted hover:border-red-400/40 hover:text-red-300"><X className="mx-auto h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2"><Field label="Why this person is relevant"><textarea className={`${inputClass} min-h-24 py-3`} value={payload.whyRelevant} onChange={(e) => updatePayload("whyRelevant", e.target.value)} placeholder="Connection hypothesis, shared context, or recruiting value" /></Field></div>
              <div className="sm:col-span-2"><Field label="Private research notes"><textarea className={`${inputClass} min-h-28 py-3`} value={payload.notes} onChange={(e) => updatePayload("notes", e.target.value)} placeholder="Questions to ask, follow-up context, evidence caveats" /></Field></div>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">{missing.length ? `${missing.length} useful field${missing.length === 1 ? "" : "s"} still unknown` : "Core profile facts are complete"}</p>
              <button disabled={!canPreview || saving} onClick={() => void saveDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-sm font-bold text-white hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Preview changes<ArrowRight className="h-4 w-4" /></button>
            </div>
          </section>
        </div>

        <aside className="border-t border-white/[0.08] bg-bg-secondary p-4 sm:p-6 xl:border-l xl:border-t-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent-teal">Research brief</p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-text-primary">Stay on the signal</h2>
          <div className="mt-5 space-y-4">
            {["Open only the profile or search you chose.", "Record facts you can point back to.", "Treat missing information as unknown.", "Review every field before it joins your network."].map((item) => <div key={item} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><p className="text-sm leading-5 text-text-secondary">{item}</p></div>)}
          </div>
          <div className="mt-6 border border-white/[0.08] bg-card p-4">
            <p className="text-sm font-semibold text-text-primary">What KithNode does not do</p>
            <p className="mt-2 text-sm leading-5 text-text-muted">No page reading, scrolling, crawling, messaging, connecting, or automatic enrichment. The companion is a private notebook and handoff—not a LinkedIn bot.</p>
          </div>
        </aside>
      </main>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div className="max-h-[92vh] w-full overflow-y-auto border border-white/[0.12] bg-bg-secondary sm:max-w-2xl">
            <div className="border-b border-white/[0.08] p-5"><p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent-teal">Final approval</p><h2 id="preview-title" className="mt-1 font-heading text-xl font-semibold text-text-primary">Choose what enters your network</h2><p className="mt-1 text-sm text-text-secondary">Unchecked fields remain unchanged. This action is recorded with its source.</p></div>
            <div className="divide-y divide-white/[0.08]">
              {RESEARCH_FIELDS.map((field) => (
                <label key={field} className="grid min-h-16 cursor-pointer grid-cols-[28px_140px_1fr] items-center gap-3 px-5 hover:bg-white/[0.03]">
                  <input type="checkbox" checked={selected.includes(field)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, field] : current.filter((item) => item !== field))} className="h-4 w-4 accent-sky-500" />
                  <span className="text-sm font-semibold text-text-secondary">{fieldLabels[field]}</span>
                  <span className="truncate text-sm text-text-primary">{previewValue(field) || <span className="text-text-muted">Unknown</span>}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] p-4 sm:flex-row sm:justify-end">
              <button onClick={() => setPreviewOpen(false)} className="min-h-11 border border-white/[0.12] px-4 text-sm font-bold text-text-secondary hover:bg-white/[0.04]">Keep as draft</button>
              <button disabled={!selected.length || committing} onClick={() => void commitDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-sm font-bold text-white hover:bg-primary/80 disabled:opacity-40">{committing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Approve selected fields<ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
