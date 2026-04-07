"use client";

import { useState } from "react";
import { ContactsList } from "./contacts-list";
import { RefreshCw, Sparkles } from "lucide-react";

export default function ContactsPage() {
  const [rescoring, setRescoring] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRescore = async () => {
    setRescoring(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/contacts/rescore", { method: "POST" });
      if (!res.ok) throw new Error("Rescore failed");
      const data = await res.json();
      setStatusMsg({ kind: "success", text: `Rescored ${data.rescored} of ${data.total} contacts` });
      setRefreshKey((k) => k + 1);
    } catch {
      setStatusMsg({ kind: "error", text: "Rescore failed. Try again later." });
    } finally {
      setRescoring(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/contacts/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Enrich failed");
      const data = await res.json();
      const failedSuffix = data.failed > 0 ? ` (${data.failed} failed)` : "";
      setStatusMsg({
        kind: "success",
        text: `Enriched ${data.enriched} of ${data.total} contacts${failedSuffix}`,
      });
      setRefreshKey((k) => k + 1);
    } catch {
      setStatusMsg({ kind: "error", text: "Enrich failed. Try again later." });
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
            disabled={enriching || rescoring}
            className="inline-flex items-center gap-1.5 border border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors duration-150 hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
            title="Use Claude to fill in missing industry, seniority, education, and location, then re-score"
          >
            <Sparkles size={10} className={enriching ? "animate-spin" : ""} />
            {enriching ? "Enriching..." : "Enrich All"}
          </button>
          <button
            onClick={handleRescore}
            disabled={rescoring || enriching}
            className="inline-flex items-center gap-1.5 border border-border bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors duration-150 hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
            title="Re-run scoring against your current preferences"
          >
            <RefreshCw size={10} className={rescoring ? "animate-spin" : ""} />
            {rescoring ? "Rescoring..." : "Rescore"}
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          RANKED BY PRIORITY SCORE
        </span>
      </div>

      {statusMsg && (
        <div className="mb-2">
          <p className={`text-[10px] ${statusMsg.kind === "error" ? "text-red-400" : "text-green-400"}`}>
            {statusMsg.text}
          </p>
        </div>
      )}

      <div className="mb-4 h-px bg-border" />
      <ContactsList key={refreshKey} />
    </div>
  );
}
