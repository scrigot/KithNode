"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Users, Copy, Check, LogOut, Send, Trophy, Network, EyeOff, UserPlus, Search, MessageSquare, Link2, Settings, Trash2, ImageUp } from "lucide-react";
import { ChatThread } from "@/app/dashboard/_components/chat-thread";

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
  node: { id: string; name: string; inviteCode: string; ownerId: string; description: string; avatarUrl: string };
  members: Member[];
  pool: PoolContact[];
}
interface LbRow {
  email: string; name: string; warmSignals: number; coffeeChats: number;
  intros: number; contactsAdded: number; score: number;
}
interface UserProfile { email: string; name: string; image: string }

export function NodeDetailClient({ nodeId, me, myEmail }: { nodeId: string; me: string; myEmail: string }) {
  const router = useRouter();
  const [data, setData] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pool" | "leaderboard" | "chat" | "settings">("pool");
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

  // Add a member by email. Optimistically append, then reconcile with the
  // server's authoritative member list (returned by the route).
  async function addMember(email: string, name: string) {
    setData((d) =>
      d && d.members.some((m) => m.email === email)
        ? d
        : d && { ...d, members: [...d.members, { email, name, role: "member" }] },
    );
    const res = await apiFetch(`/api/kith/nodes/${nodeId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const members = (await res.json()) as Member[];
      setData((d) => d && { ...d, members });
    } else {
      await load();
    }
  }

  // Owner kicks a member. Reconcile from the server's authoritative member list.
  async function removeMember(email: string) {
    const res = await apiFetch(`/api/kith/nodes/${nodeId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const members = (await res.json()) as Member[];
      setData((d) => d && { ...d, members });
    } else {
      await load();
    }
  }

  // Open (or reuse) a DM with this person, then jump to the messages thread.
  async function messageMember(email: string) {
    const res = await apiFetch("/api/kith/dm/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withEmail: email }),
    });
    if (!res.ok) return;
    const { threadId } = (await res.json()) as { threadId: string };
    router.push(`/dashboard/messages/${threadId}`);
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
            {data.node.avatarUrl ? (
              <img src={data.node.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-md border border-white/[0.12] object-cover" />
            ) : (
              <Network className="h-5 w-5 text-accent-teal" />
            )}
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {data.node.name}
            </h1>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {data.members.length} members
          </div>
          {data.node.description && (
            <div className="mt-1 max-w-xl text-[12px] text-muted-foreground">{data.node.description}</div>
          )}
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
        <Tab active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-3.5 w-3.5" />}>
          Chat
        </Tab>
        <Tab active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings className="h-3.5 w-3.5" />}>
          Settings ({data.members.length})
        </Tab>
      </div>

      {tab === "pool" && <PoolView pool={data.pool} me={me} onIntro={setIntroFor} onUnshare={unshare} />}
      {tab === "leaderboard" && <LeaderboardView nodeId={nodeId} />}
      {tab === "chat" && (
        <div className="h-[60vh]">
          <ChatThread threadType="node" threadId={nodeId} title={data.node.name} />
        </div>
      )}
      {tab === "settings" && (
        <SettingsView
          node={data.node}
          members={data.members}
          me={me}
          myEmail={myEmail}
          onAdd={addMember}
          onRemove={removeMember}
          onMessage={messageMember}
          onSaved={load}
        />
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

const TIER_RANK: Record<string, number> = { hot: 0, warm: 1, monitor: 2, cold: 3 };
const TIER_FILTERS = ["all", "hot", "warm", "monitor", "cold"] as const;
type PoolSort = "tier" | "name" | "owner";

function PoolView({ pool, me, onIntro, onUnshare }: { pool: PoolContact[]; me: string; onIntro: (c: PoolContact) => void; onUnshare: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PoolSort>("tier");
  const [tier, setTier] = useState<string>("all");

  if (pool.length === 0) {
    return <div className="border border-white/[0.06] bg-card px-4 py-10 text-center text-[13px] text-muted-foreground">No shared contacts yet. Members&apos; contacts pool here.</div>;
  }

  const q = query.trim().toLowerCase();
  const filtered = pool
    .filter((c) => tier === "all" || (c.tier || "cold").toLowerCase() === tier)
    .filter((c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.firmName || "").toLowerCase().includes(q) ||
      (c.title || "").toLowerCase().includes(q),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "owner") return a.ownerName.localeCompare(b.ownerName);
      return (TIER_RANK[(a.tier || "cold").toLowerCase()] ?? 3) - (TIER_RANK[(b.tier || "cold").toLowerCase()] ?? 3);
    });

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 border border-white/[0.12] bg-bg-primary px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, firm, title…"
              className="h-8 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as PoolSort)}
            className="h-8 border border-white/[0.12] bg-bg-primary px-2 text-[12px] text-foreground focus:border-accent-teal focus:outline-none"
          >
            <option value="tier">Tier</option>
            <option value="name">Name A-Z</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <div className="flex gap-1">
          {TIER_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                tier === t
                  ? t === "all"
                    ? "border-accent-teal/40 bg-accent-teal/20 text-accent-teal"
                    : TIER_STYLES[t]
                  : "border-white/[0.12] text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-white/[0.06] bg-card px-4 py-10 text-center text-[13px] text-muted-foreground">No contacts match.</div>
      ) : (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((c) => {
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
      )}
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

function SettingsView({
  node,
  members,
  me,
  myEmail,
  onAdd,
  onRemove,
  onMessage,
  onSaved,
}: {
  node: NodeDetail["node"];
  members: Member[];
  me: string;
  myEmail: string;
  onAdd: (email: string, name: string) => void;
  onRemove: (email: string) => void;
  onMessage: (email: string) => void;
  onSaved: () => void;
}) {
  const isOwner = node.ownerId === me;
  const inviteCode = node.inviteCode;
  const memberEmails = new Set(members.map((m) => m.email));
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch("/api/kith/friends").then(async (res) => {
      if (res.ok) setFriends(((await res.json()).friends as UserProfile[]) ?? []);
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await apiFetch(`/api/kith/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults((await res.json()) as UserProfile[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const addableFriends = friends.filter((f) => !memberEmails.has(f.email));
  const joinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/nodes?join=${inviteCode}`
      : `/dashboard/nodes?join=${inviteCode}`;

  return (
    <div className="space-y-4">
      {/* Owner-only: edit node identity + avatar */}
      {isOwner && <NodeSettingsForm node={node} onSaved={onSaved} />}

    <div className="grid gap-4 lg:grid-cols-2">
      {/* Current members */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Members ({members.length})
        </div>
        <div className="divide-y divide-white/[0.06]">
          {members.map((m) => (
            <div key={m.email} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-foreground">{m.name}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{m.email}</div>
              </div>
              <span className="shrink-0 border border-white/[0.12] px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                {m.role}
              </span>
              {m.email !== myEmail && (
                <button
                  onClick={() => onMessage(m.email)}
                  className="flex shrink-0 items-center gap-1 border border-white/[0.12] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06] hover:text-accent-teal"
                  title="Message"
                >
                  <MessageSquare className="h-3 w-3" /> Message
                </button>
              )}
              {isOwner && m.email !== myEmail && (
                <button
                  onClick={() => {
                    if (window.confirm(`Remove ${m.name}? Their contacts stop being visible in this node.`)) onRemove(m.email);
                  }}
                  className="flex shrink-0 items-center gap-1 border border-white/[0.12] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  title="Remove member"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Shareable invite link */}
        <div className="border border-white/[0.06] bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            <Link2 className="h-3.5 w-3.5" /> Shareable invite
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={joinLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 border border-white/[0.12] bg-bg-primary px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-accent-teal focus:outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex shrink-0 items-center gap-1 border border-white/[0.12] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.06]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            Code: <span className="text-accent-teal">{inviteCode}</span>
          </div>
        </div>

        {/* Friends one-tap */}
        <div className="border border-white/[0.06] bg-card">
          <div className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Add a friend
          </div>
          {addableFriends.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
              No friends to add.
            </div>
          ) : (
            <div className="max-h-44 divide-y divide-white/[0.06] overflow-y-auto">
              {addableFriends.map((f) => (
                <AddRow key={f.email} profile={f} onAdd={onAdd} memberEmails={memberEmails} />
              ))}
            </div>
          )}
        </div>

        {/* Search anyone */}
        <div className="border border-white/[0.06] bg-card">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anyone by name or email…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          {query.trim().length >= 2 && (
            <div className="max-h-44 divide-y divide-white/[0.06] overflow-y-auto">
              {results.length === 0 && !searching ? (
                <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">No matches.</div>
              ) : (
                results.map((r) => (
                  <AddRow key={r.email} profile={r} onAdd={onAdd} memberEmails={memberEmails} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function NodeSettingsForm({ node, onSaved }: { node: NodeDetail["node"]; onSaved: () => void }) {
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiFetch(`/api/kith/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({}))).error || "Failed to save");
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await apiFetch(`/api/kith/nodes/${node.id}/avatar`, { method: "POST", body: form });
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({}))).error || "Upload failed");
    setUploading(false);
  }

  return (
    <div className="border border-white/[0.06] bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        <Settings className="h-3.5 w-3.5" /> Node settings
      </div>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          {node.avatarUrl ? (
            <img src={node.avatarUrl} alt="" className="h-16 w-16 rounded-md border border-white/[0.12] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-white/[0.12] bg-bg-primary">
              <Network className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-1 border border-white/[0.12] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06]">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageUp className="h-3 w-3" />} Avatar
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Name + description */}
        <div className="flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Node name"
            className="border border-white/[0.12] bg-bg-primary px-2 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="Description (optional)"
            className="resize-none border border-white/[0.12] bg-bg-primary px-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
          />
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex items-center gap-1.5 bg-accent-teal px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddRow({
  profile,
  onAdd,
  memberEmails,
}: {
  profile: UserProfile;
  onAdd: (email: string, name: string) => void;
  memberEmails: Set<string>;
}) {
  const [added, setAdded] = useState(false);
  const isMember = memberEmails.has(profile.email) || added;
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">{profile.name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{profile.email}</div>
      </div>
      <button
        disabled={isMember}
        onClick={() => {
          setAdded(true);
          onAdd(profile.email, profile.name);
        }}
        className="flex shrink-0 items-center gap-1 bg-accent-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-accent-teal/80 disabled:cursor-default disabled:bg-white/[0.06] disabled:text-muted-foreground"
      >
        {isMember ? <Check className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
        {isMember ? "Added" : "Add"}
      </button>
    </div>
  );
}
