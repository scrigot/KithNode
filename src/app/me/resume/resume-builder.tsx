"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TRACKS, type Track, type DimensionScore, type GradedResume } from "@/lib/me/grade-resume";
import type { LintWarning } from "@/lib/me/resume-text";
import {
  normalizeDoc,
  emptySection,
  emptyDoc,
  type ResumeDoc,
  type ResumeSection,
  type SectionType,
  type EntriesSection,
  type EducationSection,
  type SkillsSection,
  type ListSection,
  type TextSection,
  type SkillCategory,
} from "@/lib/me/resume-doc";
import { TEMPLATES, ResumePaper, reorderToRecommended } from "./templates";

const c = { panel: "#232020", raised: "#2E2A27", border: "#38332F", text: "#C9C2BB", dim: "#8A8077", accent: "#E8643C" };
const inputStyle = { background: c.raised, border: `1px solid ${c.border}`, color: c.text } as const;
const scoreColor = (n: number) => (n >= 70 ? "#4FA86A" : n >= 45 ? "#D9A441" : "#D2604A");

let _uid = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${_uid++}`;

function moveInArray<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// Small up/down/remove control row reused by every entry/item editor.
function RowControls({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onUp} title="Move up" style={{ color: c.dim }}>↑</button>
      <button onClick={onDown} title="Move down" style={{ color: c.dim }}>↓</button>
      <button onClick={onRemove} className="text-[10px]" style={{ color: c.dim }}>Remove</button>
    </div>
  );
}

const ADDABLE: SectionType[] = ["summary", "experience", "projects", "education", "skills", "leadership", "volunteering", "awards", "certifications", "publications", "custom"];

interface Note { dimension: string; feedback: string; suggestions: string[] }
interface Rewrite { before: string; after: string }
type GradeResponse = GradedResume & { lint?: LintWarning[]; notes?: { notes: Note[]; rewrites: Rewrite[] }; signals?: unknown };
interface Evidence { id: string; kind: string; title: string; detail: string; metric: string; proofUrl: string }
interface TailorResult { before: number; after: number; gain: number; rewrites: { before: string; after: string; ok: boolean; reason?: string }[]; missingEvidence: string[] }
interface SavedResume { id: string; title: string; track: string; templateId: string; content: unknown; userContext?: string }

export default function ResumeBuilder({ initial }: { initial: SavedResume | null }) {
  const [id, setId] = useState<string | null>(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? "Untitled resume");
  const [track, setTrack] = useState<Track>((initial?.track as Track) ?? "ai-consulting");
  const [templateId, setTemplateId] = useState(initial?.templateId ?? "dense");
  const [userContext, setUserContext] = useState(initial?.userContext ?? "");
  const [doc, setDoc] = useState<ResumeDoc>(() => normalizeDoc(initial?.content ?? null));

  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [lint, setLint] = useState<LintWarning[]>([]);
  const [notes, setNotes] = useState<{ notes: Note[]; rewrites: Rewrite[] }>({ notes: [], rewrites: [] });
  const [scoring, setScoring] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [jd, setJd] = useState("");
  const [tailor, setTailor] = useState<TailorResult | null>(null);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [resumes, setResumes] = useState<(SavedResume & { score?: number })[]>([]);
  const [zoom, setZoom] = useState(0.8);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the reusable evidence bank once.
  useEffect(() => {
    fetch("/api/me/resume/evidence").then((r) => (r.ok ? r.json() : { evidence: [] })).then((d) => setEvidence(d.evidence ?? [])).catch(() => {});
  }, []);

  const refreshResumes = useCallback(() => {
    fetch("/api/me/resume/list").then((r) => (r.ok ? r.json() : { resumes: [] })).then((d) => setResumes(d.resumes ?? [])).catch(() => {});
  }, []);
  useEffect(() => { refreshResumes(); }, [refreshResumes]);

  const rescore = useCallback(async (nextDoc: ResumeDoc, nextTrack: Track) => {
    setScoring(true);
    try {
      const res = await fetch("/api/me/resume/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextDoc, track: nextTrack, withNotes: false }),
      });
      if (res.ok) {
        const g: GradeResponse = await res.json();
        setGrade(g); // keep previous gauge visible until this resolves (no reset to 0)
        setLint(g.lint ?? []);
      }
    } finally {
      setScoring(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => rescore(doc, track), 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [doc, track, rescore]);

  async function getFeedback() {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/me/resume/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc, track, userContext, withNotes: true }),
      });
      if (res.ok) {
        const g: GradeResponse = await res.json();
        setGrade(g);
        setLint(g.lint ?? []);
        if (g.notes) setNotes(g.notes);
      }
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function runTailor() {
    if (!jd.trim()) return;
    setTailorLoading(true);
    try {
      const res = await fetch("/api/me/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc, track, jobDescription: jd }),
      });
      if (res.ok) setTailor(await res.json());
    } finally {
      setTailorLoading(false);
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await fetch("/api/me/resume/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64, track, withNotes: true }),
      });
      if (res.ok) {
        const g: GradeResponse & { signals?: unknown } = await res.json();
        if (g.signals) setDoc(normalizeDoc(signalsToV1(g.signals))); // prefill the editor
        setGrade(g);
        if (g.notes) setNotes(g.notes);
      } else {
        const e = await res.json().catch(() => ({}));
        window.alert(e.error || "Could not read that PDF");
      }
    } finally {
      setUploading(false);
    }
  }

  async function save(): Promise<string | null> {
    const res = await fetch("/api/me/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, track, templateId, content: doc, docVersion: 2, userContext, score: grade?.overall ?? 0, dimensions: grade?.dimensions ?? [], notes }),
    });
    if (!res.ok) return null;
    const { resume } = await res.json();
    setId(resume.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refreshResumes();
    return resume.id as string;
  }

  async function exportPdf() {
    const savedId = id ?? (await save());
    if (savedId) window.open(`/me/resume/print/${savedId}`, "_blank");
  }

  // Load a saved resume into the editor, saving the current one first (no data loss).
  async function switchTo(r: SavedResume & { score?: number }) {
    if (r.id === id) return;
    await save();
    setId(r.id);
    setTitle(r.title);
    setTrack((r.track as Track) ?? "ai-consulting");
    setTemplateId(r.templateId ?? "dense");
    setUserContext(r.userContext ?? "");
    setDoc(normalizeDoc(r.content));
    setNotes({ notes: [], rewrites: [] });
    setTailor(null);
    setSelectedSection(null);
  }

  async function newResume() {
    await save();
    setId(null);
    setTitle("Untitled resume");
    setDoc(emptyDoc());
    setUserContext("");
    setNotes({ notes: [], rewrites: [] });
    setTailor(null);
    setSelectedSection(null);
  }

  // ── section ops ──────────────────────────────────────────────────────────
  const setSections = (sections: ResumeSection[]) => setDoc({ ...doc, sections });
  const patchSection = (sid: string, next: ResumeSection) => setSections(doc.sections.map((s) => (s.id === sid ? next : s)));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= doc.sections.length) return;
    const next = [...doc.sections];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSections(next);
  };
  const addSection = (type: SectionType) => {
    const s = emptySection(type, uid(type));
    setDoc({ ...doc, sections: [...doc.sections, s] });
    setSelectedSection(s.id);
  };

  return (
    <div className="min-h-screen" style={{ background: "#1C1A19", color: c.text }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: c.border, background: c.panel }}>
        <select
          value={id ?? ""}
          onChange={(e) => { const r = resumes.find((x) => x.id === e.target.value); if (r) switchTo(r); }}
          className="text-[12px] rounded-md px-2 py-1.5 outline-none max-w-[180px]"
          style={inputStyle}
          title="Switch resume"
        >
          {!id && <option value="">Untitled (unsaved)</option>}
          {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <button onClick={newResume} className="text-[12px] rounded-md px-3 py-1.5" style={inputStyle} title="Start a new resume">+ New</button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent text-[15px] font-semibold outline-none flex-1 min-w-0" style={{ color: "#fff" }} />
        <select value={track} onChange={(e) => setTrack(e.target.value as Track)} className="text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle}>
          {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle}>
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button onClick={() => setDoc(reorderToRecommended(doc, templateId))} className="text-[12px] rounded-md px-3 py-1.5" style={{ ...inputStyle }} title="Reorder sections to the recruiter-recommended order for this template">
          Reset order
        </button>
        <label className="text-[12px] rounded-md px-3 py-1.5 cursor-pointer" style={inputStyle}>
          {uploading ? "Reading…" : "Upload PDF"}
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
        <button onClick={save} className="text-[12px] rounded-md px-3 py-1.5" style={{ ...inputStyle, color: "#fff" }}>{saved ? "Saved ✓" : "Save"}</button>
        <button onClick={exportPdf} className="text-[12px] rounded-md px-3 py-1.5 font-semibold" style={{ background: c.accent, color: "#fff" }}>Export PDF</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 380px minmax(0,1fr)" }}>
        {/* LEFT — editor */}
        <div className="p-5 space-y-3 overflow-auto" style={{ borderRight: `1px solid ${c.border}`, maxHeight: "calc(100vh - 52px)" }}>
          <HeaderEditor doc={doc} setDoc={setDoc} />
          <ContextEditor userContext={userContext} setUserContext={setUserContext} />
          <EvidenceBank evidence={evidence} setEvidence={setEvidence} />

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-[12px] font-semibold" style={{ color: "#fff" }}>Sections</h3>
            <AddSectionMenu onAdd={addSection} />
          </div>
          {doc.sections.map((s, i) => (
            <SectionCard
              key={s.id}
              section={s}
              selected={selectedSection === s.id}
              onSelect={() => setSelectedSection(selectedSection === s.id ? null : s.id)}
              onChange={(next) => patchSection(s.id, next)}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onToggle={() => patchSection(s.id, { ...s, visible: !s.visible })}
              onRemove={() => setSections(doc.sections.filter((x) => x.id !== s.id))}
            />
          ))}
        </div>

        {/* MIDDLE — command center for the selected problem */}
        <div className="p-5 space-y-4 overflow-auto" style={{ borderRight: `1px solid ${c.border}`, maxHeight: "calc(100vh - 52px)" }}>
          <ScorePanel grade={grade} scoring={scoring} />
          <LintPanel lint={lint} onJump={(sid) => setSelectedSection(sid)} />
          <button onClick={getFeedback} disabled={feedbackLoading} className="w-full text-[12px] rounded-md px-3 py-2 font-semibold" style={{ background: c.accent, color: "#fff", opacity: feedbackLoading ? 0.6 : 1 }}>
            {feedbackLoading ? "Analyzing…" : "Get recruiter feedback (AI)"}
          </button>
          {(notes.notes.length > 0 || notes.rewrites.length > 0) && <FeedbackPanel notes={notes} doc={doc} setDoc={setDoc} stale={scoring} />}
          <TailorPanel jd={jd} setJd={setJd} run={runTailor} loading={tailorLoading} result={tailor} doc={doc} setDoc={setDoc} />
        </div>

        {/* RIGHT — live preview */}
        <div className="overflow-auto" style={{ background: "#15110F", maxHeight: "calc(100vh - 52px)" }}>
          <div className="sticky top-0 z-10 flex items-center justify-center gap-1.5 px-3 py-2" style={{ background: "#15110F", borderBottom: `1px solid ${c.border}` }}>
            <button onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))} className="text-[13px] rounded px-2 py-0.5 leading-none" style={inputStyle} title="Zoom out">−</button>
            <button onClick={() => setZoom(0.8)} className="text-[11px] rounded px-2 py-1 leading-none tabular-nums" style={{ ...inputStyle, minWidth: 52 }} title="Reset zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10))} className="text-[13px] rounded px-2 py-0.5 leading-none" style={inputStyle} title="Zoom in">+</button>
            <button onClick={() => setZoom(1)} className="text-[11px] rounded px-2 py-1 leading-none ml-1" style={inputStyle} title="Actual size (100%)">1:1</button>
          </div>
          <div className="p-6">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 120ms" }}>
              <ResumePaper doc={doc} templateId={templateId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Convert extracted signals back to a V1-ish object normalizeDoc understands.
function signalsToV1(signals: unknown): unknown {
  const s = signals as { header?: { name?: string; title?: string; location?: string; links?: string[] }; summary?: string; experiences?: unknown[]; projects?: unknown[]; skills?: string[]; education?: { school?: string; degree?: string; field?: string; gradYear?: string }[] };
  return {
    header: { name: s.header?.name ?? "", title: s.header?.title ?? "", location: s.header?.location ?? "", email: "", phone: "", links: s.header?.links ?? [] },
    summary: s.summary ?? "",
    experiences: (s.experiences ?? []).map((e) => { const x = e as { title?: string; firm?: string; start?: string; end?: string; bullets?: string[] }; return { title: x.title ?? "", firm: x.firm ?? "", start: x.start ?? "", end: x.end ?? "", bullets: x.bullets ?? [] }; }),
    projects: (s.projects ?? []).map((p) => { const x = p as { name?: string; description?: string; bullets?: string[]; tech?: string[] }; return { name: x.name ?? "", description: x.description ?? "", bullets: x.bullets ?? [], tech: x.tech ?? [] }; }),
    skills: s.skills ?? [],
    education: s.education ?? [],
  };
}

// ── Field primitives ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: c.dim }}>{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full mt-1 rounded-md px-2 py-1.5 text-[12px] outline-none resize-y" style={inputStyle} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 rounded-md px-2 py-1.5 text-[12px] outline-none" style={inputStyle} />
      )}
    </label>
  );
}

function HeaderEditor({ doc, setDoc }: { doc: ResumeDoc; setDoc: (d: ResumeDoc) => void }) {
  const setH = (patch: Partial<ResumeDoc["header"]>) => setDoc({ ...doc, header: { ...doc.header, ...patch } });
  return (
    <div className="rounded-md p-2.5 space-y-2" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <h3 className="text-[12px] font-semibold" style={{ color: "#fff" }}>Header</h3>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name" value={doc.header.name} onChange={(v) => setH({ name: v })} />
        <Field label="Title / target role" value={doc.header.title} onChange={(v) => setH({ title: v })} />
        <Field label="Location" value={doc.header.location} onChange={(v) => setH({ location: v })} />
        <Field label="Email" value={doc.header.email} onChange={(v) => setH({ email: v })} />
        <Field label="Phone" value={doc.header.phone} onChange={(v) => setH({ phone: v })} />
        <Field label="Links (comma-sep)" value={doc.header.links.join(", ")} onChange={(v) => setH({ links: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
      </div>
    </div>
  );
}

function ContextEditor({ userContext, setUserContext }: { userContext: string; setUserContext: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md p-2.5" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-[12px] font-semibold" style={{ color: "#fff" }}>
        <span>About me / context for AI</span><span style={{ color: c.dim }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2"><Field label="Free-text context (used to tailor rewrites; never invents claims)" value={userContext} onChange={setUserContext} area /></div>}
    </div>
  );
}

// ── Evidence bank ────────────────────────────────────────────────────────────
function EvidenceBank({ evidence, setEvidence }: { evidence: Evidence[]; setEvidence: (e: Evidence[]) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ kind: "project", title: "", detail: "", metric: "" });
  async function add() {
    if (!draft.title.trim()) return;
    const res = await fetch("/api/me/resume/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    if (res.ok) { const { evidence: ev } = await res.json(); setEvidence([ev, ...evidence]); setDraft({ kind: "project", title: "", detail: "", metric: "" }); }
  }
  async function del(id: string) {
    await fetch(`/api/me/resume/evidence?id=${id}`, { method: "DELETE" });
    setEvidence(evidence.filter((e) => e.id !== id));
  }
  return (
    <div className="rounded-md p-2.5" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-[12px] font-semibold" style={{ color: "#fff" }}>
        <span>Evidence bank ({evidence.length})</span><span style={{ color: c.dim }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[10px]" style={{ color: c.dim }}>Real things you&apos;ve done. AI rewrites + JD tailoring may only use these — never invents beyond them.</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle}>
              {["project", "class", "work", "leadership", "metric", "skill"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input placeholder="title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle} />
          </div>
          <input placeholder="detail" value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className="w-full text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle} />
          <div className="flex gap-2">
            <input placeholder="metric (e.g. cut latency 40%)" value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })} className="flex-1 text-[12px] rounded-md px-2 py-1.5 outline-none" style={inputStyle} />
            <button onClick={add} className="text-[12px] rounded-md px-3" style={{ background: c.accent, color: "#fff" }}>Add</button>
          </div>
          {evidence.map((e) => (
            <div key={e.id} className="flex items-start justify-between text-[11px] rounded px-2 py-1" style={{ background: c.raised }}>
              <span><span style={{ color: c.accent }}>{e.kind}</span> · {e.title}{e.metric ? ` — ${e.metric}` : ""}</span>
              <button onClick={() => del(e.id)} style={{ color: c.dim }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section list + per-kind editors ───────────────────────────────────────────
function AddSectionMenu({ onAdd }: { onAdd: (t: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-[11px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>+ Add section</button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 rounded-md py-1" style={{ background: c.raised, border: `1px solid ${c.border}`, minWidth: 160 }}>
          {ADDABLE.map((t) => (
            <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="block w-full text-left px-3 py-1 text-[12px] hover:opacity-80" style={{ color: c.text }}>{t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, selected, onSelect, onChange, onUp, onDown, onToggle, onRemove }: {
  section: ResumeSection; selected: boolean; onSelect: () => void; onChange: (s: ResumeSection) => void; onUp: () => void; onDown: () => void; onToggle: () => void; onRemove: () => void;
}) {
  return (
    <div id={`section-${section.id}`} className="rounded-md" style={{ background: c.panel, border: `1px solid ${selected ? c.accent : c.border}`, opacity: section.visible ? 1 : 0.55 }}>
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <button onClick={onSelect} className="flex-1 text-left text-[12px] font-semibold" style={{ color: "#fff" }}>{section.title}</button>
        <button onClick={onUp} title="Move up" style={{ color: c.dim }}>↑</button>
        <button onClick={onDown} title="Move down" style={{ color: c.dim }}>↓</button>
        <button onClick={onToggle} title={section.visible ? "Hide" : "Show"} style={{ color: section.visible ? c.dim : c.accent }}>{section.visible ? "◉" : "○"}</button>
        <button onClick={onRemove} title="Remove" style={{ color: c.dim }}>×</button>
      </div>
      {selected && <div className="px-2.5 pb-2.5 space-y-2">
        <Field label="Section title" value={section.title} onChange={(v) => onChange({ ...section, title: v })} />
        <SectionEditor section={section} onChange={onChange} />
      </div>}
    </div>
  );
}

function SectionEditor({ section, onChange }: { section: ResumeSection; onChange: (s: ResumeSection) => void }) {
  if (section.kind === "text") return <Field label="Body" value={section.body} onChange={(v) => onChange({ ...section, body: v })} area />;
  if (section.kind === "entries") return <EntriesEditor section={section} onChange={onChange} />;
  if (section.kind === "education") return <EducationEditor section={section} onChange={onChange} />;
  if (section.kind === "skills") return <SkillsEditor section={section} onChange={onChange} />;
  return <ListEditor section={section} onChange={onChange} />;
}

function EntriesEditor({ section, onChange }: { section: EntriesSection; onChange: (s: ResumeSection) => void }) {
  const isProjects = section.type === "projects";
  const upd = (i: number, patch: Partial<EntriesSection["entries"][number]>) => onChange({ ...section, entries: section.entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  return (
    <div className="space-y-2">
      {section.entries.map((e, i) => (
        <div key={e.id} className="rounded p-2 space-y-1.5" style={{ background: c.raised }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label={isProjects ? "Name" : "Title"} value={e.title} onChange={(v) => upd(i, { title: v })} />
            {!isProjects && <Field label="Org" value={e.org} onChange={(v) => upd(i, { org: v })} />}
            {!isProjects && <Field label="Location" value={e.location} onChange={(v) => upd(i, { location: v })} />}
            {!isProjects && <Field label="Start" value={e.start} onChange={(v) => upd(i, { start: v })} />}
            {!isProjects && <Field label="End" value={e.end} onChange={(v) => upd(i, { end: v })} />}
          </div>
          {isProjects && <Field label="Tech (comma-sep)" value={(e.tech ?? []).join(", ")} onChange={(v) => upd(i, { tech: v.split(",").map((x) => x.trim()).filter(Boolean) })} />}
          <Field label="Bullets (one per line)" value={e.bullets.join("\n")} onChange={(v) => upd(i, { bullets: v.split("\n") })} area />
          <RowControls
            onUp={() => onChange({ ...section, entries: moveInArray(section.entries, i, -1) })}
            onDown={() => onChange({ ...section, entries: moveInArray(section.entries, i, 1) })}
            onRemove={() => onChange({ ...section, entries: section.entries.filter((_, j) => j !== i) })}
          />
        </div>
      ))}
      <button onClick={() => onChange({ ...section, entries: [...section.entries, { id: uid("e"), title: "", org: "", location: "", start: "", end: "", bullets: [], ...(isProjects ? { tech: [] } : {}) }] })} className="text-[11px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>+ Add entry</button>
    </div>
  );
}

function EducationEditor({ section, onChange }: { section: EducationSection; onChange: (s: ResumeSection) => void }) {
  const upd = (i: number, patch: Partial<EducationSection["entries"][number]>) => onChange({ ...section, entries: section.entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  return (
    <div className="space-y-2">
      {section.entries.map((e, i) => (
        <div key={e.id} className="rounded p-2 grid grid-cols-2 gap-2" style={{ background: c.raised }}>
          <Field label="School" value={e.school} onChange={(v) => upd(i, { school: v })} />
          <Field label="Location" value={e.location} onChange={(v) => upd(i, { location: v })} />
          <Field label="Degree" value={e.degree} onChange={(v) => upd(i, { degree: v })} />
          <Field label="Field" value={e.field} onChange={(v) => upd(i, { field: v })} />
          <Field label="Concentration" value={e.concentration} onChange={(v) => upd(i, { concentration: v })} />
          <Field label="Grad date" value={e.gradDate} onChange={(v) => upd(i, { gradDate: v })} />
          <Field label="GPA" value={e.gpa} onChange={(v) => upd(i, { gpa: v })} />
          <Field label="Study abroad" value={e.studyAbroad} onChange={(v) => upd(i, { studyAbroad: v })} />
          <div className="col-span-2"><Field label="Coursework" value={e.coursework} onChange={(v) => upd(i, { coursework: v })} /></div>
          <div className="col-span-2">
            <RowControls
              onUp={() => onChange({ ...section, entries: moveInArray(section.entries, i, -1) })}
              onDown={() => onChange({ ...section, entries: moveInArray(section.entries, i, 1) })}
              onRemove={() => onChange({ ...section, entries: section.entries.filter((_, j) => j !== i) })}
            />
          </div>
        </div>
      ))}
      <button onClick={() => onChange({ ...section, entries: [...section.entries, { id: uid("ed"), school: "", location: "", degree: "", field: "", concentration: "", gradDate: "", gpa: "", honors: "", coursework: "", studyAbroad: "" }] })} className="text-[11px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>+ Add education</button>
    </div>
  );
}

function SkillsEditor({ section, onChange }: { section: SkillsSection; onChange: (s: ResumeSection) => void }) {
  const CATS: SkillCategory[] = ["technical", "tools", "languages", "interests", "custom"];
  const upd = (i: number, patch: Partial<SkillsSection["groups"][number]>) => onChange({ ...section, groups: section.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  return (
    <div className="space-y-2">
      {section.groups.map((g, i) => (
        <div key={i} className="rounded p-2 space-y-1.5" style={{ background: c.raised }}>
          <div className="flex gap-2">
            <select value={g.category} onChange={(e) => upd(i, { category: e.target.value as SkillCategory })} className="text-[12px] rounded-md px-2 py-1 outline-none" style={inputStyle}>
              {CATS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input value={g.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="label" className="flex-1 text-[12px] rounded-md px-2 py-1 outline-none" style={inputStyle} />
          </div>
          <Field label="Items (comma-sep)" value={g.items.join(", ")} onChange={(v) => upd(i, { items: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
          {g.category === "interests" && <p className="text-[10px]" style={{ color: c.dim }}>Interests show on the resume but don&apos;t affect your score.</p>}
          <button onClick={() => onChange({ ...section, groups: section.groups.filter((_, j) => j !== i) })} className="text-[10px]" style={{ color: c.dim }}>Remove group</button>
        </div>
      ))}
      <button onClick={() => onChange({ ...section, groups: [...section.groups, { category: "technical", label: "Technical", items: [] }] })} className="text-[11px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>+ Add group</button>
    </div>
  );
}

function ListEditor({ section, onChange }: { section: ListSection; onChange: (s: ResumeSection) => void }) {
  const upd = (i: number, patch: Partial<ListSection["items"][number]>) => onChange({ ...section, items: section.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-2">
      {section.items.map((it, i) => (
        <div key={it.id} className="rounded p-2 grid grid-cols-2 gap-2" style={{ background: c.raised }}>
          <Field label="Title" value={it.title} onChange={(v) => upd(i, { title: v })} />
          <Field label="Date" value={it.date} onChange={(v) => upd(i, { date: v })} />
          <div className="col-span-2"><Field label="Detail" value={it.detail} onChange={(v) => upd(i, { detail: v })} /></div>
          <div className="col-span-2">
            <RowControls
              onUp={() => onChange({ ...section, items: moveInArray(section.items, i, -1) })}
              onDown={() => onChange({ ...section, items: moveInArray(section.items, i, 1) })}
              onRemove={() => onChange({ ...section, items: section.items.filter((_, j) => j !== i) })}
            />
          </div>
        </div>
      ))}
      <button onClick={() => onChange({ ...section, items: [...section.items, { id: uid("l"), title: "", detail: "", date: "" }] })} className="text-[11px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>+ Add item</button>
    </div>
  );
}

// ── Middle pane panels ─────────────────────────────────────────────────────────
function ScorePanel({ grade, scoring }: { grade: GradeResponse | null; scoring: boolean }) {
  const overall = grade?.overall ?? 0;
  return (
    <div className="rounded-lg p-4" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: c.dim }}>Recruiter score {scoring && "· rechecking…"}</div>
      <div className="text-[44px] font-bold leading-none mt-1" style={{ color: scoreColor(overall) }}>{overall}<span className="text-[16px]" style={{ color: c.dim }}>/100</span></div>
      <div className="mt-4 space-y-2.5">
        {(grade?.dimensions ?? []).map((d: DimensionScore) => (
          <div key={d.key}>
            <div className="flex items-center justify-between text-[11px]"><span>{d.label}</span><span style={{ color: c.dim }}>{d.score} · {Math.round(d.weight * 100)}% wt</span></div>
            <div className="h-[5px] rounded-full mt-1" style={{ background: c.raised }}><div className="h-full rounded-full" style={{ width: `${d.score}%`, background: scoreColor(d.score), transition: "width 200ms" }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LintPanel({ lint, onJump }: { lint: LintWarning[]; onJump: (sectionId: string) => void }) {
  if (!lint.length) return null;
  const sev = (s: LintWarning["severity"]) => (s === "error" ? "#D2604A" : s === "warn" ? "#D9A441" : c.dim);
  const top = [...lint].sort((a, b) => a.scoreImpact - b.scoreImpact).slice(0, 3);
  return (
    <div className="rounded-lg p-3" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <div className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: c.dim }}>Top fixes ({lint.length})</div>
      <div className="space-y-1.5">
        {top.map((w, i) => (
          <button key={i} onClick={() => w.sectionId !== "global" && w.sectionId !== "header" && onJump(w.sectionId)} className="w-full text-left flex items-start gap-2 text-[11px]">
            <span style={{ color: sev(w.severity) }}>●</span>
            <span style={{ color: c.text }}>{w.message}{w.scoreImpact < 0 && <span style={{ color: c.dim }}> ({w.scoreImpact})</span>}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackPanel({ notes, doc, setDoc, stale }: { notes: { notes: Note[]; rewrites: Rewrite[] }; doc: ResumeDoc; setDoc: (d: ResumeDoc) => void; stale: boolean }) {
  function applyRewrite(r: Rewrite) {
    const next: ResumeDoc = JSON.parse(JSON.stringify(doc));
    for (const s of next.sections) {
      if (s.kind !== "entries") continue;
      for (const e of (s as EntriesSection).entries) {
        const idx = e.bullets.findIndex((b) => b.trim() === r.before.trim());
        if (idx >= 0) { e.bullets[idx] = r.after; setDoc(next); return; }
      }
    }
  }
  return (
    <div className="space-y-3">
      {stale && <div className="text-[10px]" style={{ color: c.dim }}>Based on previous version — re-run for the latest.</div>}
      {notes.notes.map((n, i) => (
        <div key={i} className="rounded-md p-3" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: c.accent }}>{n.dimension}</div>
          <div className="text-[12px] mt-1" style={{ color: "#fff" }}>{n.feedback}</div>
          {n.suggestions.length > 0 && <ul className="mt-1.5 space-y-0.5">{n.suggestions.map((s, j) => <li key={j} className="text-[11px] flex gap-1.5" style={{ color: c.text }}><span style={{ color: c.accent }}>›</span>{s}</li>)}</ul>}
        </div>
      ))}
      {notes.rewrites.length > 0 && (
        <div className="rounded-md p-3" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
          <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: c.dim }}>Bullet rewrites</div>
          {notes.rewrites.map((r, i) => (
            <div key={i} className="mb-2.5">
              <div className="text-[11px] line-through" style={{ color: c.dim }}>{r.before}</div>
              <div className="text-[11.5px]" style={{ color: "#fff" }}>{r.after}</div>
              <button onClick={() => applyRewrite(r)} className="mt-1 text-[10px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>Apply</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TailorPanel({ jd, setJd, run, loading, result, doc, setDoc }: { jd: string; setJd: (v: string) => void; run: () => void; loading: boolean; result: TailorResult | null; doc: ResumeDoc; setDoc: (d: ResumeDoc) => void }) {
  const [tab, setTab] = useState<"edits" | "missing">("edits");
  function apply(before: string, after: string) {
    const next: ResumeDoc = JSON.parse(JSON.stringify(doc));
    for (const s of next.sections) {
      if (s.kind !== "entries") continue;
      for (const e of (s as EntriesSection).entries) {
        const idx = e.bullets.findIndex((b) => b.trim() === before.trim());
        if (idx >= 0) { e.bullets[idx] = after; setDoc(next); return; }
      }
    }
  }
  return (
    <div className="rounded-md p-3" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
      <div className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: c.dim }}>Tailor to a job description</div>
      <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={3} placeholder="Paste the job description…" className="w-full rounded-md px-2 py-1.5 text-[12px] outline-none resize-y" style={inputStyle} />
      <button onClick={run} disabled={loading || !jd.trim()} className="w-full mt-2 text-[12px] rounded-md px-3 py-2 font-semibold" style={{ background: c.accent, color: "#fff", opacity: loading || !jd.trim() ? 0.6 : 1 }}>{loading ? "Tailoring…" : "Tailor + score delta"}</button>
      {result && (
        <div className="mt-3">
          <div className="flex items-center gap-3 text-[13px]">
            <span style={{ color: c.dim }}>Baseline <b style={{ color: scoreColor(result.before) }}>{result.before}</b></span>
            <span style={{ color: c.dim }}>→</span>
            <span style={{ color: c.dim }}>Recommended <b style={{ color: scoreColor(result.after) }}>{result.after}</b></span>
            <span className="ml-auto font-semibold" style={{ color: result.gain >= 0 ? "#4FA86A" : "#D2604A" }}>{result.gain >= 0 ? "+" : ""}{result.gain}</span>
          </div>
          <div className="flex gap-2 mt-3 text-[11px]">
            <button onClick={() => setTab("edits")} style={{ color: tab === "edits" ? c.accent : c.dim }}>Recommended edits</button>
            <button onClick={() => setTab("missing")} style={{ color: tab === "missing" ? c.accent : c.dim }}>Missing evidence ({result.missingEvidence.length})</button>
          </div>
          {tab === "edits" && (
            <div className="mt-2 space-y-2">
              {result.rewrites.filter((r) => r.ok).map((r, i) => (
                <div key={i}>
                  <div className="text-[11px] line-through" style={{ color: c.dim }}>{r.before}</div>
                  <div className="text-[11.5px]" style={{ color: "#fff" }}>{r.after}</div>
                  <button onClick={() => apply(r.before, r.after)} className="mt-1 text-[10px] rounded px-2 py-0.5" style={{ ...inputStyle, color: c.accent }}>Apply</button>
                </div>
              ))}
              {result.rewrites.some((r) => !r.ok) && <div className="text-[10px]" style={{ color: c.dim }}>{result.rewrites.filter((r) => !r.ok).length} suggestion(s) dropped (no backing evidence — add it to the bank).</div>}
              {!result.rewrites.some((r) => r.ok) && <div className="text-[11px]" style={{ color: c.dim }}>No evidence-backed rewrites. Add evidence to the bank, then re-tailor.</div>}
            </div>
          )}
          {tab === "missing" && (
            <div className="mt-2 text-[11px]" style={{ color: c.text }}>
              <p style={{ color: c.dim }}>JD terms not yet backed by your resume/evidence:</p>
              <div className="flex flex-wrap gap-1 mt-1">{result.missingEvidence.map((k, i) => <span key={i} className="rounded px-1.5 py-0.5" style={{ background: c.raised }}>{k}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
