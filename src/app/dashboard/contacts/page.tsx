"use client";

import { useState } from "react";
import { ContactsList } from "./contacts-list";
import { Sparkles } from "lucide-react";

export default function ContactsPage() {
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    enriched: number;
    total: number;
    skipped: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);

    try {
      const res = await fetch("/api/contacts/enrich", { method: "POST" });
      if (!res.ok) throw new Error("Enrichment failed");
      const data = await res.json();
      setEnrichResult(data);
      // Refresh contacts list
      setRefreshKey((k) => k + 1);
    } catch {
      setEnrichResult({ enriched: 0, total: 0, skipped: -1 });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            WARM SIGNALS
          </h2>
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="inline-flex items-center gap-1.5 border border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
          >
            <Sparkles size={10} />
            {enriching ? "Enriching..." : "Enrich from LinkedIn"}
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          RANKED BY PRIORITY SCORE
        </span>
      </div>

      {enrichResult && (
        <div className="mb-2">
          {enrichResult.skipped === -1 ? (
            <p className="text-[10px] text-red-400">
              Enrichment failed. Try again later.
            </p>
          ) : enrichResult.total === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No contacts need enrichment — all CSV imports already have education data.
            </p>
          ) : (
            <p className="text-[10px] text-green-400">
              Enriched {enrichResult.enriched} of {enrichResult.total} contacts
              {enrichResult.skipped > 0 && ` (${enrichResult.skipped} skipped)`}
            </p>
          )}
        </div>
      )}

      <div className="mb-4 h-px bg-border" />
      <ContactsList key={refreshKey} />
    </div>
  );
}
