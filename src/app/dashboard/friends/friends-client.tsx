"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { ProfileCardModal } from "@/app/dashboard/_components/profile-card";
import { UserPlus, Check, X, Clock, Loader2, Users, Camera, Search, Link2, MessageSquare } from "lucide-react";

interface Person {
  id: string;
  email: string;
  name: string;
  image: string;
}
interface FriendProvenance {
  howConnected: string;
  referredIn: string | null;
  mutuals: { sharedNodes: string[]; mutualFriends: number };
}
interface Friend extends Person {
  provenance: FriendProvenance;
}
interface FriendsData {
  friends: Friend[];
  incoming: Person[];
  outgoing: Person[];
}

function Avatar({ person, size = 36 }: { person: { name: string; image?: string }; size?: number }) {
  const initials =
    person.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  if (person.image) {
    return <img src={person.image} alt={person.name} width={size} height={size} className="shrink-0 object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export function FriendsClient() {
  const router = useRouter();
  const [data, setData] = useState<FriendsData>({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [friendsRes, inviteRes, suggestRes] = await Promise.all([
      apiFetch("/api/kith/friends"),
      apiFetch("/api/kith/invite"),
      apiFetch("/api/kith/friends/suggestions"),
    ]);
    if (friendsRes.ok) setData(await friendsRes.json());
    if (inviteRes.ok) {
      const { inviteLink: link } = await inviteRes.json();
      setInviteLink(link ?? "");
    }
    if (suggestRes.ok) setSuggestions(await suggestRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addByEmail(email: string, source?: "suggestion") {
    setError("");
    const res = await apiFetch("/api/kith/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
    if (res.ok) await load();
    else setError((await res.json().catch(() => ({}))).error || "Failed to send request");
  }

  async function openDM(email: string) {
    const res = await apiFetch("/api/kith/dm/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withEmail: email }),
    });
    if (res.ok) {
      const { threadId } = await res.json();
      router.push(`/dashboard/messages/${threadId}`);
    }
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
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Kith
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Your friends. Mutual connections unlock each other&apos;s profiles for warm-path scoring.
        </p>
      </div>

      <ProfileCard />

      {inviteLink && (
        <div className="mb-5 flex items-center gap-3 border border-white/[0.06] bg-card px-4 py-3">
          <Link2 className="h-4 w-4 shrink-0 text-accent-teal" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Your invite link</div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">{inviteLink}</div>
          </div>
          <button
            onClick={copyInvite}
            className="shrink-0 border border-white/[0.12] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <FriendSearch onAdd={addByEmail} />
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
                <Row key={p.id} person={p}>
                  <button onClick={() => respond(p.id, "accept")} className="flex items-center gap-1 border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-green-400 hover:bg-green-500/20">
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button onClick={() => respond(p.id, "block")} className="flex items-center gap-1 border border-white/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-red-500/10 hover:text-red-400">
                    <X className="h-3.5 w-3.5" /> Block
                  </button>
                </Row>
              ))
            )}
          </Section>

          <Section title="Friends" count={data.friends.length} icon={<Users className="h-3.5 w-3.5" />}>
            {data.friends.length === 0 ? (
              <Empty>No friends yet — search above.</Empty>
            ) : (
              data.friends.map((p) => (
                <Row key={p.email} person={p} provenance={p.provenance} onProfile={setProfileEmail}>
                  <button
                    onClick={() => openDM(p.email)}
                    className="flex items-center gap-1 border border-white/[0.12] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </button>
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

          {suggestions.length > 0 && (
            <Section title="People in your chapter" count={suggestions.length} icon={<Users className="h-3.5 w-3.5" />}>
              {suggestions.map((p) => (
                <Row key={p.email} person={p}>
                  <button
                    onClick={() => addByEmail(p.email, "suggestion").then(() => setSuggestions((prev) => prev.filter((s) => s.email !== p.email)))}
                    className="flex items-center gap-1 border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add
                  </button>
                </Row>
              ))}
            </Section>
          )}
        </div>
      )}

      {profileEmail && <ProfileCardModal email={profileEmail} onClose={() => setProfileEmail(null)} />}
    </div>
  );
}

// Current user's avatar + upload control.
function ProfileCard() {
  const [profile, setProfile] = useState<{ name: string; image: string }>({ name: "", image: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/api/kith/avatar").then(async (r) => {
      if (r.ok) setProfile(await r.json());
    });
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiFetch("/api/kith/avatar", { method: "POST", body: fd });
    if (res.ok) {
      const { image } = await res.json();
      setProfile((p) => ({ ...p, image }));
    } else {
      setErr((await res.json().catch(() => ({}))).error || "Upload failed");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mb-5 flex items-center gap-3 border border-white/[0.06] bg-card px-4 py-3">
      <Avatar person={profile} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{profile.name || "Your profile"}</div>
        <div className="text-[11px] text-muted-foreground">Profile picture · visible to your Kith & Nodes</div>
        {err && <div className="text-[11px] text-red-400">{err}</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 border border-white/[0.12] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/[0.06] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        Upload
      </button>
    </div>
  );
}

// Name/email typeahead → add as friend.
function FriendSearch({ onAdd }: { onAdd: (email: string) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await apiFetch(`/api/kith/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        setResults(await res.json());
        setOpen(true);
      }
    }, 200);
  }, [q]);

  async function pick(email: string) {
    await onAdd(email);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative mb-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.includes("@")) pick(q.trim());
        }}
        className="flex items-center gap-2 border border-white/[0.12] bg-card px-3"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search by name or email…"
          className="flex-1 bg-transparent py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </form>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full border border-white/[0.12] bg-bg-secondary shadow-2xl">
          {results.map((r) => (
            <button
              key={r.email}
              onClick={() => pick(r.email)}
              className="flex w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
            >
              <Avatar person={r} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-foreground">{r.name}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{r.email}</div>
              </div>
              <UserPlus className="h-4 w-4 shrink-0 text-accent-teal" />
            </button>
          ))}
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

function Row({
  person,
  provenance,
  onProfile,
  children,
}: {
  person: Person;
  provenance?: FriendProvenance;
  onProfile?: (email: string) => void;
  children: React.ReactNode;
}) {
  const Info = (
    <>
      <div className="truncate text-[13px] font-medium text-foreground">{person.name}</div>
      <div className="truncate font-mono text-[11px] text-muted-foreground">{person.email}</div>
      {provenance && <Provenance provenance={provenance} />}
    </>
  );
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar person={person} size={36} />
        {onProfile ? (
          <button onClick={() => onProfile(person.email)} className="min-w-0 text-left [&_.text-foreground]:hover:text-accent-teal">
            {Info}
          </button>
        ) : (
          <div className="min-w-0">{Info}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

// Dense connection-provenance line: how you connected · referral · mutual chip.
function Provenance({ provenance }: { provenance: FriendProvenance }) {
  const { howConnected, referredIn, mutuals } = provenance;
  const lead = [howConnected, referredIn].filter(Boolean).join(" • ");
  const chipParts: string[] = [];
  if (mutuals.mutualFriends > 0) chipParts.push(`${mutuals.mutualFriends} mutual${mutuals.mutualFriends === 1 ? "" : "s"}`);
  if (mutuals.sharedNodes.length > 0) {
    const noun = mutuals.sharedNodes.length === 1 ? "shared node" : "shared nodes";
    chipParts.push(`${mutuals.sharedNodes.length} ${noun}: ${mutuals.sharedNodes.join(", ")}`);
  }
  const chip = chipParts.join(" · ");
  if (!lead && !chip) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
      {lead && <span className="uppercase tracking-wider">{lead}</span>}
      {chip && (
        <span className="border border-accent-teal/20 bg-accent-teal/10 px-1.5 py-0.5 text-accent-teal/90">{chip}</span>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-4 text-[12px] text-muted-foreground">{children}</div>;
}
