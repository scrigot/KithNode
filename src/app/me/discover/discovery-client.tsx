"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOpenContact } from "@/components/me/open-contact";

export interface DiscoverySearchView {
  label: string;
  query: string;
  googleUrl: string;
  linkedInUrl: string;
}

export interface DiscoveryLeadView {
  id: string;
  status: string;
  name: string;
  firmName: string;
  title: string;
  linkedInUrl: string;
  email: string;
  location: string;
  education: string;
  industry: string;
  notes: string;
  sourceQuery: string;
  sourceUrl: string;
  score: number;
  reasons: string[];
  savedContactId: string;
  savedContactName: string;
}

export interface DiscoveryPipelineView {
  id: string;
  name: string;
}

interface LeadForm {
  name: string;
  title: string;
  firmName: string;
  linkedInUrl: string;
  location: string;
  education: string;
  industry: string;
  email: string;
  sourceQuery: string;
  sourceUrl: string;
  notes: string;
}

const EMPTY_FORM: LeadForm = {
  name: "",
  title: "",
  firmName: "",
  linkedInUrl: "",
  location: "",
  education: "",
  industry: "",
  email: "",
  sourceQuery: "",
  sourceUrl: "",
  notes: "",
};

const INDUSTRIES = [
  "",
  "AI Consulting",
  "AI Engineering",
  "Data Engineering",
  "Data Analytics",
  "Data Science",
  "Data Services",
  "ML Infrastructure",
  "LLM / RAG",
  "AI Product / Ops",
  "Enterprise AI",
  "Cloud / DevOps",
  "Cybersecurity",
  "Startup / Founder",
  "Venture / Ecosystem",
  "Consulting",
  "Other",
];

