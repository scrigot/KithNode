"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import type { ImportResult } from "@/lib/api";
import { Upload, Link2, AlertTriangle, Sparkles, X } from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

interface CsvContact {
  name: string;
  title: string;
  firmName: string;
  email: string;
  education: string;
  location: string;
  linkedInUrl: string;
}

function parseCSVField(field: string): string {
  let f = field.trim();
  if (f.startsWith('"') && f.endsWith('"')) {
    f = f.slice(1, -1).replace(/""/g, '"');
  }
  return f;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseLinkedInCSV(text: string): CsvContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("first name") && lower.includes("last name")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      "LinkedIn may have changed their export format. Expected columns: First Name, Last Name, Company, Position. Try re-exporting from LinkedIn Settings > Get a copy of your data > Connections.",
    );
  }

  const headers = parseCSVLine(lines[headerIdx]).map((h) =>
    h.toLowerCase().trim(),
  );
  const firstNameIdx = headers.findIndex((h) => h === "first name");
  const lastNameIdx = headers.findIndex((h) => h === "last name");
  const emailIdx = headers.findIndex((h) => h === "email address");
  const companyIdx = headers.findIndex((h) => h === "company");
  const positionIdx = headers.findIndex((h) => h === "position");
  const urlIdx = headers.findIndex((h) => h === "url");

  const contacts: CsvContact[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const firstName =
      firstNameIdx >= 0 ? parseCSVField(fields[firstNameIdx] || "") : "";
    const lastName =
      lastNameIdx >= 0 ? parseCSVField(fields[lastNameIdx] || "") : "";
    const name = `${firstName} ${lastName}`.trim();
    if (!name) continue;

    const email = emailIdx >= 0 ? parseCSVField(fields[emailIdx] || "") : "";
    const firmName =
      companyIdx >= 0 ? parseCSVField(fields[companyIdx] || "") : "";
    const title = positionIdx >= 0 ? parseCSVField(fields[positionIdx] || "") : "";

    const csvUrl = urlIdx >= 0 ? parseCSVField(fields[urlIdx] || "") : "";
    let linkedInUrl = csvUrl;
    if (!linkedInUrl) {
      const slug = `${firstName}-${lastName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      linkedInUrl = slug ? `https://linkedin.com/in/${slug}` : "";
    }

    contacts.push({
      name,
      title,
      firmName,
      email,
      education: "",
      location: "",
      linkedInUrl,
    });
  }

  return contacts;
}

export default function ImportPage() {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError(
        "Import failed. Please try again or check that your URLs are valid LinkedIn profile links.",
      );
    } finally {
      setLoading(false);
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

    try {
      const res = await apiFetch("/api/import/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: csvContacts }),
      });

      if (!res.ok) throw new Error("Import failed");

      const data: ImportResult = await res.json();
      setResult(data);
      trackEvent("linkedin_csv_import", {
        imported: data.imported,
        failed: data.failed,
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

                <Button
                  onClick={handleCSVImport}
                  disabled={loading}
                  className="mt-1 w-full bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
                >
                  {loading
                    ? "Importing..."
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

      {/* Enrich tip */}
      {result && result.imported > 0 && (
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
            {result.contacts.map((c, i) => (
              <div
                key={i}
                className={`flex items-start justify-between gap-2 border px-2 py-1.5 text-[11px] ${
                  c.error
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-white/[0.06] bg-background"
                }`}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
