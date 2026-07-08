"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: string[];
  error?: string;
}

// Reads the chosen Connections.csv in the browser and POSTs its text to the
// import route. No multipart, no file ever leaves localhost.
export default function ImportCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    setErrorMsg(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/me/import/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data: ImportResult = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Import failed (${res.status})`);
      } else {
        setResult(data);
        router.refresh(); // reload the contact list below
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium text-white">Import LinkedIn connections</h2>
          <p className="mt-1 text-[13px] text-[#9C948C]">
            LinkedIn → Settings → Data privacy → Get a copy of your data → Connections.
            Drop the <span className="text-[#C9C2BB]">Connections.csv</span> here. Stays on localhost.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f] disabled:opacity-50 transition-colors"
        >
          {busy ? "Importing…" : "Choose CSV"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {errorMsg && (
        <p className="mt-3 text-[13px] text-[#E8643C]">{errorMsg}</p>
      )}
      {result && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#B7AFA7]">
          <span><span className="text-white font-medium">{result.created}</span> added</span>
          <span><span className="text-white font-medium">{result.updated}</span> updated</span>
          {result.skipped > 0 && <span>{result.skipped} skipped</span>}
          {result.failed > 0 && <span className="text-[#E8643C]">{result.failed} failed</span>}
        </div>
      )}
    </div>
  );
}
