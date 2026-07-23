"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EmptyWorkspace, WorkspaceContent } from "@/components/product-workspace";
import { StatusBadge, WorkspaceError, WorkspaceHeader, WorkspaceLoading } from "@/components/workspace-ui";

type Recent = { id: string; kind: string; title: string; subtitle: string; href: string; updatedAt: string };

export function RecentsWorkspace() {
  const [recents, setRecents] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/recents");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Recents are temporarily unavailable.");
      setRecents(body.recents || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recents are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  return <div className="min-h-full bg-canvas"><WorkspaceHeader eyebrow="Continue where you left off" title="Recents" description="Recent chats, people, applications, documents, and reviewed research in one place." /><WorkspaceContent>{loading ? <WorkspaceLoading label="Loading recents" /> : error ? <WorkspaceError message={error} onRetry={load} /> : !recents.length ? <EmptyWorkspace icon={<Clock3 className="h-5 w-5" />} title="Your recent work will appear here" description="Start a conversation, review a person, save an application, or edit a document." action={<Link href="/dashboard" className="min-h-10 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Start on Home</Link>} /> : <div className="overflow-hidden rounded-2xl border border-border bg-white">{recents.map((item) => <Link key={`${item.kind}:${item.id}`} href={item.href} className="flex min-h-16 items-center gap-3 border-b border-border-soft px-4 py-3 last:border-0 hover:bg-surface-soft"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-soft text-text-secondary"><Clock3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{item.title}</span><span className="block truncate text-xs text-text-secondary">{item.subtitle}</span></span><StatusBadge>{item.kind}</StatusBadge><time className="hidden text-xs text-text-muted sm:block">{new Date(item.updatedAt).toLocaleDateString()}</time></Link>)}</div>}</WorkspaceContent></div>;
}

