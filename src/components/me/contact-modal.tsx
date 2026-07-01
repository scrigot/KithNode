"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

// Reusable center-screen contact modal. URL-driven: it renders whenever the URL
// has ?contact=<id>. Mounted once in /me/layout, so any page (server or the
// client pipeline board) opens it just by setting that param. Closing strips it.

interface Memory {
  relationshipType: string;
  strategicValue: string;
  actionItems: string[];
  notes: string;
}
interface PipelineEntry {
  id: string;
  stage: string;
  lastTouchAt: string | null;
  addedAt: string;
  updatedAt: string;
  pipeline: { id: string; name: string; cadenceDays: number | null; stages?: { key: string; label: string }[] };
}
interface Note {
  id: string;
  author: string;
  content: string;
}
interface Activity {
  id: string;
  type: string;
  title: string;
  detail: string;
  occurredAt: string;
  createdAt: string;
}
interface PrepBriefRecord {
  id: string;
  createdAt: string;
  model: string;
  meta: unknown;
}
type DraftMode = "first" | "follow_up";
interface Contact {
  id: string;
  name: string;
  firmName: string | null;
  title: string | null;
  linkedInUrl: string | null;
  email: string | null;
  location: string | null;
  education: string | null;
  industry: string | null;
  seniorityLevel: string | null;
  pastFirms: string | null;
  notes: string;
  memory: Memory | null;
  pipelineEntries: PipelineEntry[];
  enrichmentNotes: Note[];
  activities: Activity[];
  prepBriefs: PrepBriefRecord[];
}

export interface OutreachDefaults {
  style: string;
  length: string;
  signoff: string;
  positioning: string;
  goals: string;
  preferredEmailClient: string;
}

const EDIT_FIELDS: { key: keyof Contact; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "firmName", label: "Company" },
  { key: "email", label: "Email" },
  { key: "linkedInUrl", label: "LinkedIn URL" },
  { key: "location", label: "Location" },
  { key: "education", label: "Education" },
  { key: "industry", label: "Industry" },
  { key: "seniorityLevel", label: "Seniority" },
  { key: "pastFirms", label: "Past firms" },
];
const REL = ["", "buyer", "practitioner", "ecosystem"];
type ContactTab = "profile" | "memory" | "actions" | "timeline";
const normalizeTab = (tab: string | null): ContactTab =>
  tab === "memory" || tab === "actions" || tab === "timeline" ? tab : "profile";
const daysSince = (date: string | null | undefined) =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000) : null;
const fmtDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "never";
const actionItemsOf = (memory: Memory | null) =>
  Array.isArray(memory?.actionItems)
    ? memory.actionItems.filter((item): item is string => typeof item === "string")
    : [];
const FALLBACK_STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "reached_out", label: "Reached Out" },
  { key: "talking", label: "Talking" },
  { key: "met", label: "Met" },
  { key: "warm", label: "Warm" },
];
const ACTIVITY_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "linkedin_connect", label: "LinkedIn connect" },
  { value: "linkedin_message", label: "LinkedIn message" },
  { value: "email_draft", label: "Email draft" },
  { value: "email_sent", label: "Email sent" },
  { value: "reply", label: "Reply" },
  { value: "meeting_scheduled", label: "Meeting scheduled" },
  { value: "coffee_chat", label: "Coffee chat" },
  { value: "follow_up", label: "Follow-up" },
  { value: "stage_change", label: "Stage change" },
  { value: "touch", label: "Touch" },
];
const activityLabel = (type: string) => ACTIVITY_OPTIONS.find((opt) => opt.value === type)?.label || "Activity";
const isDraftMode = (value: string | null): value is DraftMode => value === "first" || value === "follow_up";
const OUTBOUND_ACTIVITY = new Set(["linkedin_connect", "linkedin_message", "email_sent", "email_draft", "follow_up"]);
const REPLY_ACTIVITY = new Set(["reply", "meeting_scheduled", "coffee_chat"]);
function inferContactDraftMode(c: Contact): DraftMode {
  const hasOutbound = c.activities.some((activity) => OUTBOUND_ACTIVITY.has(activity.type));
  const hasReply = c.activities.some((activity) => REPLY_ACTIVITY.has(activity.type));
  const stage = c.pipelineEntries[0]?.stage || "";
  return hasOutbound && !hasReply && ["reached_out", "talking"].includes(stage) ? "follow_up" : "first";
}
function stagesFor(entry: PipelineEntry) {
  return Array.isArray(entry.pipeline.stages) && entry.pipeline.stages.length
    ? entry.pipeline.stages.filter((stage) => stage && typeof stage.key === "string" && typeof stage.label === "string")
    : FALLBACK_STAGES;
}

