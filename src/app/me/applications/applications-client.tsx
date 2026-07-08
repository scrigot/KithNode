"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import OpenContact from "@/components/me/open-contact";

export interface ApplicationContactView {
  id: string;
  name: string;
  firmName: string;
  title: string;
  linkedInUrl: string;
}

export interface ApplicationEventView {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
}

export interface ApplicationView {
  id: string;
  company: string;
  role: string;
  location: string;
  season: string;
  jobUrl: string;
  source: string;
  deadline: string;
  status: string;
  priority: string;
  resumeId: string;
  resumeTitle: string;
  jobDescription: string;
  notes: string;
  nextAction: string;
  nextActionDue: string;
  appliedAt: string;
  archived: boolean;
  updatedAt: string;
  contacts: ApplicationContactView[];
  events: ApplicationEventView[];
}

export interface ResumeOption {
  id: string;
  title: string;
  track: string;
  score: number;
  content: unknown;
}

const STATUSES = [
  "interested",
  "applying",
  "applied",
  "assessment",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
];
const PRIORITIES = ["low", "medium", "high"];

const statusStyle: Record<string, string> = {
  interested: "border-[#38332F] text-[#C9C2BB]",
  applying: "border-[#E8A23C]/40 text-[#F0C170]",
  applied: "border-[#6EA8C7]/40 text-[#9DD2EA]",
  assessment: "border-[#6EA8C7]/40 text-[#9DD2EA]",
  interview: "border-[#E8643C]/50 text-[#FF9B78]",
  offer: "border-[#7FB069]/50 text-[#A9D19A]",
  accepted: "border-[#7FB069]/50 text-[#A9D19A]",
  rejected: "border-[#6F665E] text-[#8A8077]",
  withdrawn: "border-[#6F665E] text-[#8A8077]",
};

const dateOnly = (iso: string) => (iso ? iso.slice(0, 10) : "");
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-";
const inputCls = "rounded-md border border-[#38332F] bg-[#1C1A19] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#E8643C]";

function normalizeCompany(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((token) => token && !["inc", "incorporated", "llc", "ltd", "co", "company", "corp", "corporation", "the"].includes(token))
    .join(" ");
}

