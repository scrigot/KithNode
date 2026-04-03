"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import type { ImportResult } from "@/lib/api";

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-green-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

export default function ImportPage() {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError("Failed to import. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          IMPORT
        </h2>
        <p className="text-[10px] text-muted-foreground">
          PASTE LINKEDIN URLS TO ADD TO YOUR PIPELINE
        </p>
      </div>
      <div className="mb-4 h-px bg-border" />

      {/* URL input */}
      <div className="max-w-xl">
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

      {/* Error */}
      {error && (
        <div className="mt-4 max-w-xl border border-accent-amber/30 bg-accent-amber/5 p-3 text-xs text-accent-amber">
          {error}
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
