"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilePenLine, FileText, IdCard, Mail, MessageSquareText, Plus, ScrollText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EmptyWorkspace, RecordTable, SearchField, WorkspaceContent } from "@/components/product-workspace";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type DocumentRecord = {
  id: string;
  legacyId?: string;
  type: string;
  title: string;
  status: string;
  variantType?: string;
  updatedAt: string;
  metadata?: { score?: number; contactId?: string };
  content?: Record<string, unknown>;
};

const tabs = [
  ["all", "All"],
  ["resume", "Resumes"],
  ["linkedin", "LinkedIn"],
  ["essay", "Essays"],
  ["cover_letter", "Cover letters"],
  ["outreach", "Outreach"],
  ["meeting_brief", "Meeting briefs"],
] as const;

const icons: Record<string, typeof FileText> = {
  resume: FileText,
  linkedin: IdCard,
  essay: ScrollText,
  cover_letter: Mail,
  outreach: MessageSquareText,
  meeting_brief: FilePenLine,
};

function documentHref(document: DocumentRecord) {
  const id = document.legacyId || document.id.split(":").at(-1) || document.id;
  if (document.type === "resume") return "/dashboard/resume";
  if (document.type === "linkedin") return `/dashboard/linkedin?profileId=${id}`;
  if (document.type === "outreach" && document.metadata?.contactId) return `/contact/${document.metadata.contactId}`;
  return `/dashboard/documents?documentId=${document.id}`;
}

