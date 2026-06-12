"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import type { ImportResult } from "@/lib/api";
import {
  parseLinkedInCSV,
  type CsvContact,
} from "@/lib/linkedin-csv";
import { Upload, Link2, AlertTriangle, Sparkles, X } from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  kith: "text-amber-300",
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

// Chunk CSV contacts so the import bar advances per batch instead of hanging
// on one slow request for the whole file.
const IMPORT_BATCH_SIZE = 50;

export default function ImportPage() {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Determinate progress for the chunked CSV import.
  const [importDone, setImportDone] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  // Track which contact row is being enriched post-import.
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  // How many URLs were in the last submitted URL-import batch.
  const [lastUrlImportCount, setLastUrlImportCount] = useState(0);

  const [csvContacts, setCsvContacts] = useState<CsvContact[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlCount = urls.split("\n").filter((u) => u.trim()).length;

  const handleImport = async () => {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urlList.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLastUrlImportCount(urlList.length);

    try {
      const res = await apiFetch("/api/import/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });

      if (!res.ok) throw new Error("Import failed");

      const data: ImportResult = await res.json();
      setResult(data);
      trackEvent("linkedin_import", {
        imported: data.imported,
        failed: data.failed,
        total: urlList.length,
      });

      // Single-URL import: auto-enrich then navigate to the contact profile.
      const successContacts = data.contacts.filter((c) => !c.error && c.id);
      if (urlList.length === 1 && data.imported === 1 && successContacts.length === 1) {
        const contactId = successContacts[0].id!;
        setEnrichingId(contactId);
        try {
          await apiFetch("/api/contacts/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId }),
          });
        } catch {
          // Enrich failure is non-fatal — navigate anyway so user can edit manually.
        }
        router.push(`/contact/${contactId}?from=import`);
      }
    } catch {
      setError(
        "Import failed. Please try again or check that your URLs are valid LinkedIn profile links.",
      );
    } finally {
      setLoading(false);
      setEnrichingId(null);
    }
  };

  const handleCSVFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const contacts = parseLinkedInCSV(text);
        setCsvContacts(contacts);
        setCsvFileName(file.name);
        setError(null);
        setResult(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV.");
        setCsvContacts([]);
        setCsvFileName(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
  };

  const handleCSVImport = async () => {
    if (csvContacts.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setImportTotal(csvContacts.length);
    setImportDone(0);

    const merged: ImportResult = { imported: 0, failed: 0, contacts: [] };
    try {
      for (let i = 0; i < csvContacts.length; i += IMPORT_BATCH_SIZE) {
        const batch = csvContacts.slice(i, i + IMPORT_BATCH_SIZE);
        const res = await apiFetch("/api/import/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: batch }),
        });

        if (!res.ok) throw new Error("Import failed");

        const data: ImportResult = await res.json();
        merged.imported += data.imported;
        merged.failed += data.failed;
        merged.contacts.push(...data.contacts);
        setImportDone(Math.min(i + batch.length, csvContacts.length));
        setResult({ ...merged });
      }
      trackEvent("linkedin_csv_import", {
        imported: merged.imported,
        failed: merged.failed,
        total: csvContacts.length,
      });
    } catch {
      setError("Failed to import CSV contacts.");
    } finally {
      setLoading(false);
    }
  };

  const clearCSV = () => {
    setCsvContacts([]);
    setCsvFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const csvFirmCounts: Array<[string, number]> = (() => {
    const m = new Map<string, number>();
    for (const c of csvContacts) {
      const k = c.firmName || "(no company)";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  })();

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            IMPORT
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Paste LinkedIn URLs or upload a CSV
          </p>
        </div>
      </div>

      <div className="mt-3 h-px bg-border" />

      {/* Two-column inputs: CSV + URL paste */}
      <div className="mt-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* CSV Upload */}
        <div className="flex flex-col border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Upload className="h-3 w-3" />
              LinkedIn CSV Export
            </span>
            {csvContacts.length > 0 && (
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {csvContacts.length} parsed
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 p-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-colors ${
                dragging
                  ? "border-primary bg-primary/10"
                  : csvFileName
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/[0.1] bg-muted hover:border-white/[0.25]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              {csvFileName ? (
                <div className="text-center">
                  <p className="text-[12px] font-bold text-foreground">
                    {csvFileName}
                  </p>
                  <p className="mt-1 text-[10px] text-primary">
                    {csvContacts.length} contacts found
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCSV();
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground underline hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Drop CSV here or click to browse
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                    LinkedIn &gt; Settings &gt; Get a copy of your data
                  </p>
                </div>
              )}
            </div>

            {csvContacts.length > 0 && (
              <>
                {/* Preview: top firms by frequency */}
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Top Firms in Export
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {csvFirmCounts.map(([firm, n]) => (
                      <span
                        key={firm}
                        className="border border-white/[0.06] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {firm}{" "}
                        <span className="font-mono tabular-nums text-primary">
                          {n}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {loading && importTotal > 0 && (
                  <div className="mt-1">
                    <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-primary">
                      <span>Importing</span>
                      <span className="font-mono tabular-nums">
                        {importDone}/{importTotal}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-white/[0.08]">
                      <div
                        className="h-full bg-primary transition-all duration-200"
                        style={{
                          width: `${Math.round((importDone / importTotal) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCSVImport}
                  disabled={loading}
                  className="mt-1 w-full bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
                >
                  {loading
                    ? `Importing ${importDone}/${importTotal}...`
                    : `Import ${csvContacts.length} Contacts`}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* URL paste */}
        <div className="flex flex-col border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Link2 className="h-3 w-3" />
              Paste LinkedIn URLs
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground">
              {urlCount} {urlCount === 1 ? "URL" : "URLs"}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={12}
              placeholder={`https://linkedin.com/in/jane-doe\nhttps://linkedin.com/in/john-smith\nhttps://linkedin.com/in/...`}
              className="w-full flex-1 resize-y border border-input bg-muted px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <Button
              onClick={handleImport}
              disabled={loading || !urls.trim()}
              className="w-full bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
            >
              {loading
                ? "Importing..."
                : urlCount > 0
                  ? `Import ${urlCount} URLs`
                  : "Import"}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-400">{error}</p>
        </div>
      )}

      {/* Enrich tip — hidden for single-URL imports (we enrich + navigate automatically) */}
      {result && result.imported > 0 && lastUrlImportCount !== 1 && (
        <div className="mt-3 flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2">
          <Sparkles className="h-3 w-3 shrink-0 text-primary" />
          <p className="text-[11px] text-primary">
            Tip: run &ldquo;Enrich All&rdquo; in Warm Signals to fill education +
            location and improve scores.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-3 border border-white/[0.06] bg-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-green-400">{result.imported} imported</span>
              {result.failed > 0 && (
                <span className="text-red-400">{result.failed} failed</span>
              )}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Results
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.contacts.map((c, i) => {
              const isEnriching = enrichingId === c.id;
              const inner = (
                <div
                  className={`flex items-start justify-between gap-2 border px-2 py-1.5 text-[11px] ${
                    c.error
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-white/[0.06] bg-background"
                  }${!c.error && c.id ? " hover:border-primary/40 transition-colors" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    {c.error ? (
                      <div>
                        <p className="truncate text-muted-foreground">
                          {c.linkedin_url}
                        </p>
                        <p className="text-[9px] text-destructive">{c.error}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="truncate font-bold text-foreground">
                          {c.name}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {c.title}
                          {c.company_name ? ` @ ${c.company_name}` : ""}
                        </p>
                        {isEnriching && (
                          <p className="mt-0.5 text-[9px] text-primary">Enriching...</p>
                        )}
                        {c.affiliations.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {c.affiliations.slice(0, 3).map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30"
                              >
                                {a}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!c.error && (
                    <div className="text-right">
                      <span
                        className={`font-mono text-[13px] font-bold tabular-nums ${TIER_STYLES[c.tier] || "text-zinc-400"}`}
                      >
                        {Math.round(c.total_score)}
                      </span>
                      <p className="text-[8px] uppercase text-muted-foreground">
                        {c.tier}
                      </p>
                    </div>
                  )}
                </div>
              );

              return !c.error && c.id ? (
                <Link key={i} href={`/contact/${c.id}`} className="block underline-offset-2 hover:underline">
                  {inner}
                </Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
