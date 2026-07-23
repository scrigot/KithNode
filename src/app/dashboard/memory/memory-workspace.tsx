"use client";

import { useEffect, useState } from "react";
import { Brain, Clock3, Network, Pencil, RotateCcw, Trash2, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EmptyWorkspace, QuietButton, WorkspaceContent } from "@/components/product-workspace";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";

type Memory = {
  id: string;
  kind: string;
  content: Record<string, unknown>;
  confidence: number;
  active: boolean;
  freshness: string;
  downstreamUse: string[];
};

const layers = [
  { id: "identity", title: "Recruiting identity & preferences", description: "Goals, role interests, work preferences, strengths, and constraints.", icon: UserRound },
  { id: "relationships", title: "Relationship memory", description: "People, context, warmth, follow-ups, and how you know each other.", icon: Network },
  { id: "timeline", title: "Recruiting & application timeline", description: "Applications, deadlines, interviews, outcomes, and next actions.", icon: Clock3 },
] as const;

function summarize(content: Record<string, unknown>) {
  const entries = Object.entries(content);
  if (!entries.length) return "No readable detail";
  return entries.slice(0, 4).map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`).join(" · ");
}

export function MemoryWorkspace() {
  const [grouped, setGrouped] = useState<Record<string, Memory[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Memory | null>(null);
  const [draft, setDraft] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/memory");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Memory is temporarily unavailable.");
      setGrouped(body.layers || {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Memory is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function changeMemory(memory: Memory, action: "correct" | "forget" | "restore") {
    let content: Record<string, unknown> | undefined;
    if (action === "correct") {
      try {
        content = JSON.parse(draft);
      } catch {
        setError("Use valid JSON for this advanced memory correction.");
        return;
      }
    }
    const response = await apiFetch(`/api/memory/${memory.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, content, reason: action === "correct" ? "User correction from Memory workspace" : "" }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "KithNode could not update memory.");
      return;
    }
    setEditing(null);
    await load();
  }

  const count = Object.values(grouped).flat().length;
  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader eyebrow="Personal intelligence" title="Memory" description="Inspect what KithNode remembers, where it came from, and how it shapes recommendations. Correct or forget anything." />
      <WorkspaceContent className="space-y-5">
        {loading ? <WorkspaceLoading label="Loading memory" /> : error ? <WorkspaceError message={error} onRetry={load} /> : count === 0 ? (
          <EmptyWorkspace icon={<Brain className="h-5 w-5" />} title="Memory grows from approved work" description="Complete your recruiting profile, save an application, or correct Copilot. KithNode records only grounded facts and approved preferences." action={<a href="/dashboard/settings/profile" className="min-h-10 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Complete recruiting profile</a>} />
        ) : layers.map(({ id, title, description, icon: Icon }) => {
          const memories = grouped[id] || [];
          return <section key={id} className="overflow-hidden rounded-2xl border border-border bg-white">
            <header className="flex items-start gap-3 border-b border-border-soft px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
              <div><h2 className="font-heading text-xl font-medium text-text-primary">{title}</h2><p className="mt-0.5 text-sm text-text-secondary">{description}</p></div>
              <span className="ml-auto text-sm tabular-nums text-text-muted">{memories.length}</span>
            </header>
            {memories.length ? <div className="divide-y divide-border-soft">{memories.map((memory) => <article key={memory.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><StatusBadge tone={memory.active ? "success" : "neutral"}>{memory.active ? "Approved" : "Forgotten"}</StatusBadge><StatusBadge>{Math.round(memory.confidence * 100)}% confidence</StatusBadge><StatusBadge>{memory.kind}</StatusBadge></div><p className="mt-3 text-sm leading-6 text-text-primary">{summarize(memory.content)}</p><p className="mt-2 text-xs text-text-muted">Used for {memory.downstreamUse.join(", ")} · Updated {new Date(memory.freshness).toLocaleDateString()}</p></div>
                <div className="flex shrink-0 gap-1">{memory.active ? <><QuietButton onClick={() => { setEditing(memory); setDraft(JSON.stringify(memory.content, null, 2)); }}><Pencil className="mr-2 h-4 w-4" />Correct</QuietButton><QuietButton onClick={() => void changeMemory(memory, "forget")}><Trash2 className="mr-2 h-4 w-4" />Forget</QuietButton></> : <QuietButton onClick={() => void changeMemory(memory, "restore")}><RotateCcw className="mr-2 h-4 w-4" />Restore</QuietButton>}</div>
              </div>
              {editing?.id === memory.id ? <div className="mt-4 rounded-xl bg-surface-soft p-3"><label className="text-xs font-medium text-text-secondary">Advanced correction</label><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} className="mt-2 w-full rounded-lg border border-border bg-white p-3 font-mono text-xs text-text-primary" /><div className="mt-2 flex gap-2"><button type="button" onClick={() => void changeMemory(memory, "correct")} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">Save correction</button><QuietButton onClick={() => setEditing(null)}>Cancel</QuietButton></div></div> : null}
            </article>)}</div> : <p className="px-5 py-8 text-sm text-text-secondary">No approved memories in this layer yet.</p>}
          </section>;
        })}
      </WorkspaceContent>
    </div>
  );
}

