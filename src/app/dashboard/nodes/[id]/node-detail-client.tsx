"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Users, Copy, Check, LogOut, Send, Trophy, Network, EyeOff } from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

interface PoolContact {
  id: string; name: string; firmName: string; title: string; tier: string;
  education: string; location: string; ownerId: string; ownerName: string;
}
interface Member { email: string; name: string; role: string }
interface NodeDetail {
  node: { id: string; name: string; inviteCode: string; ownerId: string };
  members: Member[];
  pool: PoolContact[];
}
interface LbRow {
  email: string; name: string; warmSignals: number; coffeeChats: number;
  intros: number; contactsAdded: number; score: number;
}

export function NodeDetailClient({ nodeId, me }: { nodeId: string; me: string }) {
  const router = useRouter();
  const [data, setData] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pool" | "leaderboard">("pool");
  const [copied, setCopied] = useState(false);
  const [introFor, setIntroFor] = useState<PoolContact | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/kith/nodes/${nodeId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [nodeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function leave() {
    if (!window.confirm("Leave this node? Your contacts stop being visible to its members.")) return;
    await apiFetch(`/api/kith/nodes/${nodeId}/leave`, { method: "POST" });
    router.push("/dashboard/nodes");
  }

  async function unshare(contactId: string) {
    await apiFetch("/api/kith/contacts/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, sharedInNodes: false }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data) return <div className="px-6 py-6 text-[13px] text-muted-foreground">Node not found.</div>;

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-accent-teal" />
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {data.node.name}
            </h1>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {data.members.length} members
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(data.node.inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1.5 border border-white/[0.12] px-3 py-2 font-mono text-[12px] text-foreground hover:bg-white/[0.06]"
            title="Copy invite code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {data.node.inviteCode}
          </button>
          <button
            onClick={leave}
            className="flex items-center gap-1.5 border border-white/[0.12] px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-white/[0.06]">
        <Tab active={tab === "pool"} onClick={() => setTab("pool")} icon={<Users className="h-3.5 w-3.5" />}>
          Shared Pool ({data.pool.length})
        </Tab>
        <Tab active={tab === "leaderboard"} onClick={() => setTab("leaderboard")} icon={<Trophy className="h-3.5 w-3.5" />}>
          Leaderboard
        </Tab>
      </div>

      {tab === "pool" ? (
        <PoolView pool={data.pool} me={me} onIntro={setIntroFor} onUnshare={unshare} />
      ) : (
        <LeaderboardView nodeId={nodeId} />
      )}

      {introFor && (
        <IntroModal
          contact={introFor}
          onClose={() => setIntroFor(null)}
          onSent={() => {
            setIntroFor(null);
          }}
        />
      )}
    </div>
  );
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-colors ${
        active ? "border-accent-teal text-accent-teal" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function PoolView({ pool, me, onIntro, onUnshare }: { pool: PoolContact[]; me: string; onIntro: (c: PoolContact) => void; onUnshare: (id: string) => void }) {
  if (pool.length === 0) {
    return <div className="border border-white/[0.06] bg-card px-4 py-10 text-center text-[13px] text-muted-foreground">No shared contacts yet. Members&apos; contacts pool here.</div>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {pool.map((c) => {
        const mine = c.ownerId === me;
        return (
          <div key={c.id} className="flex flex-col border border-white/[0.06] bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-foreground">{c.name}</div>
                <div className="truncate text-[12px] text-muted-foreground">
                  {c.title}
                  {c.title && c.firmName ? " @ " : ""}
                  <span className="text-foreground">{c.firmName}</span>
                </div>
              </div>
              <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase ${TIER_STYLES[c.tier?.toLowerCase()] || TIER_STYLES.cold}`}>
                {(c.tier || "cold").toUpperCase()}
              </span>
            </div>

            {/* Warm path via friend */}
            {!mine && (
              <div className="mt-2 truncate font-mono text-[11px] text-accent-teal">
                <span className="text-muted-foreground">via </span>
                {c.ownerName}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              {mine ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Your contact</span>
                  <button
                    onClick={() => onUnshare(c.id)}
                    className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-red-400"
                    title="Stop sharing this contact in nodes"
                  >
                    <EyeOff className="h-3 w-3" /> Unshare
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onIntro(c)}
                  className="flex w-full items-center justify-center gap-1.5 bg-accent-teal py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80"
                >
                  <Send className="h-3.5 w-3.5" /> Ask {c.ownerName.split(" ")[0]} for intro
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntroModal({ contact, onClose, onSent }: { contact: PoolContact; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const res = await apiFetch("/api/kith/intro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, message }),
    });
    if (res.ok) onSent();
    else {
      setError((await res.json().catch(() => ({}))).error || "Failed to send");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md border border-accent-teal/30 bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent-teal">Warm-path intro</div>
        <div className="mb-3 text-[14px] text-foreground">
          Ask <span className="font-semibold">{contact.ownerName}</span> to introduce you to{" "}
          <span className="font-semibold">{contact.name}</span>
        </div>
        <div className="mb-3 font-mono text-[11px] text-accent-teal">
          <span className="text-muted-foreground">you → </span>{contact.ownerName}<span className="text-muted-foreground"> → </span>{contact.name}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Add a short note for your friend…"
          className="w-full border border-white/[0.12] bg-bg-primary px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
        />
        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="border border-white/[0.12] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06]">
            Cancel
          </button>
          <button onClick={send} disabled={busy} className="flex items-center gap-1.5 bg-accent-teal px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaderboardView({ nodeId }: { nodeId: string }) {
  const [window, setWindow] = useState<"week" | "month">("week");
  const [rows, setRows] = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/kith/nodes/${nodeId}/leaderboard?window=${window}`).then(async (res) => {
      if (res.ok) setRows((await res.json()).rows);
      setLoading(false);
    });
  }, [nodeId, window]);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {(["week", "month"] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWindow(w)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              window === w ? "bg-accent-teal text-white" : "border border-white/[0.12] text-muted-foreground hover:bg-white/[0.06]"
            }`}
          >
            {w}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-hidden border border-white/[0.06] bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2 text-right">Warm</th>
                <th className="px-3 py-2 text-right">Chats</th>
                <th className="px-3 py-2 text-right">Intros</th>
                <th className="px-3 py-2 text-right">Added</th>
                <th className="px-3 py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px] tabular-nums">
              {rows.map((r, i) => (
                <tr key={r.email} className="border-b border-white/[0.06] last:border-b-0">
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 font-sans text-foreground">{r.name}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{r.warmSignals}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{r.coffeeChats}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{r.intros}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{r.contactsAdded}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-accent-teal">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
