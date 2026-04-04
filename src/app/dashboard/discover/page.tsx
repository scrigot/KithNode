"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/posthog";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const SCORE_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-green-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIERS = ["HOT", "WARM", "MONITOR", "COLD"] as const;

interface Contact {
  id: number;
  name: string;
  title: string;
  firmName: string;
  email: string;
  linkedInUrl: string;
  education: string;
  location: string;
  warmthScore: number;
  tier: string;
  affiliations: string;
  source: string;
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [activeTier, setActiveTier] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasAnyContacts, setHasAnyContacts] = useState(true);
  const [addingToPipeline, setAddingToPipeline] = useState<number | null>(null);
  const [pipelineAdded, setPipelineAdded] = useState<Set<number>>(new Set());

  const search = useCallback(async (q: string, tier: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tier) params.set("tier", tier.toLowerCase());
    const qs = params.toString();

    try {
      const res = await fetch(`/api/discover${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);

      // If no query and no tier and no results, there are no contacts at all
      if (!q && !tier && (data.contacts || []).length === 0) {
        setHasAnyContacts(false);
      } else {
        setHasAnyContacts(true);
      }
    } catch {
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(query, activeTier);
  }, [search, activeTier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, activeTier);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeTier, search]);

  const handleAddToPipeline = async (contactId: number) => {
    setAddingToPipeline(contactId);
    try {
      const res = await fetch(`/api/pipeline/${contactId}`, {
        method: "POST",
      });
      if (res.ok) {
        setPipelineAdded((prev) => new Set(prev).add(contactId));
        trackEvent("discover_add_pipeline", { contact_id: contactId });
      }
    } catch {
      // silently fail
    } finally {
      setAddingToPipeline(null);
    }
  };

  // Empty state: no contacts imported at all
  if (!loading && !hasAnyContacts) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-sm border border-white/[0.06] bg-card p-10 text-center">
          <svg
            className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
            />
          </svg>
          <p className="text-lg font-semibold text-foreground">No Network Yet</p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Import your LinkedIn network to start discovering connections.
          </p>
          <a
            href="/dashboard/import"
            className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/80"
          >
            GO TO IMPORT
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col p-6">
      {/* Header */}
      <div className="mb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          DISCOVER
        </h2>
        <p className="text-[10px] text-muted-foreground">
          SEARCH YOUR IMPORTED NETWORK
        </p>
      </div>
      <div className="mb-4 h-px bg-border" />

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, title, education, location..."
          className="w-full border border-input bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTier("")}
          className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            !activeTier
              ? "border-primary bg-primary/20 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          ALL
        </button>
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTier(activeTier === t.toLowerCase() ? "" : t.toLowerCase())}
            className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              activeTier === t.toLowerCase()
                ? "border-primary bg-primary/20 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
        {total > 0 && (
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {total} result{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
        </div>
      )}

      {/* No results */}
      {!loading && contacts.length === 0 && hasAnyContacts && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No contacts match your search.
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && contacts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => {
            const affiliationList = c.affiliations
              ? c.affiliations.split(",").filter(Boolean)
              : [];
            const tierKey = (c.tier || "cold").toLowerCase();

            return (
              <div
                key={c.id}
                className="flex flex-col border border-border bg-card p-4"
              >
                {/* Top row: name + score */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {c.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {c.title}
                      {c.title && c.firmName ? " @ " : ""}
                      {c.firmName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-bold tabular-nums ${SCORE_STYLES[tierKey] || "text-zinc-400"}`}
                    >
                      {Math.round(c.warmthScore || 0)}
                    </span>
                  </div>
                </div>

                {/* Tier badge */}
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={`text-[8px] font-bold ${TIER_STYLES[tierKey] || TIER_STYLES.cold}`}
                  >
                    {(c.tier || "COLD").toUpperCase()}
                  </Badge>
                </div>

                {/* Details */}
                <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                  {c.education && <p>{c.education}</p>}
                  {c.location && <p>{c.location}</p>}
                  {c.email && <p>{c.email}</p>}
                </div>

                {/* Affiliations */}
                {affiliationList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {affiliationList.map((a) => (
                      <Badge
                        key={a}
                        variant="outline"
                        className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30"
                      >
                        {a.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-3">
                  {c.linkedInUrl ? (
                    <a
                      href={c.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 border border-border bg-muted py-1.5 text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      VIEW PROFILE
                    </a>
                  ) : (
                    <a
                      href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(c.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 border border-border bg-muted py-1.5 text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      SEARCH PROFILE
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`flex-1 text-[10px] font-bold ${
                      pipelineAdded.has(c.id)
                        ? "border-green-500/30 text-green-400"
                        : "border-primary/30 text-primary hover:bg-primary/20"
                    }`}
                    disabled={
                      addingToPipeline === c.id || pipelineAdded.has(c.id)
                    }
                    onClick={() => handleAddToPipeline(c.id)}
                  >
                    {pipelineAdded.has(c.id)
                      ? "ADDED"
                      : addingToPipeline === c.id
                        ? "..."
                        : "+ PIPELINE"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
