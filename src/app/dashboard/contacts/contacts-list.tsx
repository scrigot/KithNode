"use client";

import { useEffect, useState } from "react";
import { WarmSignalCard } from "./warm-signal-card";
import { FilterBar, type SortOption } from "./filter-bar";
import { OutreachSheet } from "./outreach-sheet";
import { trackEvent } from "@/lib/posthog";
import type { RankedContact } from "@/lib/api";

export function ContactsList() {
  const [contacts, setContacts] = useState<RankedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState("all");
  const [sort, setSort] = useState<SortOption>("score");
  const [outreachTarget, setOutreachTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/contacts?curated=true")
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
      <div className="border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
        Failed to load contacts: {error}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <p className="text-sm font-bold text-foreground">NO SIGNALS</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Run the seed pipeline to populate contacts.
        </p>
        <code className="mt-2 block text-[10px] text-muted-foreground">
          cd backend && python scripts/seed_pipeline.py --seed-only
        </code>
      </div>
    );
  }

  return (
    <div>
      <OutreachSheet
        contactId={outreachTarget?.id ?? null}
        contactName={outreachTarget?.name ?? ""}
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
              setOutreachTarget({ id, name: contact.name });
            }}
            onAddToPipeline={async (id) => {
              await fetch(`/api/pipeline/${id}`, { method: "POST" });
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