export default function ContactModalHost({
  pipelines,
  outreachDefaults,
}: {
  pipelines: { id: string; name: string }[];
  outreachDefaults: OutreachDefaults;
}) {
  const id = useSearchParams().get("contact");
  if (!id) return null;
  // No portal needed: the overlay is `position: fixed inset-0`, so it covers the
  // viewport regardless of where it sits in the tree (sibling of <main>).
  return <Modal id={id} pipelines={pipelines} outreachDefaults={outreachDefaults} />;
}

function Modal({
  id,
  pipelines,
  outreachDefaults,
}: {
  id: string;
  pipelines: { id: string; name: string }[];
  outreachDefaults: OutreachDefaults;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [c, setC] = useState<Contact | null>(null);
  const requestedTab = normalizeTab(params.get("contactTab"));
  const requestedDraftMode = isDraftMode(params.get("draftMode")) ? params.get("draftMode") as DraftMode : undefined;
  const [tab, setTab] = useState<ContactTab>(requestedTab);
  const [loading, setLoading] = useState(true);

  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("contact");
    next.delete("contactTab");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [params, pathname, router]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setTab(requestedTab);
    fetch(`/api/me/contacts/${id}`)
      .then((r) => r.json())
      .then((d) => live && setC(d.contact ?? null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, requestedTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl border border-[#38332F] bg-[#1F1C1B] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !c ? (
          <div className="p-10 text-center text-[#8A8077] text-sm">{loading ? "Loading…" : "Not found"}</div>
        ) : (
          <>
            <header className="px-6 pt-5 pb-3 border-b border-[#38332F] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight truncate">{c.name}</h2>
                <p className="text-[13px] text-[#9C948C] truncate">
                  {[c.title, c.firmName].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <button onClick={close} className="text-[#8A8077] hover:text-white text-lg leading-none">✕</button>
            </header>

            <nav className="px-6 flex gap-1 border-b border-[#38332F]">
              {(["profile", "memory", "actions", "timeline"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-[13px] -mb-px border-b-2 capitalize transition-colors ${
                    tab === t ? "border-[#E8643C] text-white" : "border-transparent text-[#9C948C] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            <div className="overflow-y-auto px-6 py-5">
              <ContactSnapshot c={c} />
              {tab === "profile" && <ProfileTab c={c} onSaved={(nc) => { setC(nc); router.refresh(); }} />}
              {tab === "memory" && <MemoryTab c={c} onSaved={(m) => setC({ ...c, memory: m })} />}
              {tab === "actions" && <ActionsTab c={c} pipelines={pipelines} outreachDefaults={outreachDefaults} requestedDraftMode={requestedDraftMode} onContactChange={setC} onChange={() => router.refresh()} />}
              {tab === "timeline" && <TimelineTab c={c} onContactChange={setC} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ContactSnapshot({ c }: { c: Contact }) {
  const rel = c.memory?.relationshipType || "untyped";
  const nextAction = actionItemsOf(c.memory)[0];
  const touches = c.pipelineEntries.map((e) => daysSince(e.lastTouchAt)).filter((v): v is number => v != null);
  const lastTouch = touches.length ? Math.min(...touches) : null;
  return (
    <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="rounded-xl border border-[#38332F] bg-[#161413] px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#6F665E]">Type</p>
        <p className="mt-1 text-[13px] text-[#E7E1DB] capitalize">{rel}</p>
      </div>
      <div className="rounded-xl border border-[#38332F] bg-[#161413] px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#6F665E]">Last touch</p>
        <p className="mt-1 text-[13px] text-[#E7E1DB]">{lastTouch == null ? "No touch logged" : `${lastTouch}d ago`}</p>
      </div>
      <div className="rounded-xl border border-[#38332F] bg-[#161413] px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#6F665E]">Next action</p>
        <p className="mt-1 text-[13px] text-[#E7E1DB] truncate">{nextAction || "None set"}</p>
      </div>
    </div>
  );
}

function ProfileTab({ c, onSaved }: { c: Contact; onSaved: (c: Contact) => void }) {
  const [form, setForm] = useState<Record<string, string>>(
    { ...Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, (c[f.key] as string) || ""])), notes: c.notes || "" },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/me/contacts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok && d.contact) {
      onSaved({ ...c, ...d.contact });
      setSaved(true);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {EDIT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">{f.label}</span>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false); }}
              className="mt-1 w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
            />
          </label>
        ))}
      </div>
      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Profile notes</span>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => { setForm({ ...form, notes: e.target.value }); setSaved(false); }}
          rows={3}
          className="mt-1 w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C] resize-none"
        />
      </label>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={save} disabled={saving} className="rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-[12px] text-[#7FB069]">saved ✓</span>}
      </div>
    </div>
  );
}

function MemoryTab({ c, onSaved }: { c: Contact; onSaved: (m: Memory) => void }) {
  const [rel, setRel] = useState(c.memory?.relationshipType || "");
  const [strat, setStrat] = useState(c.memory?.strategicValue || "");
  const [notes, setNotes] = useState(c.memory?.notes || "");
  const [actionItems, setActionItems] = useState<string[]>(actionItemsOf(c.memory));
  const [newAction, setNewAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Oldest → newest for natural reading; the API returns newest-first.
  const [thread, setThread] = useState<{ author: string; content: string }[]>(
    [...c.enrichmentNotes].reverse().map((n) => ({ author: n.author, content: n.content })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function saveSummary() {
    setSaving(true); setSaved(false);
    const res = await fetch(`/api/me/contacts/${c.id}/memory`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationshipType: rel, strategicValue: strat, notes, actionItems }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      onSaved({
        relationshipType: d.memory?.relationshipType || rel,
        strategicValue: d.memory?.strategicValue || strat,
        actionItems: Array.isArray(d.memory?.actionItems) ? d.memory.actionItems : actionItems,
        notes: d.memory?.notes || notes,
      });
      setSaved(true);
    }
  }

  function addActionItem() {
    const item = newAction.trim();
    if (!item) return;
    setActionItems((items) => [...items, item]);
    setNewAction("");
    setSaved(false);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setThread((t) => [...t, { author: "user", content: msg }]);
    setInput("");
    setSending(true);
    const res = await fetch(`/api/me/contacts/${c.id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }),
    });
    const d = await res.json();
    setSending(false);
    if (res.ok) {
      setThread((t) => [...t, { author: "assistant", content: d.reply }]);
      if (d.memory) {
        setRel(d.memory.relationshipType || "");
        setStrat(d.memory.strategicValue || "");
        setNotes(d.memory.notes || "");
        const nextActions = Array.isArray(d.memory.actionItems) ? d.memory.actionItems : actionItems;
        setActionItems(nextActions);
        onSaved({
          relationshipType: d.memory.relationshipType || "",
          strategicValue: d.memory.strategicValue || "",
          actionItems: nextActions,
          notes: d.memory.notes || "",
        });
      }
    } else {
      setThread((t) => [...t, { author: "assistant", content: d.error || "Something went wrong." }]);
    }
  }

  return (
    <div className="space-y-4">
      {/* Chatbot enrichment */}
      <div>
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Enrich via chat</span>
        <div className="mt-1 rounded-xl border border-[#38332F] bg-[#161413] p-3 max-h-52 overflow-y-auto space-y-2">
          {thread.length === 0 ? (
            <p className="text-[13px] text-[#6F665E]">
              Tell me anything about {c.name.split(" ")[0]} — how you met, what they care about, what to remember. I&rsquo;ll file it into their memory.
            </p>
          ) : (
            thread.map((m, i) => (
              <div key={i} className={m.author === "user" ? "text-right" : ""}>
                <span className={`inline-block rounded-lg px-2.5 py-1.5 text-[13px] ${m.author === "user" ? "bg-[#E8643C]/15 text-[#E7E1DB]" : "bg-[#2E2A27] text-[#C9C2BB]"}`}>
                  {m.content}
                </span>
              </div>
            ))
          )}
          {sending && <p className="text-[12px] text-[#6F665E]">thinking…</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`What should I remember about ${c.name.split(" ")[0]}?`}
            className="flex-1 rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]"
          />
          <button onClick={send} disabled={sending || !input.trim()} className="rounded-lg bg-[#E8643C] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      {/* Editable summary (the chat updates these; you can also edit directly) */}
      <div className="space-y-3 pt-3 border-t border-[#2E2A27]">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Relationship type</span>
            <select value={rel} onChange={(e) => { setRel(e.target.value); setSaved(false); }}
              className="mt-1 w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]">
              {REL.map((r) => <option key={r} value={r}>{r || "—"}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Strategic value</span>
            <input value={strat} onChange={(e) => { setStrat(e.target.value); setSaved(false); }}
              placeholder="why this person matters"
              className="mt-1 w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C]" />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Notes</span>
          <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={4}
            placeholder="context, history, anything to remember"
            className="mt-1 w-full rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[14px] text-white outline-none focus:border-[#E8643C] resize-none" />
        </label>
        <div>
          <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Action items</span>
          <div className="mt-1 space-y-1.5">
            {actionItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#38332F] px-3 py-2 text-[12px] text-[#6F665E]">No next actions yet.</p>
            ) : (
              actionItems.map((item, i) => (
                <div key={`${item}-${i}`} className="flex items-center gap-2 rounded-lg border border-[#38332F] bg-[#161413] px-3 py-2">
                  <input
                    value={item}
                    onChange={(e) => { setActionItems((items) => items.map((x, idx) => idx === i ? e.target.value : x)); setSaved(false); }}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#E7E1DB] outline-none"
                  />
                  <button
                    onClick={() => { setActionItems((items) => items.filter((_, idx) => idx !== i)); setSaved(false); }}
                    className="text-[12px] text-[#6F665E] hover:text-[#E8643C]"
                    title="Remove action item"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addActionItem()}
              placeholder="Add a next action..."
              className="flex-1 rounded-lg bg-[#161413] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
            />
            <button onClick={addActionItem} className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
              Add
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveSummary} disabled={saving} className="rounded-lg border border-[#38332F] px-4 py-2 text-sm text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save edits"}
          </button>
          {saved && <span className="text-[12px] text-[#7FB069]">saved ✓</span>}
        </div>
      </div>
    </div>
  );
}

function ActionsTab({
  c,
  pipelines,
  outreachDefaults,
  requestedDraftMode,
  onContactChange,
  onChange,
}: {
  c: Contact;
  pipelines: { id: string; name: string }[];
  outreachDefaults: OutreachDefaults;
  requestedDraftMode?: DraftMode;
  onContactChange: (c: Contact) => void;
  onChange: () => void;
}) {
  const [draft, setDraft] = useState<{ subject: string; body: string; mode?: DraftMode } | null>(null);
  const [draftMode, setDraftMode] = useState<DraftMode>(requestedDraftMode || inferContactDraftMode(c));
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ name: string } | null>(null);
  const [style, setStyle] = useState(outreachDefaults.style || "warm, curious, humble");
  const [length, setLength] = useState(outreachDefaults.length || "short");
  const [framing, setFraming] = useState({
    whyThisPerson: "",
    desiredOutcome: outreachDefaults.goals || "",
    sharedContext: "",
    specificAsk: "",
    constraints: "",
  });
  const [refine, setRefine] = useState("");
  const [replyDetail, setReplyDetail] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [meetingContext, setMeetingContext] = useState("");
  const inPipe = new Set([...c.pipelineEntries.map((e) => e.pipeline.id), ...added]);

  async function genDraft(mode: DraftMode = draftMode, refineOnly = false) {
    setDraftMode(mode);
    setDrafting(true);
    const res = await fetch("/api/me/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: c.id,
        mode,
        style,
        length,
        framing,
        signoff: outreachDefaults.signoff,
        positioning: outreachDefaults.positioning,
        goals: outreachDefaults.goals,
        refine: refineOnly ? refine : "",
        previousDraft: refineOnly ? draft : null,
      }),
    });
    const d = await res.json();
    setDrafting(false);
    if (res.ok) {
      setDraft(d);
      if (refineOnly) setRefine("");
    }
  }
  const gmailUrl = draft ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email || "")}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}` : "";
  const outlookUrl = draft ? `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(c.email || "")}&subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}` : "";
  const mailtoUrl = draft ? `mailto:${encodeURIComponent(c.email || "")}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}` : "";
  const emailButtons = [
    { key: "gmail", label: "Open Gmail", href: gmailUrl },
    { key: "outlook", label: "Open Outlook", href: outlookUrl },
    { key: "mail", label: "Open mail app", href: mailtoUrl },
  ].sort((a, b) => (a.key === (outreachDefaults.preferredEmailClient || "gmail") ? -1 : b.key === (outreachDefaults.preferredEmailClient || "gmail") ? 1 : 0));

  async function createActivity(type: string, title: string, detail = "", update = true): Promise<Activity | null> {
    const res = await fetch(`/api/me/contacts/${c.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, detail }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.activity) {
      if (update) onContactChange({ ...c, activities: [data.activity, ...c.activities] });
      return data.activity as Activity;
    }
    return null;
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    await createActivity("email_draft", "Copied outreach draft", `Subject: ${draft.subject}\n\n${draft.body}`);
  }

  function handleOpenDraft(label: string) {
    if (!draft) return;
    void createActivity("email_draft", `Opened draft in ${label.replace("Open ", "")}`, `Subject: ${draft.subject}\n\n${draft.body}`, false);
  }

  async function moveEntry(entryId: string, stage: string, touch = false, extraActivities: Activity[] = []) {
    setMovingId(entryId);
    const res = await fetch(`/api/me/pipelines/entry/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, touch }),
    });
    setMovingId(null);
    if (res.ok) {
      const now = new Date().toISOString();
      onContactChange({
        ...c,
        pipelineEntries: c.pipelineEntries.map((entry) =>
          entry.id === entryId
            ? { ...entry, stage, lastTouchAt: touch ? now : entry.lastTouchAt, updatedAt: now }
            : entry,
        ),
        activities: [...extraActivities, ...c.activities],
      });
      onChange();
    }
  }

  async function markActivityAndStage(type: string, title: string, stage: string, detail = "") {
    setLogged(title);
    const activity = await createActivity(type, title, detail, false);
    const entry = c.pipelineEntries[0];
    if (entry) await moveEntry(entry.id, stage, true, activity ? [activity] : []);
    else if (activity) onContactChange({ ...c, activities: [activity, ...c.activities] });
    setTimeout(() => setLogged(null), 1500);
  }

  function markReachedOut() {
    void markActivityAndStage("touch", "Marked reached out", "reached_out");
  }
  function markDraftSent() {
    const isFollowUp = draftMode === "follow_up";
    void markActivityAndStage(
      isFollowUp ? "follow_up" : "email_sent",
      isFollowUp ? "Sent follow-up" : "Sent outreach email",
      "reached_out",
      draft ? `Subject: ${draft.subject}\n\n${draft.body}` : "",
    );
  }
  function logReply() {
    void markActivityAndStage("reply", "Logged reply", "talking", replyDetail.trim());
    setReplyDetail("");
  }
  function logMeetingScheduled() {
    const detail = [
      meetingAt ? `When: ${new Date(meetingAt).toLocaleString()}` : "",
      meetingContext.trim() ? `Context: ${meetingContext.trim()}` : "",
      replyDetail.trim() ? `Reply: ${replyDetail.trim()}` : "",
    ].filter(Boolean).join("\n");
    void markActivityAndStage("meeting_scheduled", "Coffee chat scheduled", "talking", detail);
    setMeetingAt("");
    setMeetingContext("");
    setReplyDetail("");
  }
  function logCoffeeChat() {
    const detail = [
      meetingAt ? `When: ${new Date(meetingAt).toLocaleString()}` : "",
      meetingContext.trim() ? meetingContext.trim() : "",
    ].filter(Boolean).join("\n");
    void markActivityAndStage("coffee_chat", "Coffee chat completed", "met", detail);
    setMeetingAt("");
    setMeetingContext("");
  }
  async function addTo(pipelineId: string, name: string) {
    setPendingId(pipelineId);
    const res = await fetch("/api/me/pipelines/entry", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pipelineId, contactId: c.id }),
    });
    setPendingId(null);
    if (res.ok) {
      setAdded((s) => new Set(s).add(pipelineId));
      setConfirm({ name });
      onChange();
    }
  }
  async function touchEntry(entryId: string) {
    setTouchingId(entryId);
    const res = await fetch(`/api/me/pipelines/entry/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ touch: true }),
    });
    setTouchingId(null);
    if (res.ok) {
      const now = new Date().toISOString();
      onContactChange({
        ...c,
        pipelineEntries: c.pipelineEntries.map((entry) =>
          entry.id === entryId ? { ...entry, lastTouchAt: now, updatedAt: now } : entry,
        ),
      });
      onChange();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {c.linkedInUrl && (
          <a href={c.linkedInUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-[#E8643C]">Open LinkedIn ↗</a>
        )}
        <Link href={`/me/prep/${c.id}`} className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-[#E8643C]">Coffee-chat prep →</Link>
        <button onClick={() => genDraft("first", false)} disabled={drafting} className="rounded-lg bg-[#E8643C] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">
          {drafting && draftMode === "first" ? "Drafting…" : "✉ First draft"}
        </button>
        <button onClick={() => genDraft("follow_up", false)} disabled={drafting} className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50">
          {drafting && draftMode === "follow_up" ? "Drafting…" : "Follow-up draft"}
        </button>
      </div>

      <div className="rounded-xl border border-[#38332F] bg-[#161413] p-4">
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Draft controls</span>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Writing style</span>
            <select value={style} onChange={(e) => setStyle(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]">
              <option>warm, curious, humble</option>
              <option>direct but friendly</option>
              <option>casual student coffee chat</option>
              <option>polished and professional</option>
              <option>short LinkedIn message style</option>
            </select>
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Length</span>
            <select value={length} onChange={(e) => setLength(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]">
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FramingInput label="Why this person?" value={framing.whyThisPerson} onChange={(v) => setFraming({ ...framing, whyThisPerson: v })} placeholder="Their AI/data work, role, company..." />
          <FramingInput label="Desired outcome" value={framing.desiredOutcome} onChange={(v) => setFraming({ ...framing, desiredOutcome: v })} placeholder="Coffee chat, advice, intro..." />
          <FramingInput label="Shared context / hook" value={framing.sharedContext} onChange={(v) => setFraming({ ...framing, sharedContext: v })} placeholder="UNC, mutuals, Comfort, article..." />
          <FramingInput label="Specific ask" value={framing.specificAsk} onChange={(v) => setFraming({ ...framing, specificAsk: v })} placeholder="15 minutes next week..." />
          <label className="sm:col-span-2">
            <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Constraints</span>
            <input value={framing.constraints} onChange={(e) => setFraming({ ...framing, constraints: e.target.value })}
              placeholder="No pitch, mention student, keep it low pressure..."
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]" />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[#38332F] bg-[#161413] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Reply / scheduling handoff</span>
            <p className="mt-1 text-[12px] text-[#6F665E]">Capture the response and meeting context before jumping into prep.</p>
          </div>
          <Link href={`/me/prep/${c.id}`} className="shrink-0 rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
            Prep
          </Link>
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Reply text / notes</span>
          <textarea
            value={replyDetail}
            onChange={(e) => setReplyDetail(e.target.value)}
            rows={3}
            placeholder="Paste their reply, availability, or what they said..."
            className="mt-1 w-full resize-none rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
          />
        </label>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Meeting time</span>
            <input
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
            />
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">Prep context</span>
            <input
              value={meetingContext}
              onChange={(e) => setMeetingContext(e.target.value)}
              placeholder="What to ask, where you met, what they care about..."
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={logReply}
            disabled={movingId != null || !replyDetail.trim()}
            className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50"
          >
            Log reply
          </button>
          <button
            onClick={logMeetingScheduled}
            disabled={movingId != null || (!meetingAt && !meetingContext.trim() && !replyDetail.trim())}
            className="rounded-lg border border-[#E8A23C]/50 px-3 py-2 text-[12px] text-[#F0C170] hover:bg-[#E8A23C]/10 disabled:opacity-50"
          >
            Coffee chat booked
          </button>
          <button
            onClick={logCoffeeChat}
            disabled={movingId != null || (!meetingContext.trim() && !meetingAt)}
            className="rounded-lg border border-[#7FB069]/50 px-3 py-2 text-[12px] text-[#A9D19A] hover:bg-[#7FB069]/10 disabled:opacity-50"
          >
            Mark chat complete
          </button>
        </div>
      </div>

      <div>
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Pipeline status</span>
        <div className="mt-2 space-y-2">
          {c.pipelineEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#38332F] px-4 py-3 text-[13px] text-[#6F665E]">Not tracked in any pipeline yet.</p>
          ) : (
            c.pipelineEntries.map((entry) => {
              const coldDays = daysSince(entry.lastTouchAt);
              const isCold = coldDays != null && entry.pipeline.cadenceDays != null && coldDays > entry.pipeline.cadenceDays;
              return (
                <div key={entry.id} className="rounded-xl border border-[#38332F] bg-[#161413] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{entry.pipeline.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#8A8077]">
                        Added {fmtDate(entry.addedAt)} · touched {fmtDate(entry.lastTouchAt)}
                        {coldDays != null ? ` (${coldDays}d ago)` : ""}
                        {isCold ? " · cold" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={entry.stage}
                        onChange={(e) => moveEntry(entry.id, e.target.value, true)}
                        disabled={movingId === entry.id}
                        className="rounded-lg border border-[#38332F] bg-[#1F1C1B] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] outline-none hover:border-[#E8643C] disabled:opacity-50"
                      >
                        {stagesFor(entry).map((stage) => (
                          <option key={stage.key} value={stage.key}>{stage.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => touchEntry(entry.id)}
                        disabled={touchingId === entry.id}
                        className="rounded-lg border border-[#38332F] px-3 py-1.5 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50"
                      >
                        {touchingId === entry.id ? "Touching..." : "Touch"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Add to pipeline</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {pipelines.map((p) => (
            <button key={p.id} onClick={() => addTo(p.id, p.name)} disabled={inPipe.has(p.id) || pendingId === p.id}
              className="rounded-full border border-[#38332F] px-3 py-1 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] disabled:opacity-40 disabled:cursor-default">
              {inPipe.has(p.id) ? `${p.name} ✓` : pendingId === p.id ? `${p.name}…` : `+ ${p.name}`}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation after adding, with a jump to the board. */}
      {confirm && (
        <div className="rounded-xl border border-[#7FB069]/40 bg-[#7FB069]/[0.08] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px] text-[#E7E1DB]">
            Added <span className="font-medium">{c.name}</span> to <span className="font-medium">{confirm.name}</span>.
          </span>
          <Link href="/me/pipelines" className="shrink-0 rounded-lg bg-[#7FB069] px-3 py-1.5 text-[12px] font-medium text-[#10231A] hover:bg-[#71a05d]">
            View pipeline →
          </Link>
        </div>
      )}

      {draft && (
        <div className="rounded-xl border border-[#38332F] bg-[#161413] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-white">{draft.subject}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#6F665E]">{draftMode === "follow_up" ? "follow-up draft" : "first outreach draft"}</p>
            </div>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#E7E1DB] whitespace-pre-wrap">{draft.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copyDraft} className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
              {copied ? "Copied" : "Copy"}
            </button>
            {emailButtons.map((button) => (
              <a
                key={button.key}
                href={button.href}
                target={button.key === "mail" ? undefined : "_blank"}
                rel={button.key === "mail" ? undefined : "noreferrer"}
                onClick={() => handleOpenDraft(button.label)}
                className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white"
              >
                {button.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={markDraftSent}
              disabled={movingId != null}
              className="rounded-lg border border-[#7FB069]/50 px-3 py-2 text-[12px] text-[#A9D19A] hover:bg-[#7FB069]/10 disabled:opacity-50"
            >
              {draftMode === "follow_up" ? "Mark follow-up sent" : "Mark email sent"}
            </button>
            <button
              onClick={() => markActivityAndStage("linkedin_message", "Sent LinkedIn message", "reached_out", draft?.body || "")}
              disabled={movingId != null}
              className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50"
            >
              Mark LinkedIn sent
            </button>
            <button
              onClick={logReply}
              disabled={movingId != null || !replyDetail.trim()}
              className="rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50"
            >
              Log reply
            </button>
            {logged && <span className="self-center text-[12px] text-[#7FB069]">{logged}</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={refine} onChange={(e) => setRefine(e.target.value)}
              placeholder="Refine: shorter, warmer, more specific, mention UNC..."
              className="min-w-0 flex-1 rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]" />
            <button onClick={() => genDraft(draftMode, true)} disabled={drafting || !refine.trim()}
              className="rounded-lg bg-[#E8643C] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50">
              Refine
            </button>
          </div>
          {c.pipelineEntries.length > 0 && (
            <button
              onClick={markReachedOut}
              disabled={movingId != null}
              className="mt-3 rounded-lg border border-[#38332F] px-3 py-2 text-[12px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white disabled:opacity-50"
            >
              Mark reached out + touched
            </button>
          )}
        </div>
      )}

      <div>
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Recent prep briefs</span>
        <div className="mt-2 space-y-2">
          {c.prepBriefs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#38332F] px-4 py-3 text-[13px] text-[#6F665E]">No prep briefs generated yet.</p>
          ) : (
            c.prepBriefs.map((brief) => (
              <Link key={brief.id} href={`/me/prep/${c.id}`} className="block rounded-xl border border-[#38332F] bg-[#161413] px-4 py-3 hover:border-[#E8643C]/50">
                <p className="text-[13px] text-white">Prep brief · {fmtDate(brief.createdAt)}</p>
                <p className="mt-0.5 text-[11px] text-[#8A8077]">{brief.model || "fallback"}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FramingInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="text-[11px] uppercase tracking-wide text-[#6F665E]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
      />
    </label>
  );
}

function TimelineTab({ c, onContactChange }: { c: Contact; onContactChange: (c: Contact) => void }) {
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function addActivity() {
    const trimmedTitle = title.trim();
    const trimmedDetail = detail.trim();
    if (!trimmedTitle && !trimmedDetail) return;
    setSaving(true);
    const res = await fetch(`/api/me/contacts/${c.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title: trimmedTitle, detail: trimmedDetail }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && data.activity) {
      onContactChange({ ...c, activities: [data.activity, ...c.activities] });
      setTitle("");
      setDetail("");
      setType("note");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#38332F] bg-[#161413] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Coffee chat booked, sent follow-up, connected on LinkedIn..."
              className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C]"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">Detail</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="What happened? What did you send? What should future-you know?"
            className="mt-1 w-full rounded-lg bg-[#1F1C1B] border border-[#38332F] px-3 py-2 text-[13px] text-white outline-none focus:border-[#E8643C] resize-none"
          />
        </label>
        <button
          onClick={addActivity}
          disabled={saving || (!title.trim() && !detail.trim())}
          className="mt-3 rounded-lg bg-[#E8643C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f] disabled:opacity-50"
        >
          {saving ? "Logging..." : "Log activity"}
        </button>
      </div>

      <div>
        <span className="text-[11px] uppercase tracking-wide text-[#8A8077]">History</span>
        <div className="mt-2 space-y-2">
          {c.activities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#38332F] px-4 py-4 text-[13px] text-[#6F665E]">
              No activity logged yet. Drafts, stage moves, touches, and manual notes will appear here.
            </p>
          ) : (
            c.activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-[#38332F] bg-[#161413] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">{activity.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#8A8077]">
                      {activityLabel(activity.type)} · {fmtDate(activity.occurredAt)}
                    </p>
                  </div>
                </div>
                {activity.detail && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#B7AFA7]">{activity.detail}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
