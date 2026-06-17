"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Plus, Loader2, Network, Users, ChevronRight, LogIn } from "lucide-react";

interface NodeRow {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
}

export function NodesClient() {
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/kith/nodes");
    if (res.ok) setNodes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiFetch("/api/kith/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      await load();
    } else setError((await res.json().catch(() => ({}))).error || "Failed to create");
    setBusy(false);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiFetch("/api/kith/nodes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setCode("");
      await load();
    } else setError((await res.json().catch(() => ({}))).error || "Failed to join");
    setBusy(false);
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Nodes
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Groups that pool contacts. Your friend-group multiplies everyone&apos;s reachable network.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <form onSubmit={create} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New node name"
            required
            className="flex-1 border border-white/[0.12] bg-card px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
          />
          <button disabled={busy} className="flex items-center gap-1.5 bg-accent-teal px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Create
          </button>
        </form>
        <form onSubmit={join} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            required
            className="flex-1 border border-white/[0.12] bg-card px-3 py-2.5 font-mono text-[13px] uppercase text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
          />
          <button disabled={busy} className="flex items-center gap-1.5 border border-white/[0.12] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06] disabled:opacity-50">
            <LogIn className="h-4 w-4" /> Join
          </button>
        </form>
      </div>
      {error && <p className="mb-4 text-[12px] text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : nodes.length === 0 ? (
        <div className="border border-white/[0.06] bg-card px-4 py-10 text-center">
          <Network className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-[13px] text-muted-foreground">No nodes yet. Create one or join with a code.</p>
        </div>
      ) : (
        <div className="border border-white/[0.06] bg-card">
          {nodes.map((n) => (
            <Link
              key={n.id}
              href={`/dashboard/nodes/${n.id}`}
              className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <Network className="h-4 w-4 text-accent-teal" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{n.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {n.memberCount} {n.memberCount === 1 ? "member" : "members"}
                    {n.isOwner && <span className="ml-1 text-accent-teal">· owner</span>}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
