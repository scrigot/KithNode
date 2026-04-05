"use client";

import { useState } from "react";
import { ContactsList } from "./contacts-list";
import { RefreshCw } from "lucide-react";

export default function ContactsPage() {
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<{
    rescored: number;
    total: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRescore = async () => {
    setRescoring(true);
    setRescoreResult(null);

    try {
      const res = await fetch("/api/contacts/rescore", { method: "POST" });
      if (!res.ok) throw new Error("Rescore failed");
      const data = await res.json();
      setRescoreResult(data);
      setRefreshKey((k) => k + 1);
    } catch {
      setRescoreResult({ rescored: 0, total: -1 });
    } finally {
      setRescoring(false);
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
            onClick={handleRescore}
            disabled={rescoring}
            className="inline-flex items-center gap-1.5 border border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors duration-150 hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
          >
            <RefreshCw size={10} className={rescoring ? "animate-spin" : ""} />
            {rescoring ? "Rescoring..." : "Rescore Contacts"}
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          RANKED BY PRIORITY SCORE
        </span>
      </div>

      {rescoreResult && (
        <div className="mb-2">
          {rescoreResult.total === -1 ? (
            <p className="text-[10px] text-red-400">
              Rescore failed. Try again later.
            </p>
          ) : (
            <p className="text-[10px] text-green-400">
              Rescored {rescoreResult.rescored} of {rescoreResult.total} contacts
            </p>
          )}
        </div>
      )}

      <div className="mb-4 h-px bg-border" />
      <ContactsList key={refreshKey} />
    </div>
  );
}
