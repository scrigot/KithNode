"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import {
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Download,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  kith: "text-amber-300",
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

interface BrainDumpResult {
  ok: true;
  imported: number;
  created: number;
  updated: number;
  failed: number;
  contacts: { name: string; tier: string; score: number }[];
}

// Tiers that count as a meaningful relationship for the summary line.
const WARM_TIERS = new Set(["warm", "hot", "kith"]);

export default function BrainDumpPanel() {
  const [prompt, setPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<BrainDumpResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setPromptLoading(true);
      setPromptError(null);
      try {
        const res = await apiFetch("/api/import/brain-dump");
        if (!res.ok) throw new Error("fetch failed");
        const data: { prompt: string } = await res.json();
        if (active) setPrompt(data.prompt);
      } catch {
        if (active)
          setPromptError(
            "Couldn't load your personalized prompt. Refresh to try again.",
          );
      } finally {
        if (active) setPromptLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — silently ignore, prompt is still visible to select.
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;

    setImporting(true);
    setImportError(null);
    setResult(null);
    try {
      const res = await apiFetch("/api/import/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Import failed. Check the CSV and retry.");
        return;
      }

      setResult(data as BrainDumpResult);
      trackEvent("brain_dump_import", {
        imported: data.imported,
        created: data.created,
        updated: data.updated,
        failed: data.failed,
      });
    } catch {
      setImportError("Import failed. Check the CSV and retry.");
    } finally {
      setImporting(false);
    }
  };

  const warmCount =
    result?.contacts.filter((c) => WARM_TIERS.has(c.tier)).length ?? 0;

  return (
    <div className="mt-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
      {/* Left: personalized prompt */}
      <div className="flex flex-col border border-white/[0.06] bg-card">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Your Brain-Dump Prompt
          </span>
          <button
            onClick={handleCopy}
            disabled={promptLoading || !!promptError || !prompt}
            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy prompt
              </>
            )}
          </button>
        </div>

        <div className="flex flex-1 flex-col p-3">
          {promptLoading ? (
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Loading your prompt...
            </p>
          ) : promptError ? (
            <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-400">{promptError}</p>
            </div>
          ) : (
            <pre className="h-72 flex-1 overflow-auto whitespace-pre-wrap border border-input bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
              {prompt}
            </pre>
          )}
        </div>
      </div>

      {/* Right: steps + paste-back + import */}
      <div className="flex flex-col border border-white/[0.06] bg-card">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <MessageSquare className="h-3 w-3" />
            Enrich With AI
          </span>
          {csvText.trim() && (
            <span className="text-[9px] tabular-nums text-muted-foreground">
              {csvText.trim().split("\n").filter(Boolean).length} lines
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Steps */}
          <ol className="flex flex-col gap-1.5">
            <li className="flex gap-2 text-[11px] text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-primary/15 font-mono text-[9px] font-bold text-primary">
                1
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                Export your LinkedIn{" "}
                <span className="font-mono text-foreground">Connections.csv</span>
                <span className="text-muted-foreground/60">
                  {" "}
                  [Settings &gt; Data Privacy &gt; Get a copy of your data &gt;
                  Connections]
                </span>
              </span>
            </li>
            <li className="flex gap-2 text-[11px] text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-primary/15 font-mono text-[9px] font-bold text-primary">
                2
              </span>
              <span>
                Paste this prompt + your CSV into your own Claude/ChatGPT and
                answer its questions{" "}
                <span className="text-muted-foreground/60">(~15 min)</span>.
              </span>
            </li>
            <li className="flex gap-2 text-[11px] text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-primary/15 font-mono text-[9px] font-bold text-primary">
                3
              </span>
              <span>Paste the CSV it gives you back below.</span>
            </li>
          </ol>

          <div className="my-0.5 h-px bg-border" />

          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Enriched CSV From Your AI
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            placeholder={`name,company,title,school,major,clubs,greek_org,hometown,high_school,skills,relationship,closeness,notes\nAdler Rice,Mizuho,S&T Summer Analyst,UNC Chapel Hill,,Finance Society,Chi Phi,,,,UNC Chi Phi brother,friend,`}
            className="w-full flex-1 resize-y border border-input bg-muted px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />

          {importError && (
            <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-400">{importError}</p>
            </div>
          )}

          {result && (
            <div className="border border-primary/30 bg-primary/5 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] text-primary">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>
                  Enriched{" "}
                  <span className="font-mono font-bold tabular-nums">
                    {result.imported}
                  </span>{" "}
                  contacts &mdash;{" "}
                  <span className="font-mono font-bold tabular-nums">
                    {warmCount}
                  </span>{" "}
                  now warm/kith
                  {result.failed > 0 && (
                    <span className="text-amber-400">
                      {" "}
                      ({result.failed} failed)
                    </span>
                  )}
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/contacts"
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary underline-offset-2 hover:underline"
                >
                  View contacts
                  <ArrowRight className="h-3 w-3" />
                </Link>
                {result.contacts.slice(0, 6).map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 border border-white/[0.06] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span className="truncate">{c.name}</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${TIER_STYLES[c.tier] || "text-zinc-400"}`}
                    >
                      {Math.round(c.score)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="mt-1 w-full bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
          >
            {importing ? "Importing..." : "Import enriched data"}
          </Button>
        </div>
      </div>
    </div>
  );
}