export default function DiscoveryClient({
  searches,
  leads,
  pipelines,
}: {
  searches: DiscoverySearchView[];
  leads: DiscoveryLeadView[];
  pipelines: DiscoveryPipelineView[];
}) {
  const router = useRouter();
  const openContact = useOpenContact();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pipelineByLead, setPipelineByLead] = useState<Record<string, string>>({});
  const saved = useMemo(() => leads.filter((l) => l.status === "saved").length, [leads]);

  function setField<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submitLead() {
    setError("");
    start(async () => {
      const res = await fetch("/api/me/discover/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create lead.");
        return;
      }
      setForm(EMPTY_FORM);
      router.refresh();
    });
  }

  function dismissLead(id: string) {
    setError("");
    start(async () => {
      const res = await fetch(`/api/me/discover/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) setError("Could not dismiss lead.");
      router.refresh();
    });
  }

  function saveLead(id: string) {
    setError("");
    start(async () => {
      const res = await fetch(`/api/me/discover/leads/${id}/save-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineId: pipelineByLead[id] || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save lead.");
        return;
      }
      const contactId = data.contact?.id;
      router.refresh();
      if (typeof contactId === "string") openContact(contactId);
    });
  }

  return (
    <div className="mt-7 grid gap-5 min-[1120px]:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-xl border border-[#7FB069]/30 bg-[#7FB069]/[0.06] p-4">
          <h2 className="text-[14px] font-semibold text-white">Split-window workflow</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#B7AFA7]">
            Collapse the sidebar with the top-left arrow, keep KithNode beside LinkedIn, and use the extension
            clipper when it is loaded. The app does not embed LinkedIn because that path is brittle.
          </p>
        </div>

        <details open className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Search prompts</h2>
                <p className="mt-1 text-[12px] text-[#8A8077]">
                  Open a search, inspect profiles in the browser, then capture promising people below.
                </p>
              </div>
              <span className="text-[12px] text-[#6F665E]">collapse</span>
            </div>
          </summary>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-[#38332F] px-2 py-1 text-[11px] text-[#8A8077]">
              {leads.length} active / {saved} saved
            </span>
            <Link href="/me/settings" className="text-[12px] text-[#E8643C] hover:text-white">
              tune profile
            </Link>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {searches.map((search) => (
              <div key={search.label} className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-3">
                <div className="text-[13px] font-medium text-white">{search.label}</div>
                <p className="mt-2 min-h-12 text-[12px] leading-5 text-[#B7AFA7]">{search.query}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={search.googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#E8643C]/40 px-2.5 py-1.5 text-[12px] text-[#E8643C] hover:bg-[#E8643C]/10"
                  >
                    Open Google
                  </a>
                  <a
                    href={search.linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]"
                  >
                    Open LinkedIn
                  </a>
                  <button
                    type="button"
                    onClick={() => setField("sourceQuery", search.query)}
                    className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#8A8077] hover:text-white"
                  >
                    Use query
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
          <h2 className="text-[15px] font-semibold text-white">Capture a person</h2>
          <div className="mt-1 text-[12px] text-[#8A8077]">
            Paste manually, or use the Chrome extension to auto-fill from the active LinkedIn profile.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TextInput label="Name" value={form.name} onChange={(v) => setField("name", v)} placeholder="Jason Achterberg" />
            <TextInput label="LinkedIn URL" value={form.linkedInUrl} onChange={(v) => setField("linkedInUrl", v)} placeholder="https://linkedin.com/in/..." />
            <TextInput label="Title" value={form.title} onChange={(v) => setField("title", v)} placeholder="AI engineering lead" />
            <TextInput label="Company" value={form.firmName} onChange={(v) => setField("firmName", v)} placeholder="Comfort / Databricks / ..." />
            <TextInput label="Location" value={form.location} onChange={(v) => setField("location", v)} placeholder="Raleigh, New York, remote" />
            <label>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">Industry</span>
              <select
                value={form.industry}
                onChange={(e) => setField("industry", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#38332F] bg-[#1C1A19] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry || "Select industry..."}</option>
                ))}
              </select>
            </label>
            <TextInput label="Education" value={form.education} onChange={(v) => setField("education", v)} placeholder="UNC, business school, ..." />
            <TextInput label="Email" value={form.email} onChange={(v) => setField("email", v)} placeholder="optional" />
            <TextInput label="Source query" value={form.sourceQuery} onChange={(v) => setField("sourceQuery", v)} placeholder="paste the search that found them" />
            <TextInput label="Source URL" value={form.sourceUrl} onChange={(v) => setField("sourceUrl", v)} placeholder="search result or profile URL" />
            <label className="md:col-span-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="mt-1.5 min-h-24 w-full rounded-lg border border-[#38332F] bg-[#1C1A19] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
                placeholder="Why this person is a useful AI expert or mentor."
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={submitLead}
              disabled={pending}
              className="rounded-lg bg-[#E8643C] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {pending ? "Saving..." : "Add candidate"}
            </button>
            {error && <span className="text-[12px] text-[#E8643C]">{error}</span>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#38332F] bg-[#232020] p-5 min-[1120px]:sticky min-[1120px]:top-5 min-[1120px]:max-h-[calc(100vh-40px)] min-[1120px]:overflow-y-auto">
        <h2 className="text-[15px] font-semibold text-white">Candidate list</h2>
        <p className="mt-1 text-[12px] text-[#8A8077]">
          Ranked for AI consulting, AI engineering, data services, and mentor value.
        </p>

        <div className="mt-4 space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#38332F] p-6 text-center text-[13px] text-[#8A8077]">
              No discovery candidates yet.
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[14px] font-medium text-white">{lead.name}</h3>
                      <span className="rounded-full bg-[#E8643C]/10 px-2 py-0.5 text-[11px] text-[#E8643C]">
                        {lead.score}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-[#B7AFA7]">
                      {[lead.title, lead.firmName, lead.location].filter(Boolean).join(" · ") || "Profile details pending"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#38332F] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#8A8077]">
                    {lead.status}
                  </span>
                </div>

                {lead.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lead.reasons.map((reason) => (
                      <span key={reason} className="rounded-full border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB]">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
                {lead.notes && <p className="mt-3 text-[12px] leading-5 text-[#9C948C]">{lead.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {lead.linkedInUrl && (
                    <a href={lead.linkedInUrl} target="_blank" rel="noreferrer" className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]">
                      LinkedIn
                    </a>
                  )}
                  {lead.savedContactId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openContact(lead.savedContactId)}
                        className="rounded-md border border-[#E8643C]/40 px-2.5 py-1.5 text-[12px] text-[#E8643C] hover:bg-[#E8643C]/10"
                      >
                        Open contact
                      </button>
                      <button
                        type="button"
                        onClick={() => openContact(lead.savedContactId, "memory")}
                        className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]"
                      >
                        Memory
                      </button>
                      <button
                        type="button"
                        onClick={() => openContact(lead.savedContactId, "actions")}
                        className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]"
                      >
                        Draft
                      </button>
                      <Link
                        href={`/me/prep/${lead.savedContactId}`}
                        className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]"
                      >
                        Prep
                      </Link>
                    </>
                  ) : (
                    <>
                      <select
                        value={pipelineByLead[lead.id] || ""}
                        onChange={(e) => setPipelineByLead((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                        className="rounded-md border border-[#38332F] bg-[#232020] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] outline-none"
                      >
                        <option value="">No pipeline</option>
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => saveLead(lead.id)}
                        disabled={pending}
                        className="rounded-md bg-[#E8643C] px-2.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                      >
                        Save contact
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissLead(lead.id)}
                    disabled={pending}
                    className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#8A8077] hover:text-white disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-[#38332F] bg-[#1C1A19] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
      />
    </label>
  );
}
