"use client";

import { useEffect, useState, useCallback } from "react";

interface Brief {
  who: string;
  ourHistory: string;
  theirFocus: string;
  questions: string[];
  theAsk: string;
  redFlags: string[];
}

export default function PrepView({ contactId }: { contactId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/me/prep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId, force }),
        });
        const data = await res.json();
        if (!res.ok) setErr(data.error || "Failed to generate");
        else {
          setBrief(data.brief);
          setAi(data.ai);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [contactId],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !brief) {
    return <p className="mt-8 text-[14px] text-[#8A8077]">Building your brief…</p>;
  }
  if (err) return <p className="mt-8 text-[14px] text-[#E8643C]">{err}</p>;
  if (!brief) return null;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center gap-3">
        {!ai && (
          <span className="text-[10px] uppercase tracking-wide text-[#8A8077] bg-[#2E2A27] rounded px-2 py-0.5">
            offline draft
          </span>
        )}
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="text-[12px] rounded-md border border-[#38332F] px-2.5 py-1 text-[#C9C2BB] hover:border-[#E8643C] hover:text-[#E8643C] disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "↻ Regenerate"}
        </button>
      </div>

      <Block label="Who they are" text={brief.who} />
      <Block label="Your history" text={brief.ourHistory} />
      <Block label="What they're focused on" text={brief.theirFocus} />

      <div>
        <h3 className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077] mb-2">Questions to ask</h3>
        <ol className="space-y-2">
          {brief.questions.map((q, i) => (
            <li key={i} className="flex gap-3 text-[14px] text-[#E7E1DB]">
              <span className="text-[#E8643C] font-mono text-[12px] mt-0.5">{i + 1}</span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-[#E8643C]/30 bg-[#E8643C]/[0.06] p-4">
        <h3 className="text-[12px] uppercase tracking-[0.16em] text-[#E8643C] mb-1.5">The ask</h3>
        <p className="text-[14px] text-white">{brief.theAsk}</p>
      </div>

      {brief.redFlags.length > 0 && (
        <div>
          <h3 className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077] mb-2">Watch out</h3>
          <ul className="space-y-1">
            {brief.redFlags.map((r, i) => (
              <li key={i} className="text-[13px] text-[#B7AFA7]">• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077] mb-1.5">{label}</h3>
      <p className="text-[14px] leading-relaxed text-[#E7E1DB]">{text}</p>
    </div>
  );
}
