"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Coffee, Loader2, Search, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Contact {
  id: string;
  name: string;
  title?: string;
  company?: { name?: string };
  score?: { tier?: string; total_score?: number };
  pipeline_stage?: string;
}

export default function CoffeePrepPicker() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/contacts")
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data.error || "Could not load contacts");
        setContacts(Array.isArray(data) ? data : []);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load contacts"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const company = contact.company?.name || "";
      return (!tier || contact.score?.tier === tier) && (!needle || `${contact.name} ${contact.title || ""} ${company}`.toLowerCase().includes(needle));
    }).slice(0, 300);
  }, [contacts, query, tier]);

  return (
    <div className="mx-auto max-w-5xl p-5">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-primary"><Coffee size={19} /><h1 className="text-lg font-bold">Coffee Prep</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">Choose someone from your main KithNode network and build a grounded one-screen meeting brief.</p>
      </header>

      <section className="border border-white/[0.08] bg-card p-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="flex items-center gap-2 border border-white/[0.1] bg-background px-3"><Search size={14} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, or title…" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
          <select value={tier} onChange={(event) => setTier(event.target.value)} className="h-10 border border-white/[0.1] bg-background px-3 text-sm outline-none"><option value="">All relationships</option><option value="kith">Kith</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="monitor">Monitor</option><option value="cold">Cold</option></select>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Users size={13} />{filtered.length} shown · {contacts.length} accessible contacts</p>
      </section>

      {loading && <div className="mt-4 flex items-center gap-2 border border-white/[0.08] bg-card p-6 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" />Loading your network…</div>}
      {error && <div className="mt-4 border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">{error}</div>}
      {!loading && !error && filtered.length === 0 && <div className="mt-4 border border-dashed border-white/[0.12] bg-card p-10 text-center"><p className="text-sm">No matching contacts.</p><p className="mt-1 text-xs text-muted-foreground">Clear the filters or import contacts first.</p></div>}
      <div className="mt-4 divide-y divide-white/[0.06] border border-white/[0.08] bg-card">
        {filtered.map((contact) => (
          <Link key={contact.id} href={`/dashboard/coffee-prep/${contact.id}`} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.03]">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{contact.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{[contact.title, contact.company?.name].filter(Boolean).join(" · ") || "No role recorded"}</p><div className="mt-2 flex gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">{contact.score?.tier && <span className="border border-white/10 px-1.5 py-0.5">{contact.score.tier}</span>}{contact.pipeline_stage && <span className="border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-primary">{contact.pipeline_stage}</span>}</div></div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">Prepare <ArrowRight size={13} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
