"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clipboard, Coffee, Loader2, Mail, Plus, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Brief { who: string; ourHistory: string; theirFocus: string; questions: string[]; theAsk: string; redFlags: string[] }
interface Meeting { purpose: string; time: string; location: string }

export default function PrepWorkspace({ contactId, contactName }: { contactId: string; contactName: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(false);
  const [error, setError] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [meeting, setMeeting] = useState<Meeting>({ purpose: "", time: "", location: "" });
  const [person, setPerson] = useState("");
  const [refine, setRefine] = useState("");
  const [draft, setDraft] = useState<{ subject: string; body: string }>();
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState({ summary: "", takeaways: "", nextSteps: "", stage: "met" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = useCallback(async (extra: Record<string, unknown> = {}) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/coffee-prep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId, ...extra }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not build the brief");
      setBrief(data.brief);
      setAi(Boolean(data.ai));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not build the brief"); }
    finally { setLoading(false); }
  }, [contactId]);

  useEffect(() => { void generate(); }, [generate]);

  async function draftOutreach() {
    setDrafting(true);
    setError("");
    setCopied(false);
    try {
      const response = await apiFetch("/api/outreach/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not draft outreach");
      setDraft({ subject: String(data.subject || ""), body: String(data.draft || data.body || "") });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not draft outreach"); }
    finally { setDrafting(false); }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
  }

  async function saveOutcome() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await apiFetch("/api/coffee-prep/outcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId, ...outcome }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save the outcome");
      setSaved(true);
      setOutcome({ summary: "", takeaways: "", nextSteps: "", stage: outcome.stage });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the outcome"); }
    finally { setSaving(false); }
  }

  return (
    <div className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="border border-border-soft bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowContext(true)} className="inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-white"><Plus size={13} />Meeting context</button>
          <button type="button" onClick={() => generate({ force: true })} disabled={loading} className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} />Regenerate</button>
          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${ai ? "bg-accent-green/10 text-accent-green" : "bg-accent-amber/10 text-accent-amber"}`}>{ai ? "AI grounded" : "Offline fallback"}</span>
        </div>
        {error && <p className="mt-3 border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">{error}</p>}
        {loading && !brief && <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" />Building your brief…</p>}
        {brief && <div className="mt-6 space-y-6">
          <BriefBlock title="Who they are" text={brief.who} />
          <BriefBlock title="Your history" text={brief.ourHistory} />
          <BriefBlock title="What they’re focused on" text={brief.theirFocus} />
          <div><h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Questions to ask</h2><ol className="mt-3 space-y-3">{brief.questions.map((question, index) => <li key={`${question}-${index}`} className="flex gap-3 text-sm leading-relaxed"><span className="font-mono text-xs text-primary">{index + 1}</span><span>{question}</span></li>)}</ol></div>
          <div className="border border-primary/30 bg-primary/5 p-4"><h2 className="text-[11px] font-bold uppercase tracking-wider text-primary">The ask</h2><p className="mt-2 text-sm leading-relaxed">{brief.theAsk}</p></div>
          {brief.redFlags.length > 0 && <div><h2 className="text-[11px] font-bold uppercase tracking-wider text-accent-amber">Watch out</h2><ul className="mt-2 space-y-1 text-sm text-text-secondary">{brief.redFlags.map((flag) => <li key={flag}>• {flag}</li>)}</ul></div>}
          <div className="border-t border-border-soft pt-4"><label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fine-tune</label><div className="mt-2 flex gap-2"><input value={refine} onChange={(event) => setRefine(event.target.value)} placeholder="More on their team, shorten it, sharpen the ask…" className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" /><button type="button" disabled={!refine.trim() || loading} onClick={() => { void generate({ refine, meeting, person }); setRefine(""); }} className="bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Refine</button></div></div>
        </div>}
      </section>

      <aside className="space-y-4">
        <section className="border border-border-soft bg-card p-4"><div className="flex items-center gap-2"><Mail size={15} className="text-primary" /><h2 className="text-sm font-semibold">Draft outreach</h2></div><p className="mt-1 text-xs text-muted-foreground">Generate and review only. Nothing is sent automatically. Uses 1 credit.</p><button type="button" onClick={draftOutreach} disabled={drafting} className="mt-3 inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}{drafting ? "Drafting…" : "Generate draft"}</button>{draft && <div className="mt-3 border border-border bg-background p-3"><p className="text-xs font-semibold">{draft.subject}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{draft.body}</p><button type="button" onClick={copyDraft} className="mt-3 inline-flex items-center gap-1 text-xs text-primary">{copied ? <Check size={12} /> : <Clipboard size={12} />}{copied ? "Copied" : "Copy draft"}</button></div>}</section>

        <section className="border border-border-soft bg-card p-4"><div className="flex items-center gap-2"><Coffee size={15} className="text-primary" /><h2 className="text-sm font-semibold">After the chat</h2></div><p className="mt-1 text-xs text-muted-foreground">Save takeaways to {contactName}’s KithNode record and update the pipeline stage.</p><div className="mt-3 space-y-2"><textarea value={outcome.summary} onChange={(event) => setOutcome({ ...outcome, summary: event.target.value })} rows={2} placeholder="What happened?" className="w-full resize-none border border-border bg-background p-2 text-xs outline-none focus:border-primary/50" /><textarea value={outcome.takeaways} onChange={(event) => setOutcome({ ...outcome, takeaways: event.target.value })} rows={2} placeholder="What did you learn?" className="w-full resize-none border border-border bg-background p-2 text-xs outline-none focus:border-primary/50" /><textarea value={outcome.nextSteps} onChange={(event) => setOutcome({ ...outcome, nextSteps: event.target.value })} rows={2} placeholder="Next steps…" className="w-full resize-none border border-border bg-background p-2 text-xs outline-none focus:border-primary/50" /><select value={outcome.stage} onChange={(event) => setOutcome({ ...outcome, stage: event.target.value })} className="w-full border border-border bg-background p-2 text-xs"><option value="talking">Keep talking</option><option value="met">Met</option><option value="warm">Warm</option></select><button type="button" onClick={saveOutcome} disabled={saving || (!outcome.summary.trim() && !outcome.takeaways.trim() && !outcome.nextSteps.trim())} className="inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{saving ? "Saving…" : saved ? "Saved" : "Save outcome"}</button></div></section>
      </aside>

      {showContext && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={() => setShowContext(false)}><div className="w-full max-w-lg border border-border bg-card p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-semibold">Meeting context</h2><button type="button" onClick={() => setShowContext(false)} aria-label="Close"><X size={16} /></button></div><p className="mt-1 text-xs text-muted-foreground">This context tailors the brief and is treated as information, never as model instructions.</p><div className="mt-4 space-y-2">{(["purpose", "time", "location"] as const).map((field) => <input key={field} value={meeting[field]} onChange={(event) => setMeeting({ ...meeting, [field]: event.target.value })} placeholder={field === "purpose" ? "Purpose of the meeting" : field === "time" ? "When" : "Where"} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />)}<textarea value={person} onChange={(event) => setPerson(event.target.value)} rows={3} placeholder="Anything else you know about them or this conversation…" className="w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" /></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowContext(false)} className="border border-border px-3 py-2 text-xs">Cancel</button><button type="button" onClick={() => { setShowContext(false); void generate({ meeting, person, force: true }); }} className="bg-primary px-3 py-2 text-xs font-semibold text-white">Generate brief</button></div></div></div>}
    </div>
  );
}

function BriefBlock({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return <div><h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">{text}</p></div>;
}
