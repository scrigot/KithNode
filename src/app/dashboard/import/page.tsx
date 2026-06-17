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
import { Upload, Link2, AlertTriangle, Sparkles, X, UserPlus } from "lucide-react";
import BrainDumpPanel from "./brain-dump-panel";

type ImportMode = "manual" | "ai" | "bulk";

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
  const [mode, setMode] = useState<ImportMode>("manual");
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

  // "Add by hand" form state (reuses the existing /api/contacts contract).
  const [manualName, setManualName] = useState("");
  const [manualFirmName, setManualFirmName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualUniversity, setManualUniversity] = useState("");
  const [manualGraduationYear, setManualGraduationYear] = useState("");
  const [manualLinkedInUrl, setManualLinkedInUrl] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<{ name: string; id?: string } | null>(null);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError(null);
    setManualSuccess(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName,
          firmName: manualFirmName,
          title: manualTitle,
          university: manualUniversity,
          graduationYear: Number(manualGraduationYear),
          linkedInUrl: manualLinkedInUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add contact");
      }

      const created = await res.json().catch(() => null);
      trackEvent("contact_added", { name: manualName, firmName: manualFirmName });
      setManualSuccess({
        name: manualName,
        id: created?.id ?? created?.contact?.id,
      });
      setManualName("");
      setManualFirmName("");
      setManualTitle("");
      setManualUniversity("");
      setManualGraduationYear("");
      setManualLinkedInUrl("");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setManualLoading(false);
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

  const TABS: Array<{ id: ImportMode; label: string }> = [
    { id: "manual", label: "Manual" },
    { id: "ai", label: "Enrich with AI" },
    { id: "bulk", label: "Bulk" },
  ];

  const manualInputClass =
    "w-full border border-white/[0.06] bg-bg-secondary px-3 py-2.5 text-[14px] text-white placeholder:text-text-muted focus:border-primary focus:outline-none";
  const manualLabelClass =
    "mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-text-secondary";

  return (
    <div className="flex min-h-full flex-col px-5 py-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">
            Import contacts
          </h1>
          <p className="mt-1.5 text-[14px] text-text-secondary">
            Add people one at a time, brain-dump with your own AI, or bulk-import a LinkedIn export.
          </p>
        </div>

        {/* Underlined text-tab bar */}
        <div className="mt-6 flex gap-6 border-b border-white/[0.06]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`-mb-px border-b-2 pb-3 text-[13px] font-medium transition-colors ${
                mode === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MANUAL tab */}
        {mode === "manual" && (
          <div className="mt-8 flex flex-col gap-8">
            {/* Paste LinkedIn URLs */}
            <div className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                  <Link2 className="h-4 w-4 text-primary" />
                  Paste LinkedIn URLs
                </span>
                <span className="text-[12px] tabular-nums text-text-secondary">
                  {urlCount} {urlCount === 1 ? "URL" : "URLs"}
                </span>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={6}
                  placeholder={`https://linkedin.com/in/jane-doe\nhttps://linkedin.com/in/john-smith\nhttps://linkedin.com/in/...`}
                  className="w-full resize-y border border-white/[0.06] bg-bg-secondary px-3 py-2.5 font-mono text-[13px] text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <Button
                  onClick={handleImport}
                  disabled={loading || !urls.trim()}
                  className="w-full bg-primary py-2.5 text-[13px] font-semibold text-white hover:bg-primary/80"
                >
                  {loading
                    ? "Importing..."
                    : urlCount > 0
                      ? `Import ${urlCount} URLs`
                      : "Import"}
                </Button>
              </div>
            </div>

            {/* Add by hand */}
            <div className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-6 py-4">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold text-white">Add by hand</span>
              </div>
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-5 p-6">
                {manualError && (
                  <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-[13px] text-amber-400">{manualError}</p>
                  </div>
                )}
                {manualSuccess && (
                  <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-2.5">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    {manualSuccess.id ? (
                      <p className="text-[13px] text-primary">
                        Added {manualSuccess.name}.{" "}
                        <Link
                          href={`/contact/${manualSuccess.id}`}
                          className="underline underline-offset-2"
                        >
                          View contact
                        </Link>
                      </p>
                    ) : (
                      <p className="text-[13px] text-primary">Added {manualSuccess.name}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={manualLabelClass}>Name</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className={manualInputClass}
                    />
                  </div>
                  <div>
                    <label className={manualLabelClass}>Firm</label>
                    <input
                      type="text"
                      value={manualFirmName}
                      onChange={(e) => setManualFirmName(e.target.value)}
                      placeholder="Goldman Sachs"
                      required
                      className={manualInputClass}
                    />
                  </div>
                  <div>
                    <label className={manualLabelClass}>Title</label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Vice President"
                      required
                      className={manualInputClass}
                    />
                  </div>
                  <div>
                    <label className={manualLabelClass}>University</label>
                    <input
                      type="text"
                      value={manualUniversity}
                      onChange={(e) => setManualUniversity(e.target.value)}
                      placeholder="Wharton"
                      required
                      className={manualInputClass}
                    />
                  </div>
                  <div>
                    <label className={manualLabelClass}>Graduation Year</label>
                    <input
                      type="number"
                      value={manualGraduationYear}
                      onChange={(e) => setManualGraduationYear(e.target.value)}
                      placeholder="2020"
                      min={1950}
                      max={2030}
                      required
                      className={manualInputClass}
                    />
                  </div>
                  <div>
                    <label className={manualLabelClass}>LinkedIn URL (optional)</label>
                    <input
                      type="url"
                      value={manualLinkedInUrl}
                      onChange={(e) => setManualLinkedInUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/janesmith"
                      className={manualInputClass}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full bg-primary py-2.5 text-[13px] font-semibold text-white hover:bg-primary/80"
                >
                  {manualLoading ? "Adding..." : "Add Contact"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ENRICH WITH AI tab */}
        {mode === "ai" && (
          <div className="mt-8">
            <BrainDumpPanel />
          </div>
        )}

        {/* BULK tab */}
        {mode === "bulk" && (
          <div className="mt-8 flex flex-col gap-8">
            <div className="border border-white/[0.06] bg-bg-card">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                  <Upload className="h-4 w-4 text-primary" />
                  LinkedIn CSV Export
                </span>
                {csvContacts.length > 0 && (
                  <span className="text-[12px] tabular-nums text-text-secondary">
                    {csvContacts.length} parsed
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-5 p-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-12 transition-colors ${
                    dragging
                      ? "border-primary bg-primary/10"
                      : csvFileName
                        ? "border-primary/40 bg-primary/5"
                        : "border-white/[0.1] bg-bg-secondary hover:border-white/[0.25]"
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
                      <p className="text-[15px] font-semibold text-white">
                        {csvFileName}
                      </p>
                      <p className="mt-1.5 text-[13px] text-primary">
                        {csvContacts.length} contacts found
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearCSV();
                        }}
                        className="mt-3 inline-flex items-center gap-1 text-[12px] text-text-secondary underline hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-text-muted" />
                      <p className="mt-4 text-[15px] font-semibold text-white">
                        Upload a LinkedIn CSV export
                      </p>
                      <p className="mt-1.5 text-[13px] text-text-secondary">
                        Drop your file here or click to browse.
                      </p>
                      <p className="mt-2 text-[12px] text-text-muted">
                        LinkedIn &gt; Settings &gt; Get a copy of your data
                      </p>
                      <span className="mt-5 inline-flex bg-primary px-4 py-2.5 text-[13px] font-semibold text-white">
                        Choose CSV file
                      </span>
                    </div>
                  )}
                </div>

                {csvContacts.length > 0 && (
                  <>
                    {/* Preview: top firms by frequency */}
                    <div>
                      <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                        Top Firms in Export
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {csvFirmCounts.map(([firm, n]) => (
                          <span
                            key={firm}
                            className="border border-white/[0.06] bg-bg-secondary px-2 py-1 text-[12px] text-text-secondary"
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
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium uppercase tracking-wider text-primary">
                          <span>Importing</span>
                          <span className="font-mono tabular-nums">
                            {importDone}/{importTotal}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.08]">
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
                      className="w-full bg-primary py-2.5 text-[13px] font-semibold text-white hover:bg-primary/80"
                    >
                      {loading
                        ? `Importing ${importDone}/${importTotal}...`
                        : `Import ${csvContacts.length} Contacts`}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error (URL / CSV imports) */}
        {(mode === "manual" || mode === "bulk") && error && (
          <div className="mt-8 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-[13px] text-amber-400">{error}</p>
          </div>
        )}

        {/* Enrich tip — hidden for single-URL imports (we enrich + navigate automatically) */}
        {(mode === "manual" || mode === "bulk") &&
          result &&
          result.imported > 0 &&
          lastUrlImportCount !== 1 && (
            <div className="mt-6 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-[13px] text-primary">
                Tip: run &ldquo;Enrich All&rdquo; in Warm Signals to fill education +
                location and improve scores.
              </p>
            </div>
          )}

        {/* Results (URL / CSV imports) */}
        {(mode === "manual" || mode === "bulk") && result && (
          <div className="mt-6 border border-white/[0.06] bg-bg-card">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <span className="flex items-center gap-4 text-[13px] font-semibold">
                <span className="text-green-400">{result.imported} imported</span>
                {result.failed > 0 && (
                  <span className="text-red-400">{result.failed} failed</span>
                )}
              </span>
              <span className="text-[12px] uppercase tracking-wider text-text-secondary">
                Results
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
              {result.contacts.map((c, i) => {
                const isEnriching = enrichingId === c.id;
                const inner = (
                  <div
                    className={`flex items-start justify-between gap-2 border px-3 py-2.5 text-[13px] ${
                      c.error
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-white/[0.06] bg-bg-secondary"
                    }${!c.error && c.id ? " hover:border-primary/40 transition-colors" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      {c.error ? (
                        <div>
                          <p className="truncate text-text-secondary">
                            {c.linkedin_url}
                          </p>
                          <p className="text-[11px] text-destructive">{c.error}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="truncate font-semibold text-white">
                            {c.name}
                          </p>
                          <p className="truncate text-[12px] text-text-secondary">
                            {c.title}
                            {c.company_name ? ` @ ${c.company_name}` : ""}
                          </p>
                          {isEnriching && (
                            <p className="mt-0.5 text-[11px] text-primary">Enriching...</p>
                          )}
                          {c.affiliations.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {c.affiliations.slice(0, 3).map((a) => (
                                <Badge
                                  key={a}
                                  variant="outline"
                                  className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30"
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
                          className={`font-mono text-[15px] font-bold tabular-nums ${TIER_STYLES[c.tier] || "text-zinc-400"}`}
                        >
                          {Math.round(c.total_score)}
                        </span>
                        <p className="text-[10px] uppercase text-text-secondary">
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
    </div>
  );
}
