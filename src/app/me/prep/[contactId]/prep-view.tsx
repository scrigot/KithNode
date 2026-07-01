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
interface Meeting { purpose: string; time: string; location: string }
interface AppliedContext {
  meeting?: Partial<Meeting>;
  person?: string;
  refine?: string;
}

export default function PrepView({ contactId }: { contactId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCtx, setShowCtx] = useState(false);
  const [meeting, setMeeting] = useState<Meeting>({ purpose: "", time: "", location: "" });
  const [person, setPerson] = useState("");
  const [refine, setRefine] = useState("");
  const [context, setContext] = useState<AppliedContext | null>(null);
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [outcomeTakeaways, setOutcomeTakeaways] = useState("");
  const [outcomeNextSteps, setOutcomeNextSteps] = useState("");
  const [outcomeStage, setOutcomeStage] = useState("met");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [outcomeSaved, setOutcomeSaved] = useState(false);

  const gen = useCallback(
    async (body: Record<string, unknown>) => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/me/prep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId, ...body }),
        });
        const data = await res.json();
        if (!res.ok) setErr(data.error || "Failed to generate");
        else { setBrief(data.brief); setAi(data.ai); setContext(data.context || null); }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [contactId],
  );

  // Base brief on open (uses any cached one).
  useEffect(() => { gen({}); }, [gen]);

  function generateWithContext() {
    setShowCtx(false);
    gen({ meeting, person, force: true });
  }

  async function saveOutcome() {
    setSavingOutcome(true);
    setErr(null);
    setOutcomeSaved(false);
    try {
      const res = await fetch(`/api/me/contacts/${contactId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: outcomeSummary,
          takeaways: outcomeTakeaways,
          nextSteps: outcomeNextSteps,
          stage: outcomeStage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save outcome");
      setOutcomeSummary("");
      setOutcomeTakeaways("");
      setOutcomeNextSteps("");
      setOutcomeSaved(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingOutcome(false);
    }
  }

  if (loading && !brief) return <p className="mt-8 text-[14px] text-[#8A8077]">Building your brief…</p>;
  if (err && !brief) return <p className="mt-8 text-[14px] text-[#E8643C]">{err}</p>;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setShowCtx(true)} className="rounded-lg bg-[#E8643C] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#d4562f]">
          ＋ Meeting context
        </button>
        <button onClick={() => gen({ force: true })} disabled={loading} className="text-[12px] rounded-md border border-[#38332F] px-2.5 py-1 text-[#C9C2BB] hover:border-[#E8643C] hover:text-[#E8643C] disabled:opacity-50">
          {loading ? "…" : "↻ Regenerate"}
        </button>
        {!ai && <span className="text-[10px] uppercase tracking-wide text-[#8A8077] bg-[#2E2A27] rounded px-2 py-0.5">offline draft</span>}
        {context && (context.person || context.meeting?.purpose || context.meeting?.time) && (
          <span className="text-[10px] uppercase tracking-wide text-[#7FB069] bg-[#7FB069]/10 border border-[#7FB069]/30 rounded px-2 py-0.5">
            timeline context applied
          </span>
        )}
        {err && <span className="text-[12px] text-[#E8643C]">{err}</span>}
      </div>

      {brief && (
        <div className="mt-5 space-y-5">
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
              <ul className="space-y-1">{brief.redFlags.map((r, i) => <li key={i} className="text-[13px] text-[#B7AFA7]">• {r}</li>)}</ul>
            </div>
          )}

          {/* Refine / fine-tune */}
          <div className="pt-3 border-t border-[#2E2A27]">
            <span className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077]">Fine-tune</span>
            <div className="mt-2 flex gap-2">
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && refine.trim()) { gen({ refine, meeting, person }); setRefine(""); } }}
                placeholder="e.g. dig into their data stack · shorter · more on the ask"
                className="flex-1 rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
              />
              <button onClick={() => { if (refine.trim()) { gen({ refine, meeting, person }); setRefine(""); } }} disabled={loading || !refine.trim()}
                className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50">
                Refine
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2E2A27]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[12px] uppercase tracking-[0.16em] text-[#8A8077]">After the chat</span>
                <p className="mt-1 text-[12px] text-[#6F665E]">Save takeaways into memory and update the pipeline in one step.</p>
              </div>
              {outcomeSaved && <span className="shrink-0 text-[12px] text-[#7FB069]">saved</span>}
            </div>
            <div className="mt-3 space-y-3">
              <textarea
                value={outcomeSummary}
                onChange={(e) => { setOutcomeSummary(e.target.value); setOutcomeSaved(false); }}
                rows={2}
                placeholder="Summary: what happened?"
                className="w-full resize-none rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
              />
              <textarea
                value={outcomeTakeaways}
                onChange={(e) => { setOutcomeTakeaways(e.target.value); setOutcomeSaved(false); }}
                rows={2}
                placeholder="Takeaways: what did you learn about them, AI consulting, companies, roles?"
                className="w-full resize-none rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
              />
              <textarea
                value={outcomeNextSteps}
                onChange={(e) => { setOutcomeNextSteps(e.target.value); setOutcomeSaved(false); }}
                rows={2}
                placeholder="Next steps, one per line: send article, ask for intro, follow up next week..."
                className="w-full resize-none rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={outcomeStage}
                  onChange={(e) => setOutcomeStage(e.target.value)}
                  className="rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
                >
                  <option value="talking">Keep talking</option>
                  <option value="met">Met</option>
                  <option value="warm">Warm</option>
                </select>
                <button
                  onClick={saveOutcome}
                  disabled={savingOutcome || (!outcomeSummary.trim() && !outcomeTakeaways.trim() && !outcomeNextSteps.trim())}
                  className="rounded-lg bg-[#E8643C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50"
                >
                  {savingOutcome ? "Saving..." : "Save outcome"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting-context popup */}
      {showCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCtx(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[#38332F] bg-[#1F1C1B] p-5 space-y-3" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "var(--font-sans)" }}>
            <h3 className="text-[15px] font-semibold text-white">Meeting context</h3>
            <p className="text-[12px] text-[#9C948C]">Tailors the brief to this specific meeting.</p>
            {(["purpose", "time", "location"] as const).map((k) => (
              <input key={k} value={meeting[k]} onChange={(e) => setMeeting({ ...meeting, [k]: e.target.value })}
                placeholder={k === "purpose" ? "Purpose (e.g. explore a pilot)" : k === "time" ? "When (e.g. Thu 2pm)" : "Where (e.g. Zoom / their office)"}
                className="w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]" />
            ))}
            <textarea value={person} onChange={(e) => setPerson(e.target.value)} rows={3}
              placeholder="Anything else about them for this meeting (beyond their profile)"
              className="w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C] resize-none" />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowCtx(false)} className="text-[13px] text-[#8A8077] hover:text-white px-3 py-2">Cancel</button>
              <button onClick={generateWithContext} className="rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f]">Generate brief</button>
            </div>
          </div>
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