export function DocumentsWorkspace() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/documents");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Documents are temporarily unavailable.");
      setDocuments(body.documents || []);
      setWarning(body.warning || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Documents are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => (type === "all" || document.type === type) && (!needle || document.title.toLowerCase().includes(needle)));
  }, [documents, query, type]);

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const documentType = String(form.get("type") || "essay");
    if (documentType === "resume") {
      window.location.assign("/dashboard/resume");
      return;
    }
    if (documentType === "linkedin") {
      window.location.assign("/dashboard/linkedin");
      return;
    }
    setSaving(true);
    const response = await apiFetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: documentType,
        title: String(form.get("title") || "Untitled document"),
        status: "draft",
        variantType: String(form.get("variantType") || ""),
        content: { body: "" },
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.message || body.error || "KithNode could not create this document.");
      return;
    }
    setCreateOpen(false);
    setSelected(body.document);
    await load();
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.id.includes(":")) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await apiFetch(`/api/documents/${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        status: form.get("status"),
        variantType: form.get("variantType"),
        content: { ...(selected.content || {}), body: String(form.get("body") || "") },
        changeSummary: "Edited in Documents",
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.message || body.error || "KithNode could not save this revision.");
      return;
    }
    setSelected(body.document);
    await load();
  }

  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader
        eyebrow="Career materials"
        title="Documents"
        description="Your resumes, LinkedIn copies, essays, cover letters, outreach, and meeting briefs—with evidence and version history."
        actions={<button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"><Plus className="mr-2 h-4 w-4" />New document</button>}
      />
      <WorkspaceContent className="space-y-4">
        <div className="rounded-xl border border-border bg-white p-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search documents" label="Search documents" />
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setType(value)} className={`min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium ${type === value ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-soft"}`}>{label}</button>)}
          </div>
        </div>
        {warning ? <div className="rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-text-secondary">{warning}</div> : null}
        {loading ? <WorkspaceLoading label="Loading documents" /> : error ? <WorkspaceError message={error} onRetry={load} /> : !documents.length ? (
          <EmptyWorkspace
            icon={<FileText className="h-5 w-5" />}
            title="Create your evidence-backed library"
            description="Start with a resume or LinkedIn profile. KithNode will keep variants, source evidence, linked applications, and approved changes together."
            action={<Link href="/dashboard/resume" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Create a resume</Link>}
            secondary={<Link href="/dashboard/linkedin" className="inline-flex min-h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-primary">Import LinkedIn</Link>}
          />
        ) : (
          <RecordTable>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-surface-soft"><tr>{["Document", "Type", "Variant", "Status", "Last edited", "Agent action"].map((label) => <th key={label} className="border-b border-border px-4 py-3 text-xs font-medium text-text-secondary">{label}</th>)}</tr></thead>
              <tbody>{visible.map((document) => {
                const Icon = icons[document.type] || FileText;
                return <tr key={document.id} className="border-b border-border-soft last:border-0 hover:bg-surface-soft/60">
                  <td className="px-4 py-3.5">{document.id.includes(":") || ["resume", "linkedin", "outreach"].includes(document.type) ? <Link href={documentHref(document)} className="flex items-center gap-3 font-medium text-text-primary hover:text-primary"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-soft"><Icon className="h-4 w-4" /></span><span>{document.title}</span></Link> : <button type="button" onClick={() => setSelected(document)} className="flex items-center gap-3 text-left font-medium text-text-primary hover:text-primary"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-soft"><Icon className="h-4 w-4" /></span><span>{document.title}</span></button>}</td>
                  <td className="px-4 py-3.5 text-sm capitalize text-text-secondary">{document.type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3.5 text-sm capitalize text-text-secondary">{document.variantType || "General"}</td>
                  <td className="px-4 py-3.5"><StatusBadge tone={document.status === "current" ? "success" : "neutral"}>{document.status}</StatusBadge></td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(document.updatedAt))}</td>
                  <td className="px-4 py-3.5"><Link href={`/dashboard?skill=${document.type === "resume" ? "tailor-resume" : "draft-outreach"}&documentId=${encodeURIComponent(document.id)}`} className="text-sm font-medium text-primary hover:underline">{document.type === "resume" ? "Audit or tailor" : "Continue with Copilot"}</Link></td>
                </tr>;
              })}</tbody>
            </table>
            {!visible.length ? <div className="px-5 py-12 text-center text-sm text-text-secondary">No documents match this view.</div> : null}
          </RecordTable>
        )}
      </WorkspaceContent>
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full border-border bg-white sm:max-w-lg">
          <SheetHeader className="border-b border-border-soft px-6 py-5">
            <SheetTitle className="font-heading text-2xl">New document</SheetTitle>
            <SheetDescription>Create a material with version history and links to the rest of your recruiting work.</SheetDescription>
          </SheetHeader>
          <form onSubmit={createDocument} className="space-y-4 px-6 pb-8">
            <label className="block"><span className="text-xs font-medium text-text-secondary">Type</span><select name="type" defaultValue={type === "all" ? "essay" : type} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="resume">Resume</option><option value="linkedin">LinkedIn profile</option><option value="essay">Essay</option><option value="cover_letter">Cover letter</option><option value="outreach">Outreach</option><option value="meeting_brief">Meeting brief</option><option value="custom">Custom</option></select></label>
            <label className="block"><span className="text-xs font-medium text-text-secondary">Title</span><input name="title" required placeholder="Kenan-Flagler application essay" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-text-secondary">Variant for</span><select name="variantType" defaultValue="" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="">General</option><option value="job">Job</option><option value="internship">Internship</option><option value="club">Club</option><option value="school">School</option></select></label>
            <button disabled={saving} className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create document"}</button>
          </form>
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto border-border bg-white sm:max-w-2xl">
          {selected ? <>
            <SheetHeader className="border-b border-border-soft px-6 py-5">
              <SheetTitle className="font-heading text-2xl">{selected.title}</SheetTitle>
              <SheetDescription>Direct edits create a revision. Copilot proposals remain reviewable before they change this document.</SheetDescription>
            </SheetHeader>
            <form onSubmit={saveDocument} className="space-y-4 px-6 pb-8">
              <label className="block"><span className="text-xs font-medium text-text-secondary">Title</span><input name="title" defaultValue={selected.title} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="text-xs font-medium text-text-secondary">Status</span><select name="status" defaultValue={selected.status} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm"><option value="draft">Draft</option><option value="current">Current</option><option value="archived">Archived</option></select></label>
                <label><span className="text-xs font-medium text-text-secondary">Variant for</span><select name="variantType" defaultValue={selected.variantType || ""} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm"><option value="">General</option><option value="job">Job</option><option value="internship">Internship</option><option value="club">Club</option><option value="school">School</option></select></label>
              </div>
              <label className="block"><span className="text-xs font-medium text-text-secondary">Document</span><textarea name="body" defaultValue={typeof selected.content?.body === "string" ? selected.content.body : ""} rows={22} className="mt-1 w-full rounded-xl border border-border bg-white p-4 text-base leading-7 outline-none focus:border-primary" /></label>
              <div className="flex flex-wrap gap-2">
                <button disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save revision"}</button>
                <Link href={`/dashboard?documentId=${encodeURIComponent(selected.id)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium">Continue with Copilot</Link>
              </div>
            </form>
          </> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
