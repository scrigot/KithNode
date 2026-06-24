"use client";

import { useState } from "react";

// Draft an AI-consulting outreach email for this contact, right from the prep
// screen. Generate → review → copy. Nothing is sent (authenticity guard).
export default function DraftButton({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string; ai: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setErr(null);
    setCopied(false);
    try {
      const res = await fetch("/api/me/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || "Failed to draft");
      else setDraft(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[#38332F]">
      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f] disabled:opacity-50 transition-colors"
        >
          {loading ? "Drafting…" : draft ? "↻ Re-draft email" : "✉ Draft outreach email"}
        </button>
        {draft && (
          <button onClick={copy} className="text-[12px] text-[#C9C2BB] hover:text-[#E8643C]">
            {copied ? "copied ✓" : "copy"}
          </button>
        )}
        {draft && !draft.ai && (
          <span className="text-[10px] uppercase tracking-wide text-[#8A8077] bg-[#2E2A27] rounded px-2 py-0.5">offline draft</span>
        )}
      </div>
      {err && <p className="mt-2 text-[13px] text-[#E8643C]">{err}</p>}
      {draft && (
        <div className="mt-3 rounded-xl border border-[#38332F] bg-[#232020] p-4">
          <p className="text-[13px] text-white font-medium">{draft.subject}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#E7E1DB] whitespace-pre-wrap">{draft.body}</p>
        </div>
      )}
    </div>
  );
}
