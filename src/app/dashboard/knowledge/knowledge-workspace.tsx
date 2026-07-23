"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { QuietButton, WorkspaceContent } from "@/components/product-workspace";
import { MetricStrip, StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";

type Source = {
  id: string;
  title: string;
  count: number;
  status: "ready" | "incomplete" | "degraded" | "unavailable";
  freshnessAt: string | null;
  provenance: string;
  recoveryAction: string;
  href: string;
};

export function KnowledgeWorkspace() {
  const [sources, setSources] = useState<Source[]>([]);
  const [summary, setSummary] = useState({ ready: 0, needsAttention: 0, totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/knowledge-sources");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Knowledge sources are temporarily unavailable.");
      setSources(body.sources || []);
      setSummary(body.summary || { ready: 0, needsAttention: 0, totalRecords: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Knowledge sources are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader
        eyebrow="Grounding & provenance"
        title="Knowledge Center"
        description="The real sources KithNode can use—what is ready, how fresh it is, and how to recover missing context."
        actions={<QuietButton onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</QuietButton>}
      />
      <MetricStrip items={[{ label: "Sources ready", value: summary.ready }, { label: "Needs attention", value: summary.needsAttention }, { label: "Grounded records", value: summary.totalRecords }, { label: "Default behavior", value: "Cite evidence" }]} />
      <WorkspaceContent className="mt-5">
        {loading ? <WorkspaceLoading label="Checking knowledge sources" /> : error ? <WorkspaceError message={error} onRetry={load} /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {sources.map((source) => <Link key={source.id} href={source.href} className="group rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-text-secondary"><Database className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="font-heading text-xl font-medium text-text-primary">{source.title}</h2><StatusBadge tone={source.status === "ready" ? "success" : source.status === "degraded" ? "danger" : "warning"}>{source.status.replaceAll("_", " ")}</StatusBadge></div><p className="mt-1 text-sm text-text-secondary">{source.count} records · {source.provenance}</p><p className="mt-4 text-sm leading-6 text-text-secondary">{source.status === "ready" ? `Ready for grounded recommendations${source.freshnessAt ? ` · refreshed ${new Date(source.freshnessAt).toLocaleDateString()}` : ""}.` : source.recoveryAction}</p><span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Open source <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></div>
              </div>
            </Link>)}
          </div>
        )}
      </WorkspaceContent>
    </div>
  );
}