function companyMatch(company: string, firm: string) {
  const a = normalizeCompany(company);
  const b = normalizeCompany(firm);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

export default function ApplicationsClient({
  applications,
  resumes,
  contacts,
  total,
}: {
  applications: ApplicationView[];
  resumes: ResumeOption[];
  contacts: ApplicationContactView[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ApplicationView | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<ApplicationView>>>({});
  const [tailor, setTailor] = useState<{ loading: boolean; result: TailorResult | null }>({ loading: false, result: null });
  const [form, setForm] = useState({ company: "", role: "", jobUrl: "", deadline: "", season: "" });

  const metrics = useMemo(() => ({
    openActions: applications.filter((app) => app.nextAction).length,
    upcoming: applications.filter((app) => app.deadline && new Date(app.deadline).getTime() <= Date.now() + 14 * 86_400_000).length,
    interviews: applications.filter((app) => app.status === "interview").length,
    offers: applications.filter((app) => app.status === "offer" || app.status === "accepted").length,
  }), [applications]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname);
  }

  function patchDraft(id: string, key: keyof ApplicationView, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  function valueOf(app: ApplicationView, key: keyof ApplicationView) {
    return String(drafts[app.id]?.[key] ?? app[key] ?? "");
  }

  function refresh() {
    router.refresh();
  }

  function createApplication() {
    setError("");
    start(async () => {
      const res = await fetch("/api/me/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create application.");
        return;
      }
      setForm({ company: "", role: "", jobUrl: "", deadline: "", season: "" });
      refresh();
    });
  }

  function updateApplication(id: string, patch: Record<string, unknown>) {
    setError("");
    start(async () => {
      const res = await fetch(`/api/me/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update application.");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refresh();
    });
  }

  function deleteApplication(id: string) {
    if (!window.confirm("Delete this application?")) return;
    start(async () => {
      const res = await fetch(`/api/me/applications/${id}`, { method: "DELETE" });
      if (!res.ok) setError("Could not delete application.");
      setSelected(null);
      refresh();
    });
  }

  function attachContact(appId: string, contactId: string) {
    start(async () => {
      const res = await fetch(`/api/me/applications/${appId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("Could not attach contact.");
        return;
      }
      const contact = data.link?.contact || contacts.find((item) => item.id === contactId);
      if (contact) {
        const nextContact: ApplicationContactView = {
          id: contact.id,
          name: contact.name,
          firmName: contact.firmName || "",
          title: contact.title || "",
          linkedInUrl: contact.linkedInUrl || "",
        };
        setSelected((prev) => {
          if (!prev || prev.id !== appId || prev.contacts.some((item) => item.id === nextContact.id)) return prev;
          return { ...prev, contacts: [...prev.contacts, nextContact] };
        });
      }
      refresh();
    });
  }

  function detachContact(appId: string, contactId: string) {
    start(async () => {
      const res = await fetch(`/api/me/applications/${appId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        setError("Could not remove contact.");
        return;
      }
      setSelected((prev) => prev && prev.id === appId ? { ...prev, contacts: prev.contacts.filter((contact) => contact.id !== contactId) } : prev);
      refresh();
    });
  }

  async function runTailor(app: ApplicationView) {
    const resume = resumes.find((r) => r.id === app.resumeId);
    if (!resume || !app.jobDescription.trim()) return;
    setTailor({ loading: true, result: null });
    const res = await fetch("/api/me/resume/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: resume.content, track: resume.track, jobDescription: app.jobDescription }),
    });
    setTailor({ loading: false, result: res.ok ? await res.json() : null });
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Open next actions" value={metrics.openActions} hot={metrics.openActions > 0} />
        <Metric label="Due in 14d" value={metrics.upcoming} hot={metrics.upcoming > 0} />
        <Metric label="Interviews" value={metrics.interviews} />
        <Metric label="Offers" value={metrics.offers} hot={metrics.offers > 0} />
      </div>

      <div className="rounded-xl border border-[#38332F] bg-[#232020] p-4">
        <div className="grid gap-2 lg:grid-cols-[1.1fr_1.2fr_1.3fr_140px_120px_auto]">
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className={inputCls} />
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role" className={inputCls} />
          <input value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} placeholder="Job URL" className={inputCls} />
          <input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} type="date" className={inputCls} />
          <input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="Season" className={inputCls} />
          <button onClick={createApplication} disabled={pending || !form.company.trim() || !form.role.trim()} className="rounded-md bg-[#E8643C] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#E8643C]">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input defaultValue={params.get("q") || ""} onBlur={(e) => setParam("q", e.target.value)} placeholder="Search company, role, notes..." className={`${inputCls} min-w-[240px]`} />
        <input defaultValue={params.get("company") || ""} onBlur={(e) => setParam("company", e.target.value)} placeholder="Company filter" className={`${inputCls} min-w-[160px]`} />
        <FilterSelect label="Any status" value={params.get("status") || ""} values={STATUSES} onChange={(v) => setParam("status", v)} />
        <FilterSelect label="Any priority" value={params.get("priority") || ""} values={PRIORITIES} onChange={(v) => setParam("priority", v)} />
        <select value={params.get("deadline") || ""} onChange={(e) => setParam("deadline", e.target.value)} className={inputCls}>
          <option value="">Any deadline</option>
          <option value="upcoming">Due in 14d</option>
          <option value="overdue">Overdue</option>
          <option value="none">No deadline</option>
        </select>
        <select value={params.get("actions") || ""} onChange={(e) => setParam("actions", e.target.value)} className={inputCls}>
          <option value="">Any next action</option>
          <option value="open">Open next action</option>
        </select>
        <select value={params.get("resumeId") || ""} onChange={(e) => setParam("resumeId", e.target.value)} className={inputCls}>
          <option value="">Any resume</option>
          {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
        </select>
        <select value={params.get("sort") || ""} onChange={(e) => setParam("sort", e.target.value)} className={inputCls}>
          <option value="">Deadline ↑</option>
          <option value="deadline_desc">Deadline ↓</option>
          <option value="updated_desc">Recently updated</option>
          <option value="company_asc">Company A-Z</option>
          <option value="status_asc">Status A-Z</option>
        </select>
        <span className="ml-auto text-[12px] text-[#8A8077]">{total} match{total === 1 ? "" : "es"}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#38332F]">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full text-left text-[12px]">
            <thead className="bg-[#232020] text-[#8A8077] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2 font-medium">Company / role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Resume</th>
                <th className="px-3 py-2 font-medium">Next action</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Contacts</th>
                <th className="px-3 py-2 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[#8A8077]">No applications yet.</td></tr>
              ) : applications.map((app) => (
                <tr key={app.id} className="border-t border-[#2E2A27] bg-[#1C1A19] align-top hover:bg-[#232020]">
                  <td className="px-3 py-2">
                    <button onClick={() => { setSelected(app); setTailor({ loading: false, result: null }); }} className="text-left font-medium text-white hover:text-[#E8643C]">{app.company}</button>
                    <p className="mt-0.5 text-[#B7AFA7]">{app.role}</p>
                    <p className="mt-0.5 text-[#6F665E]">{[app.location, app.season].filter(Boolean).join(" · ") || "-"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <select value={app.status} onChange={(e) => updateApplication(app.id, { status: e.target.value })} className={`${inputCls} ${statusStyle[app.status] || ""}`}>
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select value={app.priority} onChange={(e) => updateApplication(app.id, { priority: e.target.value })} className={inputCls}>
                      {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={valueOf(app, "deadline").slice(0, 10)} onChange={(e) => patchDraft(app.id, "deadline", e.target.value)} onBlur={(e) => updateApplication(app.id, { deadline: e.target.value })} type="date" className={inputCls} />
                  </td>
                  <td className="px-3 py-2">
                    <select value={app.resumeId} onChange={(e) => updateApplication(app.id, { resumeId: e.target.value })} className={`${inputCls} max-w-[180px]`}>
                      <option value="">No resume</option>
                      {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={valueOf(app, "nextAction")} onChange={(e) => patchDraft(app.id, "nextAction", e.target.value)} onBlur={(e) => updateApplication(app.id, { nextAction: e.target.value })} className={`${inputCls} w-[220px]`} placeholder="Follow up, finish essay..." />
                  </td>
                  <td className="px-3 py-2">
                    <input value={valueOf(app, "nextActionDue").slice(0, 10)} onChange={(e) => patchDraft(app.id, "nextActionDue", e.target.value)} onBlur={(e) => updateApplication(app.id, { nextActionDue: e.target.value })} type="date" className={inputCls} />
                  </td>
                  <td className="px-3 py-2 text-[#B7AFA7]">{app.contacts.length}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {app.jobUrl && <a href={app.jobUrl} target="_blank" rel="noreferrer" className="text-[#E8643C] hover:text-white">Job</a>}
                      <button onClick={() => { setSelected(app); setTailor({ loading: false, result: null }); }} className="text-[#C9C2BB] hover:text-white">Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ApplicationModal
          app={selected}
          resumes={resumes}
          contacts={contacts}
          pending={pending}
          tailor={tailor}
          onClose={() => setSelected(null)}
          onPatch={(patch) => updateApplication(selected.id, patch)}
          onDelete={() => deleteApplication(selected.id)}
          onAttach={(contactId) => attachContact(selected.id, contactId)}
          onDetach={(contactId) => detachContact(selected.id, contactId)}
          onTailor={() => runTailor(selected)}
        />
      )}
    </div>
  );
}

interface TailorResult {
  before: number;
  after: number;
  gain: number;
  rewrites: { before: string; after: string; ok: boolean; reason?: string }[];
  missingEvidence: string[];
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{label}</option>
      {values.map((value) => <option key={value} value={value}>{value}</option>)}
    </select>
  );
}

function Metric({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${hot ? "border-[#E8643C]/40 bg-[#E8643C]/[0.06]" : "border-[#38332F] bg-[#232020]"}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ApplicationModal({
  app,
  resumes,
  contacts,
  pending,
  tailor,
  onClose,
  onPatch,
  onDelete,
  onAttach,
  onDetach,
  onTailor,
}: {
  app: ApplicationView;
  resumes: ResumeOption[];
  contacts: ApplicationContactView[];
  pending: boolean;
  tailor: { loading: boolean; result: TailorResult | null };
  onClose: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onAttach: (contactId: string) => void;
  onDetach: (contactId: string) => void;
  onTailor: () => void;
}) {
  const [local, setLocal] = useState(app);
  const [contactQuery, setContactQuery] = useState("");
  const attached = new Set(app.contacts.map((c) => c.id));
  const suggested = contacts.filter((contact) => !attached.has(contact.id) && companyMatch(app.company, contact.firmName)).slice(0, 8);
  const contactMatches = contacts
    .filter((contact) => !attached.has(contact.id))
    .filter((contact) => {
      const q = contactQuery.trim().toLowerCase();
      if (!q) return false;
      return [contact.name, contact.title, contact.firmName].some((value) => value.toLowerCase().includes(q));
    })
    .slice(0, 8);
  const selectedResume = resumes.find((resume) => resume.id === local.resumeId);

  function patchLocal<K extends keyof ApplicationView>(key: K, value: ApplicationView[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function saveLargeFields() {
    onPatch({
      company: local.company,
      role: local.role,
      location: local.location,
      season: local.season,
      jobUrl: local.jobUrl,
      source: local.source,
      jobDescription: local.jobDescription,
      notes: local.notes,
      appliedAt: local.appliedAt,
      archived: local.archived,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#38332F] bg-[#1F1C1B] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-[#38332F] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">{app.company}</h2>
            <p className="text-[13px] text-[#9C948C]">{app.role}</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none text-[#8A8077] hover:text-white">x</button>
        </header>
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company" value={local.company} onChange={(v) => patchLocal("company", v)} />
                <Field label="Role" value={local.role} onChange={(v) => patchLocal("role", v)} />
                <Field label="Location" value={local.location} onChange={(v) => patchLocal("location", v)} />
                <Field label="Season" value={local.season} onChange={(v) => patchLocal("season", v)} />
                <Field label="Job URL" value={local.jobUrl} onChange={(v) => patchLocal("jobUrl", v)} />
                <Field label="Source" value={local.source} onChange={(v) => patchLocal("source", v)} />
                <label>
                  <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Applied date</span>
                  <input type="date" value={dateOnly(local.appliedAt)} onChange={(e) => patchLocal("appliedAt", e.target.value)} className={`mt-1 w-full ${inputCls}`} />
                </label>
                <label>
                  <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Resume</span>
                  <select value={local.resumeId} onChange={(e) => { patchLocal("resumeId", e.target.value); onPatch({ resumeId: e.target.value }); }} className={`mt-1 w-full ${inputCls}`}>
                    <option value="">No resume</option>
                    {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Job description</span>
                <textarea value={local.jobDescription} onChange={(e) => patchLocal("jobDescription", e.target.value)} rows={8} className={`mt-1 w-full resize-none ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Notes</span>
                <textarea value={local.notes} onChange={(e) => patchLocal("notes", e.target.value)} rows={4} className={`mt-1 w-full resize-none ${inputCls}`} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={saveLargeFields} disabled={pending} className="rounded-lg bg-[#E8643C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">Save details</button>
                <button onClick={onDelete} className="rounded-lg border border-[#38332F] px-4 py-2 text-[13px] text-[#8A8077] hover:border-[#E8643C] hover:text-[#E8643C]">Delete</button>
              </div>
            </section>

            <aside className="space-y-4">
              <Box title="Resume tailoring">
                <p className="text-[12px] text-[#8A8077]">{selectedResume ? selectedResume.title : "Select a saved resume first."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={onTailor} disabled={!selectedResume || !local.jobDescription.trim() || tailor.loading} className="rounded-lg border border-[#E8643C]/40 px-3 py-2 text-[12px] text-[#E8643C] hover:bg-[#E8643C]/10 disabled:opacity-50">
                    {tailor.loading ? "Tailoring..." : "Tailor resume"}
                  </button>
                  <Link href="/me/resume" className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">Open resume</Link>
                </div>
                {tailor.result && (
                  <div className="mt-3 rounded-lg border border-[#38332F] bg-[#161413] p-3">
                    <p className="text-[12px] text-white">Score {tailor.result.before}{" -> "}{tailor.result.after} ({tailor.result.gain >= 0 ? "+" : ""}{tailor.result.gain})</p>
                    {(tailor.result.rewrites || []).slice(0, 3).map((rewrite, i) => (
                      <p key={i} className="mt-2 text-[11px] leading-relaxed text-[#B7AFA7]">{rewrite.after}</p>
                    ))}
                  </div>
                )}
              </Box>

              <Box title="Attached contacts">
                {app.contacts.length === 0 ? <p className="text-[12px] text-[#8A8077]">No contacts attached yet.</p> : (
                  <div className="space-y-2">
                    {app.contacts.map((contact) => (
                      <div key={contact.id} className="rounded-lg border border-[#38332F] bg-[#161413] p-2">
                        <OpenContact id={contact.id} className="text-left text-[13px] font-medium text-white hover:text-[#E8643C]">{contact.name}</OpenContact>
                        <p className="text-[11px] text-[#8A8077]">{[contact.title, contact.firmName].filter(Boolean).join(" · ")}</p>
                        <button onClick={() => onDetach(contact.id)} className="mt-1 text-[11px] text-[#6F665E] hover:text-[#E8643C]">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </Box>

              <Box title="Suggested contacts">
                {suggested.length === 0 ? <p className="text-[12px] text-[#8A8077]">No company matches found.</p> : (
                  <div className="space-y-2">
                    {suggested.map((contact) => (
                      <button key={contact.id} onClick={() => onAttach(contact.id)} className="block w-full rounded-lg border border-[#38332F] bg-[#161413] p-2 text-left hover:border-[#E8643C]/60">
                        <span className="text-[13px] font-medium text-white">{contact.name}</span>
                        <span className="block text-[11px] text-[#8A8077]">{[contact.title, contact.firmName].filter(Boolean).join(" · ")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Box>

              <Box title="Attach any contact">
                <input
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Search name, title, firm..."
                  className={`w-full ${inputCls}`}
                />
                {contactQuery.trim() && contactMatches.length === 0 ? (
                  <p className="mt-2 text-[12px] text-[#8A8077]">No unattached contacts found.</p>
                ) : contactMatches.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {contactMatches.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          onAttach(contact.id);
                          setContactQuery("");
                        }}
                        className="block w-full rounded-lg border border-[#38332F] bg-[#161413] p-2 text-left hover:border-[#E8643C]/60"
                      >
                        <span className="text-[13px] font-medium text-white">{contact.name}</span>
                        <span className="block text-[11px] text-[#8A8077]">{[contact.title, contact.firmName].filter(Boolean).join(" · ") || "No firm/title"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-[#8A8077]">Search to attach a contact outside the company match.</p>
                )}
              </Box>

              <Box title="History">
                {app.events.length === 0 ? <p className="text-[12px] text-[#8A8077]">No events yet.</p> : (
                  <div className="space-y-2">
                    {app.events.map((event) => (
                      <div key={event.id} className="rounded-lg border border-[#38332F] bg-[#161413] p-2">
                        <p className="text-[12px] text-white">{event.title}</p>
                        <p className="text-[10px] text-[#6F665E]">{fmtDate(event.createdAt)} · {event.type}</p>
                        {event.detail && <p className="mt-1 text-[11px] text-[#B7AFA7]">{event.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Box>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
    </label>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#38332F] bg-[#232020] p-4">
      <h3 className="mb-3 text-[12px] uppercase tracking-[0.16em] text-[#8A8077]">{title}</h3>
      {children}
    </section>
  );
}
