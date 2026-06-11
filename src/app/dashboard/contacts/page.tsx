"use client";

import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ContactsList } from "./contacts-list";
import { RefreshCw, Sparkles, Square, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface TierCounts {
  hot: number;
  warm: number;
  monitor: number;
  cold: number;
  total: number;
}

export default function ContactsPage() {
  const [rescoring, setRescoring] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const stopEnrichRef = useRef(false);
  const [statusMsg, setStatusMsg] = useState<{
    kind: "success" | "error" | "upgrade";
    text: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tierCounts, setTierCounts] = useState<TierCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/contacts?curated=true");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const counts: TierCounts = { hot: 0, warm: 0, monitor: 0, cold: 0, total: 0 };
        for (const c of data || []) {
          const t = (c?.score?.tier || "cold").toLowerCase();
          if (t in counts) counts[t as keyof Omit<TierCounts, "total">]++;
          counts.total++;
        }
        setTierCounts(counts);
      } catch (err) {
      Sentry.captureException(err);
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRescore = async () => {
    setRescoring(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch("/api/contacts/rescore", { method: "POST" });
      if (!res.ok) throw new Error("Rescore failed");
      const data = await res.json();
      setStatusMsg({
        kind: "success",
        text: `Rescored ${data.rescored} of ${data.total} contacts`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      Sentry.captureException(err);
      setStatusMsg({ kind: "error", text: "Rescore failed. Try again later." });
    } finally {
      setRescoring(false);
    }
  };

  const handleEnrich = async () => {
    stopEnrichRef.current = false;
    setEnriching(true);
    setStatusMsg(null);
    let totalEnriched = 0;
    let totalFailed = 0;
    try {
      // Loop until the server reports remaining === 0, the user stops, or an error occurs.
      // Safety cap: 40 batches × 25 = 1000 contacts max.
      for (let batch = 0; batch < 40; batch++) {
        if (stopEnrichRef.current) break;
        const res = await apiFetch("/api/contacts/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.status === 402) {
          setStatusMsg({
            kind: "upgrade",
            text: "Enrich is a Pro feature. Upgrade to use it.",
          });
          return;
        }
        if (!res.ok) throw new Error("Enrich failed");
        const data = await res.json();
        totalEnriched += data.enriched || 0;
        totalFailed += data.failed || 0;
        const remaining: number = data.remaining ?? 0;
        // Nothing left or a batch produced no progress (persistent failures guard).
        if (remaining === 0 || (data.enriched || 0) === 0) break;
        setStatusMsg({
          kind: "success",
          text: `Enriching... ${totalEnriched} done · ${remaining} left`,
        });
        setRefreshKey((k) => k + 1);
      }
      const failedSuffix = totalFailed > 0 ? `, ${totalFailed} failed` : "";
      setStatusMsg({
        kind: "success",
        text: `Enriched ${totalEnriched}${failedSuffix}`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      Sentry.captureException(err);
      setStatusMsg({ kind: "error", text: "Enrich failed. Try again later." });
    } finally {
      setEnriching(false);
    }
  };

  const handleStopEnrich = () => {
    stopEnrichRef.current = true;
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            WARM SIGNALS
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Ranked by priority score
          </p>
        </div>

        <div className="flex items-center gap-2">
          {enriching ? (
            <button
              onClick={handleStopEnrich}
              title="Stop enrichment"
              className="inline-flex items-center gap-1.5 border border-white/[0.12] bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition-colors hover:border-amber-400/40"
            >
              <Square size={10} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleEnrich}
              disabled={rescoring}
              title="Use Claude to fill in missing industry, seniority, education, and location, then re-score"
              className="inline-flex items-center gap-1.5 border border-white/[0.12] bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <Sparkles size={10} />
              Enrich All
            </button>
          )}
          <button
            onClick={handleRescore}
            disabled={rescoring || enriching}
            title="Re-run scoring against your current preferences"
            className="inline-flex items-center gap-1.5 border border-white/[0.12] bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw size={10} className={rescoring ? "animate-spin" : ""} />
            {rescoring ? "Rescoring" : "Rescore"}
          </button>
        </div>
      </div>

      {/* Tier counts strip */}
      {tierCounts && tierCounts.total > 0 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          <div className="border border-white/[0.06] bg-card px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Total
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-foreground">
              <Users className="h-3 w-3 text-muted-foreground" />
              {tierCounts.total}
            </p>
          </div>
          <div className="border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-red-400">
              HOT
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-red-400">
              {tierCounts.hot}
            </p>
          </div>
          <div className="border border-blue-500/20 bg-blue-500/5 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
              WARM
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-blue-400">
              {tierCounts.warm}
            </p>
          </div>
          <div className="border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
              MONITOR
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-amber-400">
              {tierCounts.monitor}
            </p>
          </div>
          <div className="border border-zinc-500/20 bg-zinc-500/5 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              COLD
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-zinc-400">
              {tierCounts.cold}
            </p>
          </div>
        </div>
      )}

      {statusMsg && (
        <p
          className={`mt-2 text-[11px] ${
            statusMsg.kind === "error"
              ? "text-red-400"
              : statusMsg.kind === "upgrade"
                ? "text-accent-teal"
                : "text-green-400"
          }`}
        >
          {statusMsg.text}
          {statusMsg.kind === "upgrade" && (
            <a
              href="/dashboard/billing"
              className="ml-2 font-bold uppercase tracking-wider text-accent-teal hover:underline"
            >
              Upgrade →
            </a>
          )}
        </p>
      )}

      <div className="mt-3 h-px bg-border" />

      <div className="mt-3">
        <ContactsList key={refreshKey} />
      </div>
    </div>
  );
}
