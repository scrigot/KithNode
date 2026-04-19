"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import type { ImportResult } from "@/lib/api";

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
      "LinkedIn may have changed their export format. Expected columns: First Name, Last Name, Company, Position. Try re-exporting from LinkedIn Settings > Get a copy of your data > Connections."
    );
  }

  const headers = parseCSVLine(lines[headerIdx]).map((h) => h.toLowerCase().trim());
  const firstNameIdx = headers.findIndex((h) => h === "first name");
  const lastNameIdx = headers.findIndex((h) => h === "last name");
  const emailIdx = headers.findIndex((h) => h === "email address");
  const companyIdx = headers.findIndex((h) => h === "company");
  const positionIdx = headers.findIndex((h) => h === "position");
  const urlIdx = headers.findIndex((h) => h === "url");

  const contacts: CsvContact[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const firstName = firstNameIdx >= 0 ? parseCSVField(fields[firstNameIdx] || "") : "";
    const lastName = lastNameIdx >= 0 ? parseCSVField(fields[lastNameIdx] || "") : "";
    const name = `${firstName} ${lastName}`.trim();
    if (!name) continue;

    const email = emailIdx >= 0 ? parseCSVField(fields[emailIdx] || "") : "";
    const firmName = companyIdx >= 0 ? parseCSVField(fields[companyIdx] || "") : "";
    const title = positionIdx >= 0 ? parseCSVField(fields[positionIdx] || "") : "";

    // Use real LinkedIn URL from CSV if available, otherwise construct from name
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

  // CSV state
  const [csvContacts, setCsvContacts] = useState<CsvContact[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("/api/import/linkedin", {
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
      setError("Import failed. Please try again or check that your URLs are valid LinkedIn profile links.");
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
      const res = await fetch("/api/import/linkedin", {
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

  return (
    <div className="p-5">
      <div className="mb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          IMPORT
        </h2>
        <p className="text-[10px] text-muted-foreground">
          PASTE LINKEDIN URLS OR UPLOAD A CSV TO ADD TO YOUR PIPELINE
        </p>
      </div>
      <div className="mb-4 h-px bg-border" />

      <div className="max-w-xl space-y-6">
        {/* CSV Upload Zone */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            LINKEDIN CSV EXPORT
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${
              dragging
                ? "border-primary bg-primary/10"
                : csvFileName
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted hover:border-muted-foreground"
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
                <p className="text-xs font-bold text-foreground">{csvFileName}</p>
                <p className="mt-1 text-[10px] text-primary">
                  {csvContacts.length} contacts found
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCSV();
                  }}
                  className="mt-2 text-[10px] text-muted-foreground underline hover:text-foreground"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13"
                  />
                </svg>
                <p className="text-xs text-muted-foreground">
                  Drop LinkedIn CSV here or click to browse
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  LinkedIn &gt; Settings &gt; Get a copy of your data &gt; Connections
                </p>
              </div>
            )}
          </div>

          {csvContacts.length > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <Button
                size="sm"
                className="text-xs"
                onClick={handleCSVImport}
                disabled={loading}
              >
                {loading ? "IMPORTING..." : `IMPORT ${csvContacts.length} CONTACTS`}
              </Button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* URL input */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            LINKEDIN PROFILE URLS (ONE PER LINE)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={8}
            placeholder={`https://linkedin.com/in/jane-doe\nhttps://linkedin.com/in/john-smith\nhttps://linkedin.com/in/...`}
            className="w-full resize-y border border-input bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              size="sm"
              className="text-xs"
              onClick={handleImport}
              disabled={loading || !urls.trim()}
            >
              {loading ? "IMPORTING..." : "IMPORT"}
            </Button>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {urls.split("\n").filter((u) => u.trim()).length} URLs
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 max-w-xl border border-accent-amber/30 bg-accent-amber/5 p-3 text-xs text-accent-amber">
          {error}
        </div>
      )}

      {/* Enrich Tip */}
      {result && result.imported > 0 && (
        <div className="mt-4 max-w-xl border border-accent-teal/30 bg-accent-teal/5 p-3 text-xs text-accent-teal">
          Tip: Click &ldquo;Enrich from LinkedIn&rdquo; in Warm Signals to fill in education data and improve scores.
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 max-w-xl">
          <div className="mb-3 flex gap-4 text-xs">
            <span className="text-green-400">
              {result.imported} imported
            </span>
            {result.failed > 0 && (
              <span className="text-red-400">
                {result.failed} failed
              </span>
            )}
          </div>

          <div className="space-y-1">
            {result.contacts.map((c, i) => (
              <div
                key={i}
                className={`flex items-center justify-between border p-2 text-xs ${
                  c.error
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="min-w-0 flex-1">
                  {c.error ? (
                    <div>
                      <p className="truncate text-muted-foreground">
                        {c.linkedin_url}
                      </p>
                      <p className="text-[10px] text-destructive">
                        {c.error}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.title}
                        {c.company_name ? ` @ ${c.company_name}` : ""}
                      </p>
                      {c.affiliations.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {c.affiliations.map((a) => (
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
                  <div className="ml-2 text-right">
                    <span
                      className={`text-sm font-bold tabular-nums ${TIER_STYLES[c.tier] || "text-zinc-400"}`}
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
