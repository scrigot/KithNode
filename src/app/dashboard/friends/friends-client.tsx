"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { UserPlus, Check, X, Clock, Loader2, Users } from "lucide-react";

interface Person {
  email: string;
  name: string;
}
interface FriendsData {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
}

export function FriendsClient() {
  const [data, setData] = useState<FriendsData>({ friends: [], incoming: [], outgoing: [] });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch("/api/kith/friends");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await apiFetch("/api/kith/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setEmail("");
      await load();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Failed to send request");
    }
    setBusy(false);
  }

  async function respond(requesterId: string, action: "accept" | "block") {
    await apiFetch("/api/kith/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId, action }),
    });
    await load();
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Kith
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Your friends. Mutual connections unlock each other&apos;s profiles for warm-path scoring.
        </p>
      </div>

      {/* Add by email */}
      <form onSubmit={add} className="mb-6 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@university.edu"
          className="flex-1 border border-white/[0.12] bg-card px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent-teal focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1.5 bg-accent-teal px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-teal/80 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add
        </button>
      </form>
      {error && <p className="mb-4 text-[12px] text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Requests" count={data.incoming.length} icon={<Clock className="h-3.5 w-3.5" />}>
            {data.incoming.length === 0 ? (
              <Empty>No pending requests.</Empty>
            ) : (
              data.incoming.map((p) => (
                <Row key={p.email} person={p}>
                  <button
                    onClick={() => respond(p.email, "accept")}
                    className="flex items-center gap-1 border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-green-400 hover:bg-green-500/20"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => respond(p.email, "block")}
                    className="flex items-center gap-1 border border-white/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" /> Block
                  </button>
                </Row>
              ))
            )}
          </Section>

          <Section title="Friends" count={data.friends.length} icon={<Users className="h-3.5 w-3.5" />}>
            {data.friends.length === 0 ? (
              <Empty>No friends yet — add one above.</Empty>
            ) : (
              data.friends.map((p) => (
                <Row key={p.email} person={p}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">Mutual</span>
                </Row>
              ))
            )}
          </Section>

          {data.outgoing.length > 0 && (
            <Section title="Sent" count={data.outgoing.length} icon={<Clock className="h-3.5 w-3.5" />}>
              {data.outgoing.map((p) => (
                <Row key={p.email} person={p}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Pending</span>
                </Row>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {icon}
        {title}
        <span className="text-muted-foreground/40">{count}</span>
      </div>
      <div className="border border-white/[0.06] bg-card">{children}</div>
    </div>
  );
}

function Row({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">{person.name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{person.email}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-4 text-[12px] text-muted-foreground">{children}</div>;
}
