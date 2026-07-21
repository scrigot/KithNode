"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Columns3,
  FilePlus2,
  Plus,
  Save,
  Search,
  Sparkles,
  TableProperties,
  Undo2,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STATUSES,
  statusLabel,
  type OpportunityPriority,
  type OpportunityStatus,
} from "@/lib/opportunities";
import { MetricStrip, StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type OpportunityContact = {
  id: string;
  contactId: string;
  score: number;
  reason: string;
  contact?: { id: string; firstName?: string; lastName?: string; firmName?: string; title?: string; linkedinUrl?: string; tier?: string } | null;
};

type OpportunityEvent = { id: string; type: string; title: string; detail: string; createdAt: string };

type Opportunity = {
  id: string;
  company: string;
  role: string;
  location: string;
  workMode: string;
  jobUrl: string;
  applyUrl: string;
  description: string;
  source: string;
  sourceFreshAt: string | null;
  status: OpportunityStatus;
  priority: OpportunityPriority;
  season: string;
  notes: string;
  nextAction: string;
  nextActionDue: string | null;
  appliedAt: string | null;
  deadline: string | null;
  archivedAt: string | null;
  lastActivityAt: string;
  fitScore: number;
  networkScore: number;
  resumeId: string | null;
  contacts: OpportunityContact[];
  events: OpportunityEvent[];
  createdAt: string;
  updatedAt: string;
};

type View = "table" | "board";
type Filters = { q: string; status: string; priority: string; deadline: string; sort: string };

const ACTIVE_BOARD_STATUSES: OpportunityStatus[] = ["discovered", "saved", "preparing", "applied", "assessment", "interview", "offer"];
const TERMINAL = new Set<OpportunityStatus>(["accepted", "rejected", "withdrawn", "archived"]);
const inputClass = "min-h-11 w-full border border-white/[0.12] bg-bg-primary px-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-accent-teal";
const labelClass = "mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary";

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusTone(status: OpportunityStatus) {
  if (status === "offer" || status === "accepted") return "success" as const;
  if (status === "interview" || status === "assessment") return "warning" as const;
  if (status === "rejected" || status === "withdrawn") return "danger" as const;
  if (status === "preparing" || status === "applied") return "info" as const;
  return "neutral" as const;
}

function isoOrNull(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}

export function ApplicationsClient() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("table");
  const [filters, setFilters] = useState<Filters>({ q: "", status: "", priority: "", deadline: "", sort: "activity_desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<{ id: string; status: OpportunityStatus } | null>(null);

  const selected = items.find((item) => item.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    try {
      const response = await apiFetch(`/api/opportunities?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Applications are temporarily unavailable.");
      setItems(body.opportunities || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Applications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { const timer = globalThis.setTimeout(load, filters.q ? 250 : 0); return () => globalThis.clearTimeout(timer); }, [load, filters.q]);

  useEffect(() => {
    if (!items.length || typeof window === "undefined") return;
    const requestedId = new URLSearchParams(window.location.search).get("opportunity");
    if (requestedId && items.some((item) => item.id === requestedId)) setSelectedId(requestedId);
  }, [items]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const in14 = now + 14 * 86_400_000;
    const active = items.filter((item) => !TERMINAL.has(item.status)).length;
    const due = items.filter((item) => item.deadline && new Date(item.deadline).getTime() >= now && new Date(item.deadline).getTime() <= in14).length;
    const interviews = items.filter((item) => item.status === "interview").length;
    const offers = items.filter((item) => item.status === "offer" || item.status === "accepted").length;
    return [
      { label: "Active applications", value: active },
      { label: "Deadlines in 14 days", value: due },
      { label: "Interviews", value: interviews },
      { label: "Offers", value: offers, detail: active ? `${Math.round((offers / active) * 100)}% active` : "—" },
    ];
  }, [items]);

  async function updateOpportunity(id: string, patch: Record<string, unknown>, successMessage?: string) {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not update application.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...body.opportunity } : item));
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not update application.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function moveStatus(item: Opportunity, status: OpportunityStatus, offerUndo = true) {
    if (item.status === status) return;
    const previous = item.status;
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
    const ok = await updateOpportunity(item.id, { status }, `Moved ${item.company} to ${statusLabel(status)}.`);
    if (!ok) setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: previous } : row));
    else if (offerUndo) setUndo({ id: item.id, status: previous });
  }

  async function addApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await apiFetch("/api/opportunities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.get("company"), role: form.get("role"), location: form.get("location"),
          jobUrl: form.get("jobUrl"), deadline: isoOrNull(String(form.get("deadline") || "")),
          status: form.get("status"), priority: form.get("priority"), source: "manual",
          nextAction: form.get("nextAction"),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not add application.");
      setAddOpen(false);
      setNotice(`${body.opportunity.company} was added to Applications.`);
      await load();
      setSelectedId(body.opportunity.id);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not add application.");
    } finally { setSaving(false); }
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await updateOpportunity(selected.id, {
      status: form.get("status"), priority: form.get("priority"), season: form.get("season"),
      deadline: isoOrNull(String(form.get("deadline") || "")), nextAction: form.get("nextAction"),
      nextActionDue: isoOrNull(String(form.get("nextActionDue") || "")), notes: form.get("notes"),
      description: form.get("description"),
    }, "Application details saved.");
  }

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(`/api/opportunities/${selected.id}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "note", title: form.get("title"), detail: form.get("detail") }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, events: [body.event, ...(item.events || [])] } : item));
      event.currentTarget.reset();
      setNotice("Timeline note added.");
    } else setNotice(body.error || "Could not add timeline note.");
  }

  async function generateResume() {
    if (!selected) return;
    setSaving(true);
    const response = await apiFetch(`/api/opportunities/${selected.id}/resume`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (response.ok && body.href) window.location.href = body.href;
    else if (body.href) window.location.href = body.href;
    else setNotice(body.error || "Could not create a resume variant.");
  }

  async function archiveSelected() {
    if (!selected) return;
    const response = await apiFetch(`/api/opportunities/${selected.id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setNotice("Application archived. It remains available in archived records.");
    }
  }

  const staleCount = items.filter((item) => item.sourceFreshAt && Date.now() - new Date(item.sourceFreshAt).getTime() > 7 * 86_400_000).length;

  return (
    <div className="min-h-full bg-bg-primary">
      <WorkspaceHeader eyebrow="Recruiting pipeline" title="Applications" description="Track every role, deadline, relationship, and next action in one place." actions={<><button type="button" onClick={() => setView("table")} aria-pressed={view === "table"} className={`min-h-11 border px-3 ${view === "table" ? "border-accent-teal bg-accent-teal/10 text-accent-teal" : "border-white/[0.12] text-text-secondary"}`}><TableProperties className="mr-2 inline h-4 w-4" />Table</button><button type="button" onClick={() => setView("board")} aria-pressed={view === "board"} className={`min-h-11 border px-3 ${view === "board" ? "border-accent-teal bg-accent-teal/10 text-accent-teal" : "border-white/[0.12] text-text-secondary"}`}><Columns3 className="mr-2 inline h-4 w-4" />Board</button><button type="button" onClick={() => setAddOpen(true)} className="min-h-11 bg-accent-teal px-4 font-bold text-white hover:bg-sky-500"><Plus className="mr-2 inline h-4 w-4" />Add application</button></>} />
      <MetricStrip items={metrics} />

      {notice ? <div className="flex items-center justify-between border-b border-sky-400/20 bg-sky-400/[0.08] px-4 py-3 text-sm text-sky-200" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} className="min-h-11 px-3 font-bold">Dismiss</button></div> : null}
      {undo ? <div className="fixed bottom-20 right-4 z-40 flex items-center gap-3 border border-white/[0.14] bg-bg-secondary p-3 shadow-2xl lg:bottom-4"><span className="text-sm text-text-primary">Application moved</span><button type="button" onClick={() => { const item = items.find((row) => row.id === undo.id); if (item) void moveStatus(item, undo.status, false); setUndo(null); }} className="min-h-11 px-3 font-bold text-accent-teal"><Undo2 className="mr-2 inline h-4 w-4" />Undo</button></div> : null}

      <section className="border-b border-white/[0.08] bg-bg-secondary px-4 py-3 sm:px-6" aria-label="Application filters">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,auto))]">
          <label className="relative"><span className="sr-only">Search applications</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" /><input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search company, role, location" className={`${inputClass} pl-10`} /></label>
          <FilterSelect label="Status" allLabel="All statuses" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={OPPORTUNITY_STATUSES.map((status) => ({ value: status, label: statusLabel(status) }))} />
          <FilterSelect label="Priority" allLabel="All priorities" value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} options={OPPORTUNITY_PRIORITIES.map((priority) => ({ value: priority, label: statusLabel(priority) }))} />
          <FilterSelect label="Deadline" value={filters.deadline} onChange={(value) => setFilters((current) => ({ ...current, deadline: value }))} options={[{ value: "upcoming", label: "Next 14 days" }, { value: "overdue", label: "Overdue" }, { value: "none", label: "No deadline" }]} />
          <FilterSelect label="Sort" value={filters.sort} onChange={(value) => setFilters((current) => ({ ...current, sort: value }))} showAll={false} options={[{ value: "activity_desc", label: "Recent activity" }, { value: "deadline_asc", label: "Deadline" }, { value: "fit_desc", label: "Best fit" }, { value: "company_asc", label: "Company" }]} />
        </div>
      </section>

      {staleCount ? <div className="border-b border-amber-400/20 bg-amber-400/[0.06] px-4 py-2 text-sm text-amber-200 sm:px-6">{staleCount} saved listing{staleCount === 1 ? " is" : "s are"} more than seven days old. Open the official listing before applying.</div> : null}
      {loading ? <WorkspaceLoading label="Loading applications" /> : error ? <WorkspaceError message={error} onRetry={load} /> : items.length === 0 ? <EmptyApplications onAdd={() => setAddOpen(true)} /> : view === "board" ? <ApplicationBoard items={items} onOpen={setSelectedId} onMove={moveStatus} /> : <ApplicationTable items={items} onOpen={setSelectedId} onStatus={moveStatus} />}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto border-white/[0.1] bg-bg-secondary sm:max-w-xl">
          <SheetHeader className="border-b border-white/[0.08] px-5 py-5"><SheetTitle className="text-xl">Add application</SheetTitle><SheetDescription>Save the role now; KithNode will keep the next action visible.</SheetDescription></SheetHeader>
          <form onSubmit={addApplication} className="space-y-4 px-5 pb-8">
            <Field label="Company" name="company" required /><Field label="Role" name="role" required /><Field label="Location" name="location" />
            <Field label="Official listing URL" name="jobUrl" type="url" placeholder="Optional" /><Field label="Deadline" name="deadline" type="date" />
            <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Status" name="status" defaultValue="saved" options={OPPORTUNITY_STATUSES} /><SelectField label="Priority" name="priority" defaultValue="medium" options={OPPORTUNITY_PRIORITIES} /></div>
            <Field label="Next action" name="nextAction" placeholder="Ask Alex for an introduction" />
            <button disabled={saving} className="min-h-11 w-full bg-accent-teal px-4 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Add to Applications"}</button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto border-white/[0.1] bg-bg-secondary sm:max-w-2xl">
          {selected ? <>
            <SheetHeader className="border-b border-white/[0.08] px-5 py-5 pr-14"><SheetTitle className="text-xl">{selected.role}</SheetTitle><SheetDescription>{selected.company}{selected.location ? ` · ${selected.location}` : ""}</SheetDescription></SheetHeader>
            <div className="flex flex-wrap gap-2 px-5"><StatusBadge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</StatusBadge><StatusBadge>{statusLabel(selected.priority)} priority</StatusBadge>{selected.fitScore ? <StatusBadge tone="info">{selected.fitScore}% fit</StatusBadge> : null}{selected.networkScore ? <StatusBadge tone="success">{selected.networkScore}% network</StatusBadge> : null}</div>
            <div className="flex flex-wrap gap-2 px-5"><ExternalListing opportunity={selected} /><button type="button" disabled={saving} onClick={generateResume} className="min-h-11 border border-sky-400/30 bg-sky-400/10 px-3 font-bold text-sky-200"><FilePlus2 className="mr-2 inline h-4 w-4" />Create resume variant</button></div>
            <form onSubmit={saveDetails} className="space-y-4 border-y border-white/[0.08] px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Status" name="status" defaultValue={selected.status} options={OPPORTUNITY_STATUSES} /><SelectField label="Priority" name="priority" defaultValue={selected.priority} options={OPPORTUNITY_PRIORITIES} /></div>
              <div className="grid gap-3 sm:grid-cols-3"><Field label="Season" name="season" defaultValue={selected.season} /><Field label="Deadline" name="deadline" type="date" defaultValue={dateInput(selected.deadline)} /><Field label="Next action due" name="nextActionDue" type="date" defaultValue={dateInput(selected.nextActionDue)} /></div>
              <Field label="Next action" name="nextAction" defaultValue={selected.nextAction} />
              <TextArea label="Notes" name="notes" defaultValue={selected.notes} rows={4} /><TextArea label="Job description" name="description" defaultValue={selected.description} rows={7} />
              <button disabled={saving} className="min-h-11 bg-accent-teal px-4 font-bold text-white"><Save className="mr-2 inline h-4 w-4" />Save details</button>
            </form>
            <section className="px-5"><h3 className="font-heading text-lg font-semibold text-text-primary">Connected people</h3>{selected.contacts?.length ? <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.08]">{selected.contacts.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-base font-semibold text-text-primary">{[link.contact?.firstName, link.contact?.lastName].filter(Boolean).join(" ") || "Saved contact"}</p><p className="text-sm text-text-secondary">{link.contact?.title || link.reason}</p></div><span className="font-mono text-sm text-emerald-300">{link.score}</span></div>)}</div> : <p className="mt-2 text-base text-text-secondary">No contacts attached yet. Use Network or Copilot to find a warm path at this firm.</p>}</section>
            <section className="px-5 pb-5"><h3 className="font-heading text-lg font-semibold text-text-primary">Activity</h3><form onSubmit={addEvent} className="mt-3 space-y-2"><Field label="Timeline note" name="title" required placeholder="Interview scheduled" /><TextArea label="Detail" name="detail" rows={2} /><button className="min-h-11 border border-white/[0.14] px-3 font-bold text-text-primary">Add note</button></form><div className="mt-4 border-l border-white/[0.12] pl-4">{selected.events?.length ? selected.events.map((event) => <div key={event.id} className="relative pb-4 before:absolute before:-left-[21px] before:top-1.5 before:h-2 before:w-2 before:bg-accent-teal"><p className="text-base font-semibold text-text-primary">{event.title}</p><p className="text-sm text-text-secondary">{event.detail}</p><p className="mt-1 font-mono text-[11px] text-text-muted">{displayDate(event.createdAt)}</p></div>) : <p className="text-base text-text-secondary">No activity recorded yet.</p>}</div></section>
            <div className="border-t border-white/[0.08] px-5 py-5"><button type="button" onClick={archiveSelected} className="min-h-11 border border-red-400/30 px-3 font-bold text-red-300"><Archive className="mr-2 inline h-4 w-4" />Archive application</button></div>
          </> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({ label, allLabel, value, onChange, options, showAll = true }: { label: string; allLabel?: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; showAll?: boolean }) {
  return <label><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{showAll ? <option value="">{allLabel || `All ${label.toLowerCase()}s`}</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label><span className={labelClass}>{label}</span><input {...props} className={inputClass} /></label>;
}

function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label><span className={labelClass}>{label}</span><textarea {...props} className={`${inputClass} py-3`} /></label>;
}

function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: readonly string[] }) {
  return <label><span className={labelClass}>{label}</span><select {...props} className={inputClass}>{options.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label>;
}

function ExternalListing({ opportunity }: { opportunity: Opportunity }) {
  const href = opportunity.applyUrl || opportunity.jobUrl;
  if (!href?.startsWith("http")) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center border border-white/[0.14] px-3 font-bold text-text-primary hover:bg-white/[0.05]">Open official listing<ArrowUpRight className="ml-2 h-4 w-4" /></a>;
}

function EmptyApplications({ onAdd }: { onAdd: () => void }) {
  return <div className="mx-auto flex min-h-[430px] max-w-2xl items-center px-5"><div className="w-full border-y border-white/[0.1] py-10 text-left"><BriefcaseBusiness className="h-8 w-8 text-accent-teal" /><h2 className="mt-4 font-heading text-2xl font-semibold text-text-primary">Start your recruiting pipeline</h2><p className="mt-2 max-w-xl text-base leading-6 text-text-secondary">Add a role you are considering or ask Career Copilot to find five evidence-backed matches. Every saved role will appear here with its deadline, contacts, resume, and next action.</p><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={onAdd} className="min-h-11 bg-accent-teal px-4 font-bold text-white"><Plus className="mr-2 inline h-4 w-4" />Add application</button><Link href="/dashboard/assistant?skill=find-jobs" className="inline-flex min-h-11 items-center border border-white/[0.14] px-4 font-bold text-text-primary"><Sparkles className="mr-2 h-4 w-4 text-accent-teal" />Find matching jobs</Link></div></div></div>;
}

function ApplicationTable({ items, onOpen, onStatus }: { items: Opportunity[]; onOpen: (id: string) => void; onStatus: (item: Opportunity, status: OpportunityStatus) => void }) {
  return <div className="p-3 sm:p-5"><div className="hidden overflow-x-auto border border-white/[0.08] md:block"><table className="w-full min-w-[1050px] border-collapse text-left"><thead className="bg-bg-secondary"><tr>{["Company / role", "Status", "Priority", "Deadline", "Fit / network", "Resume", "Next action", "Contacts", "Updated"].map((label) => <th key={label} className="border-b border-white/[0.08] px-3 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer border-b border-white/[0.06] hover:bg-white/[0.025]"><td className="px-3 py-3"><p className="text-base font-semibold text-text-primary">{item.company}</p><p className="text-sm text-text-secondary">{item.role}{item.location ? ` · ${item.location}` : ""}</p></td><td className="px-3 py-3" onClick={(event) => event.stopPropagation()}><select aria-label={`Status for ${item.company}`} value={item.status} onChange={(event) => void onStatus(item, event.target.value as OpportunityStatus)} className="min-h-11 border border-white/[0.1] bg-bg-primary px-2 text-sm text-text-primary">{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td><td className="px-3 py-3"><StatusBadge>{item.priority}</StatusBadge></td><td className="px-3 py-3 font-mono text-sm text-text-secondary">{displayDate(item.deadline)}</td><td className="px-3 py-3 font-mono text-sm"><span className="text-sky-300">{item.fitScore || "—"}</span><span className="text-text-muted"> / </span><span className="text-emerald-300">{item.networkScore || "—"}</span></td><td className="px-3 py-3 text-sm text-text-secondary">{item.resumeId ? "Attached" : "—"}</td><td className="max-w-[220px] px-3 py-3 text-sm text-text-secondary"><span className="line-clamp-2">{item.nextAction || "Add next action"}</span></td><td className="px-3 py-3 font-mono text-sm text-text-secondary">{item.contacts?.length || 0}</td><td className="px-3 py-3 font-mono text-[12px] text-text-muted">{displayDate(item.lastActivityAt)}</td></tr>)}</tbody></table></div><div className="space-y-2 md:hidden">{items.map((item) => <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="w-full border border-white/[0.08] bg-card p-4 text-left"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-semibold text-text-primary">{item.company}</p><p className="text-sm text-text-secondary">{item.role}</p></div><StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm text-text-secondary"><span><CalendarClock className="mr-1 inline h-4 w-4" />{displayDate(item.deadline)}</span><span><Users className="mr-1 inline h-4 w-4" />{item.contacts?.length || 0} contacts</span></div>{item.nextAction ? <p className="mt-3 border-t border-white/[0.08] pt-3 text-sm text-text-primary">Next: {item.nextAction}</p> : null}</button>)}</div></div>;
}

function ApplicationBoard({ items, onOpen, onMove }: { items: Opportunity[]; onOpen: (id: string) => void; onMove: (item: Opportunity, status: OpportunityStatus) => void }) {
  return <div className="p-3 sm:p-5">
    <div className="space-y-5 md:hidden">{ACTIVE_BOARD_STATUSES.map((status) => { const rows = items.filter((item) => item.status === status); if (!rows.length) return null; return <section key={status} aria-label={`${statusLabel(status)} applications`}><header className="mb-2 flex items-center justify-between border-b border-white/[0.08] pb-2"><h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">{statusLabel(status)}</h2><span className="font-mono text-sm text-text-muted">{rows.length}</span></header><div className="space-y-2">{rows.map((item) => <article key={item.id} className="border border-white/[0.08] bg-card p-4"><button type="button" onClick={() => onOpen(item.id)} className="min-h-11 w-full text-left"><p className="text-base font-semibold text-text-primary">{item.company}</p><p className="mt-1 text-sm text-text-secondary">{item.role}</p></button><div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3"><label><span className={labelClass}>Stage</span><select aria-label={`Status for ${item.company}`} value={item.status} onChange={(event) => void onMove(item, event.target.value as OpportunityStatus)} className={inputClass}>{OPPORTUNITY_STATUSES.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label><span className="pb-3 font-mono text-[11px] text-text-muted">{displayDate(item.deadline)}</span></div>{item.nextAction ? <p className="mt-3 border-t border-white/[0.08] pt-3 text-sm text-text-primary">Next: {item.nextAction}</p> : null}</article>)}</div></section>; })}</div>
    <div className="hidden overflow-x-auto md:block"><div className="grid min-w-[1400px] grid-cols-7 gap-2">{ACTIVE_BOARD_STATUSES.map((status) => { const rows = items.filter((item) => item.status === status); return <section key={status} aria-label={`${statusLabel(status)} applications`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const item = items.find((row) => row.id === event.dataTransfer.getData("text/opportunity-id")); if (item) void onMove(item, status); }} className="min-h-[480px] border border-white/[0.08] bg-bg-secondary"><header className="flex items-center justify-between border-b border-white/[0.08] px-3 py-3"><h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">{statusLabel(status)}</h2><span className="font-mono text-sm text-text-muted">{rows.length}</span></header><div className="space-y-2 p-2">{rows.map((item) => <button key={item.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/opportunity-id", item.id)} onClick={() => onOpen(item.id)} className="w-full cursor-grab border border-white/[0.08] bg-card p-3 text-left hover:border-accent-teal/40"><p className="text-base font-semibold text-text-primary">{item.company}</p><p className="mt-1 text-sm text-text-secondary">{item.role}</p><div className="mt-3 flex items-center justify-between font-mono text-[11px] text-text-muted"><span>{displayDate(item.deadline)}</span><span>{item.fitScore ? `${item.fitScore}% fit` : "Unscored"}</span></div>{item.nextAction ? <p className="mt-3 border-t border-white/[0.08] pt-2 text-sm text-text-primary">{item.nextAction}</p> : null}</button>)}</div></section>; })}</div></div>
  </div>;
}
