"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Pencil, Plus, UserRound, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  countPeopleViews,
  PEOPLE_VIEW_COPY,
  personMatchesView,
  type PeopleView,
  sortPeopleForView,
} from "@/lib/people-views";
import { EmptyWorkspace, QuietButton, RecordTable, SearchField, WorkspaceContent } from "@/components/product-workspace";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Person = {
  id: string;
  name: string;
  title: string;
  linkedin_location: string;
  relationship_class?: string;
  relationship_state?: "verified" | "potential" | "none" | "unavailable";
  relationship_type?: string;
  relationship_evidence?: string[];
  relationship_confidence?: number;
  dormant?: boolean;
  needs_info?: boolean;
  company?: { name?: string };
  score?: { fit_score?: number; engagement_score?: number; tier?: string };
  notes?: string;
};

export function PeopleWorkspace() {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<PeopleView>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/contacts?curated=true");
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.error || "People are temporarily unavailable.");
      setPeople(Array.isArray(body) ? body : body.contacts || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "People are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = people.filter((person) => {
      if (!personMatchesView(person, view)) return false;
      if (!needle) return true;
      return [person.name, person.title, person.company?.name, person.linkedin_location].some((value) => value?.toLowerCase().includes(needle));
    });
    return sortPeopleForView(matches, view);
  }, [people, query, view]);
  const viewCounts = useMemo(() => countPeopleViews(people), [people]);

  async function openPerson(person: Person) {
    setEditing(person);
    const response = await apiFetch(`/api/contacts/${encodeURIComponent(person.id)}`);
    const body = await response.json().catch(() => ({}));
    if (response.ok) setEditing((current) => current?.id === person.id ? { ...current, ...body } : current);
  }

  async function savePerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await apiFetch(`/api/contacts/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        firmName: form.get("firmName"),
        location: form.get("location"),
        notes: form.get("notes"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "KithNode could not save this person.");
      return;
    }
    setEditing(null);
    await load();
  }

  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader
        eyebrow="Relationship CRM"
        title="People"
        description="Understand who you know, why each relationship matters, and the next thoughtful step."
        actions={
          <Link href="/dashboard/contacts" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">
            <Plus className="mr-2 h-4 w-4" /> Add person
          </Link>
        }
      />
      <WorkspaceContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center">
          <SearchField value={query} onChange={setQuery} placeholder="Search name, organization, role, or location" label="Search people" />
          <div className="flex gap-1 rounded-lg bg-surface-soft p-1">
            {(Object.keys(PEOPLE_VIEW_COPY) as PeopleView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                aria-label={`${PEOPLE_VIEW_COPY[option].label}, ${viewCounts[option]} people`}
                className={`min-h-9 rounded-md px-3 text-sm font-medium ${view === option ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"}`}
              >
                {PEOPLE_VIEW_COPY[option].label}
                <span className="ml-1.5 text-xs tabular-nums text-text-muted">
                  {viewCounts[option]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <p className="text-sm text-text-secondary">
            {PEOPLE_VIEW_COPY[view].description}
          </p>
          <p className="text-xs tabular-nums text-text-muted">
            Showing {visible.length} of {viewCounts[view]}
          </p>
        </div>
        {selectedIds.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3">
            <p className="text-sm font-medium text-text-primary">{selectedIds.length} selected</p>
            <div className="flex gap-2">
              <Link href={`/dashboard?people=${encodeURIComponent(selectedIds.join(","))}`} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Ask Copilot about them</Link>
              <QuietButton onClick={() => setSelectedIds([])}>Clear</QuietButton>
            </div>
          </div>
        ) : null}
        {loading ? (
          <WorkspaceLoading label="Loading people" />
        ) : error ? (
          <WorkspaceError message={error} onRetry={load} />
        ) : people.length === 0 ? (
          <EmptyWorkspace
            icon={<Users className="h-5 w-5" />}
            title="Build your relationship map"
            description="Import your network or add a person. KithNode will keep verified facts, relationship context, and next actions together."
            action={<Link href="/dashboard/settings/data" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Import people</Link>}
            secondary={<QuietButton onClick={() => window.location.assign("/dashboard/contacts")}>Add manually</QuietButton>}
          />
        ) : (
          <RecordTable>
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="bg-surface-soft">
                <tr>
                  <th className="w-12 border-b border-border px-4 py-3"><input type="checkbox" aria-label="Select visible people" checked={visible.length > 0 && visible.every((person) => selectedIds.includes(person.id))} onChange={(event) => setSelectedIds(event.target.checked ? visible.map((person) => person.id) : [])} className="h-4 w-4 rounded border-border" /></th>
                  {["Person", "Organization", "Relationship", "Fit", "Location", "What to do next", ""].map((label, index) => (
                    <th key={`${label}-${index}`} className="border-b border-border px-4 py-3 text-xs font-medium text-text-secondary">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((person) => (
                  <tr key={person.id} className="border-b border-border-soft last:border-0 hover:bg-surface-soft/60">
                    <td className="px-4 py-3.5"><input type="checkbox" aria-label={`Select ${person.name}`} checked={selectedIds.includes(person.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, person.id])] : current.filter((id) => id !== person.id))} className="h-4 w-4 rounded border-border" /></td>
                    <td className="px-4 py-3.5">
                      <Link href={`/contact/${person.id}`} className="font-medium text-text-primary hover:text-primary">{person.name}</Link>
                      <p className="mt-0.5 text-sm text-text-secondary">{person.title || "Role not captured"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary"><Building2 className="mr-2 inline h-4 w-4 text-text-muted" />{person.company?.name || "Unknown"}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge tone={person.relationship_state === "verified" ? "success" : "neutral"}>
                        {person.relationship_state === "verified" ? "Verified" : person.relationship_state === "potential" ? "Potential" : "No path"}
                      </StatusBadge>
                      {person.relationship_type ? <p className="mt-1 text-xs text-text-muted">{person.relationship_type}</p> : null}
                    </td>
                    <td className="px-4 py-3.5 text-sm tabular-nums text-text-secondary">{Math.round(person.score?.fit_score || 0)}%</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{person.linkedin_location || "—"}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {person.relationship_state === "verified" ? (
                        <Link href={`/dashboard/coffee-prep/${person.id}`} className="font-medium text-primary hover:underline">
                          {person.dormant ? "Reconnect thoughtfully" : "Prepare next conversation"}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => void openPerson(person)} className="font-medium text-primary hover:underline">
                          {person.needs_info ? "Add missing context" : "Verify relationship"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><button type="button" onClick={() => void openPerson(person)} aria-label={`Edit ${person.name}`} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-selected hover:text-text-primary"><Pencil className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length ? <div className="px-5 py-12 text-center text-sm text-text-secondary"><UserRound className="mx-auto mb-3 h-5 w-5" />No people match this view.</div> : null}
          </RecordTable>
        )}
      </WorkspaceContent>
      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto border-border bg-white sm:max-w-xl">
          {editing ? <>
            <SheetHeader className="border-b border-border-soft px-6 py-5">
              <SheetTitle className="font-heading text-2xl">{editing.name}</SheetTitle>
              <SheetDescription>Correct the facts KithNode uses for matching, relationship planning, and recommendations.</SheetDescription>
            </SheetHeader>
            <form onSubmit={savePerson} className="space-y-4 px-6 pb-8">
              <label className="block"><span className="text-xs font-medium text-text-secondary">Role</span><input name="title" defaultValue={editing.title} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium text-text-secondary">Organization</span><input name="firmName" defaultValue={editing.company?.name} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium text-text-secondary">Location</span><input name="location" defaultValue={editing.linkedin_location} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium text-text-secondary">Private relationship notes</span><textarea name="notes" defaultValue={editing.notes || ""} rows={7} className="mt-1 w-full rounded-xl border border-border p-3 text-sm leading-6" /></label>
              <div className="rounded-xl bg-surface-soft p-4 text-sm leading-6 text-text-secondary">
                Saving updates this user-owned record, recalculates its score, and records the corrected facts. It does not contact the person.
              </div>
              <button disabled={saving} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save corrections"}</button>
            </form>
          </> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
