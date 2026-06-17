"use client";

import { useState, useEffect, useRef, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import {
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Upload,
  ArrowRight,
  X,
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<BrainDumpResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setPromptError("Couldn't load your personalized prompt. Refresh to try again.");
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
      // Clipboard blocked — silently ignore.
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportError("Only .csv files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText((e.target?.result as string) || "");
      setFileName(file.name);
      setImportError(null);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setCsvText("");
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const warmCount = result?.contacts.filter((c) => WARM_TIERS.has(c.tier)).length ?? 0;

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {/* Box 1 — Copy the prompt */}
      <div className="flex flex-col border border-white/[0.06] bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">
            Step 1 · Copy the prompt
          </h3>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Run this in Claude or ChatGPT alongside your LinkedIn{" "}
          <span className="font-mono text-foreground">Connections.csv</span>. It enriches
          every contact with school, clubs, Greek org, hometown, and how you know them — then
          hands you a ready-to-import CSV.
        </p>

        <div className="mt-auto pt-5">
          <Button
            onClick={handleCopy}
            disabled={promptLoading || !!promptError || !prompt}
            className="w-full bg-primary py-2.5 text-[13px] font-bold uppercase tracking-wider text-white hover:bg-primary/80 disabled:opacity-40"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Copied
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-4 w-4" />
                {promptLoading ? "Preparing prompt…" : "Copy prompt"}
              </span>
            )}
          </Button>
          {promptError && (
            <p className="mt-2 text-[12px] text-amber-400">{promptError}</p>
          )}
        </div>
      </div>

      {/* Box 2 — Upload enriched CSV */}
      <div className="flex flex-col border border-white/[0.06] bg-card p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">
            Step 2 · Import enriched CSV
          </h3>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Answer the prompt&apos;s questions in your AI, save the CSV it returns, then drop it
          below.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-3 flex flex-1 cursor-pointer flex-col items-center justify-center border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/10"
              : fileName
                ? "border-primary/40 bg-primary/5"
                : "border-white/[0.12] bg-muted hover:border-white/[0.3]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          {fileName ? (
            <>
              <p className="text-[13px] font-bold text-foreground">{fileName}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-[13px] text-muted-foreground">
                Drop enriched CSV here or click to browse
              </p>
            </>
          )}
        </div>

        {importError && (
          <div className="mt-3 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-[12px] text-amber-400">{importError}</p>
          </div>
        )}

        {result && (
          <div className="mt-3 border border-primary/30 bg-primary/5 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                Enriched{" "}
                <span className="font-mono font-bold tabular-nums">{result.imported}</span>{" "}
                contacts —{" "}
                <span className="font-mono font-bold tabular-nums">{warmCount}</span> now
                warm/kith
                {result.failed > 0 && (
                  <span className="text-amber-400"> ({result.failed} failed)</span>
                )}
              </span>
            </p>
            <Link
              href="/dashboard/contacts"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary underline-offset-2 hover:underline"
            >
              View contacts
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={importing || !csvText.trim()}
          className="mt-3 w-full bg-primary py-2.5 text-[13px] font-bold uppercase tracking-wider text-white hover:bg-primary/80 disabled:opacity-40"
        >
          {importing ? "Importing…" : "Import enriched data"}
        </Button>
      </div>
    </div>
  );
}
