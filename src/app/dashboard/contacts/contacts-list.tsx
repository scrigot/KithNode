"use client";

import { useEffect, useState } from "react";
import { WarmSignalCard } from "./warm-signal-card";
import { FilterBar, type SortOption } from "./filter-bar";
import { OutreachSheet } from "./outreach-sheet";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import { Users } from "lucide-react";
import type { RankedContact } from "@/lib/api";
import Link from "next/link";
import { Upload } from "lucide-react";

export function ContactsList() {
  const [contacts, setContacts] = useState<RankedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState("all");
  const [sort, setSort] = useState<SortOption>("score");
  const [outreachTarget, setOutreachTarget] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [pipelineAdded, setPipelineAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch("/api/contacts?curated=true")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setContacts(data);
        setLoading(false);
        trackEvent("dashboard_loaded", { contact_count: data.length });
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter
  const filtered = contacts.filter((c) => {
    if (activeTier !== "all" && c.score.tier !== activeTier) return false;
    if (search) {
      const q = search.toLowerCase();
      const searchable = [
        c.name,
        c.title,
        c.company.name,
        c.company.location,
        ...c.company.industry_tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "score":
        return b.score.total_score - a.score.total_score;
      case "name":
        return a.name.localeCompare(b.name);
      case "company":
        return a.company.name.localeCompare(b.company.name);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-accent-amber/20 bg-accent-amber/5 p-6 text-center">
        <p className="text-sm font-medium text-accent-amber">Unable to load contacts</p>
        <p className="mt-1 text-[12px] text-text-secondary">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="mt-3 border border-white/[0.12] px-3 py-1.5 text-[12px] text-white hover:bg-white/[0.06]">Retry</button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="border border-white/[0.06] bg-bg-card p-10 text-center">
        <Users className="mx-auto mb-3 text-accent-teal" size={32} strokeWidth={1.5} />
        <p className="text-sm font-semibold text-white">No contacts yet</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Import your LinkedIn network or discover alumni to get started.
        </p>
        <Link
          href="/dashboard/import"
          className="mt-4 inline-flex items-center gap-2 bg-accent-teal px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-teal/80"
        >
          <Upload size={16} />
          Import Contacts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <OutreachSheet
        contactId={outreachTarget?.id ?? null}
        contactName={outreachTarget?.name ?? ""}
        contactEmail={outreachTarget?.email}
        open={outreachTarget !== null}
        onClose={() => setOutreachTarget(null)}
        onStatusChange={(contactId, status) => {
          // Could update local state to show status on cards
          trackEvent("outreach_status_changed", {
            contact_id: contactId,
            status,
          });
        }}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeTier={activeTier}
        onTierChange={setActiveTier}
        sort={sort}
        onSortChange={setSort}
        resultCount={sorted.length}
      />

      <div className="mt-4 space-y-1">
        {sorted.map((contact) => (
          <WarmSignalCard
            key={contact.id}
            contact={contact}
            onDraftOutreach={(id) => {
              setOutreachTarget({ id, name: contact.name, email: contact.email });
            }}
            pipelineAdded={pipelineAdded.has(contact.id)}
            onAddToPipeline={async (id) => {
              const res = await apiFetch(`/api/pipeline/${id}`, { method: "POST" });
              if (res.ok) {
                setPipelineAdded((prev) => new Set(prev).add(String(id)));
              }
              trackEvent("pipeline_added", {
                contact_id: id,
                name: contact.name,
              });
            }}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="mt-4 border border-border bg-card p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No contacts match your filters.
          </p>
        </div>
      )}
    </div>
  );
}
