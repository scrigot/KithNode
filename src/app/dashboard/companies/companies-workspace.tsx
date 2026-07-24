"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  EmptyWorkspace,
  FieldLabel,
  QuietButton,
  RecordTable,
  SearchField,
  WorkspaceContent,
} from "@/components/product-workspace";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";

type Organization = {
  id: string;
  name: string;
  type: string;
  industry: string;
  location: string;
  peopleCount: number;
  currentPeopleCount: number;
  applicationCount: number;
  activeApplicationCount: number;
};

const ORGANIZATION_PAGE_SIZE = 50;

export function CompaniesWorkspace() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("company");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(ORGANIZATION_PAGE_SIZE);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/organizations?type=${encodeURIComponent(type)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Companies are temporarily unavailable.");
      setOrganizations(body.organizations || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Companies are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [type]);

  const matchingOrganizations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? organizations.filter((organization) => [organization.name, organization.industry, organization.location].some((value) => value?.toLowerCase().includes(needle)))
      : organizations;
  }, [organizations, query]);
  const visible = useMemo(
    () => matchingOrganizations.slice(0, visibleLimit),
    [matchingOrganizations, visibleLimit],
  );

  useEffect(() => {
    setVisibleLimit(ORGANIZATION_PAGE_SIZE);
  }, [query, type]);

  async function addOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await apiFetch("/api/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        type: form.get("type"),
        industry: form.get("industry"),
        website: form.get("website"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "KithNode could not add this organization.");
      return;
    }
    setAdding(false);
    await load();
  }

  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader
        eyebrow="Organization CRM"
        title="Companies"
        description="See employer coverage, active applications, and where your network needs another relationship."
        actions={<button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"><Plus className="mr-2 h-4 w-4" />Add organization</button>}
      />
      <WorkspaceContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row">
          <SearchField value={query} onChange={setQuery} placeholder="Search organization, industry, or location" label="Search organizations" />
          <select value={type} onChange={(event) => setType(event.target.value)} className="min-h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary">
            <option value="company">Companies</option>
            <option value="school">Schools</option>
            <option value="club">Clubs</option>
            <option value="fund">Funds</option>
            <option value="nonprofit">Nonprofits</option>
            <option value="program">Programs</option>
            <option value="other">Other</option>
          </select>
        </div>
        {!loading && !error && organizations.length ? (
          <p className="px-1 text-right text-xs tabular-nums text-text-muted">
            Showing {visible.length} of {matchingOrganizations.length}
          </p>
        ) : null}
        {adding ? (
          <form onSubmit={addOrganization} className="grid gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label><FieldLabel>Name</FieldLabel><input name="name" required className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" /></label>
            <label><FieldLabel>Type</FieldLabel><select name="type" defaultValue={type} className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="company">Company</option><option value="school">School</option><option value="club">Club</option><option value="fund">Fund</option><option value="nonprofit">Nonprofit</option><option value="program">Program</option><option value="other">Other</option></select></label>
            <label><FieldLabel>Industry</FieldLabel><input name="industry" className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" /></label>
            <label><FieldLabel>Website</FieldLabel><input name="website" type="url" placeholder="https://" className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" /></label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button disabled={saving} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">{saving ? "Saving…" : "Save organization"}</button><QuietButton onClick={() => setAdding(false)}>Cancel</QuietButton></div>
          </form>
        ) : null}
        {loading ? <WorkspaceLoading label="Loading companies" /> : error ? <WorkspaceError message={error} onRetry={load} /> : !organizations.length ? (
          <EmptyWorkspace
            icon={<Building2 className="h-5 w-5" />}
            title="Create your organization map"
            description="Organizations are matched automatically from your people and applications. Add one manually to start planning coverage now."
            action={<button type="button" onClick={() => setAdding(true)} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">Add organization</button>}
          />
        ) : (
          <RecordTable>
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-surface-soft"><tr>{["Organization", "Type", "People", "Active applications", "Coverage", "Next move"].map((label) => <th key={label} className="border-b border-border px-4 py-3 text-xs font-medium text-text-secondary">{label}</th>)}</tr></thead>
              <tbody>{visible.map((organization) => {
                const gap = organization.peopleCount === 0 ? "No contacts" : organization.currentPeopleCount === 0 ? "No current contact" : organization.peopleCount < 3 ? "Thin coverage" : "Established";
                return <tr key={organization.id} className="border-b border-border-soft last:border-0 hover:bg-surface-soft/60">
                  <td className="px-4 py-3.5"><p className="font-medium text-text-primary">{organization.name}</p><p className="text-sm text-text-secondary">{organization.industry || organization.location || "No firm context yet"}</p></td>
                  <td className="px-4 py-3.5"><StatusBadge>{organization.type}</StatusBadge></td>
                  <td className="px-4 py-3.5 text-sm tabular-nums text-text-secondary"><Users className="mr-2 inline h-4 w-4 text-text-muted" />{organization.peopleCount}</td>
                  <td className="px-4 py-3.5 text-sm tabular-nums text-text-secondary">{organization.activeApplicationCount}</td>
                  <td className="px-4 py-3.5"><StatusBadge tone={gap === "Established" ? "success" : gap === "Thin coverage" ? "warning" : "danger"}>{gap}</StatusBadge></td>
                  <td className="px-4 py-3.5"><a href={`/dashboard?skill=firm-coverage&company=${encodeURIComponent(organization.name)}`} className="text-sm font-medium text-primary hover:underline">{organization.peopleCount ? "Find the next relationship" : "Discover people"}</a></td>
                </tr>;
              })}</tbody>
            </table>
            {!visible.length ? <div className="px-5 py-12 text-center text-sm text-text-secondary">No organizations match this search.</div> : null}
            {visible.length < matchingOrganizations.length ? (
              <div className="flex items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
                <p className="text-sm text-text-secondary">
                  {matchingOrganizations.length - visible.length} more organizations match this view.
                </p>
                <QuietButton onClick={() => setVisibleLimit((current) => current + ORGANIZATION_PAGE_SIZE)}>
                  Show 50 more
                </QuietButton>
              </div>
            ) : null}
          </RecordTable>
        )}
      </WorkspaceContent>
    </div>
  );
}
