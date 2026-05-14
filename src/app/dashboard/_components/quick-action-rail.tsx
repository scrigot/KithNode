"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Plus, Minus, Filter } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const TIER_FILL: Record<string, string> = {
  hot: "#f87171",
  warm: "#60a5fa",
  monitor: "#fbbf24",
  cold: "#a1a1aa",
};

const TIER_COLOR: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIERS = ["hot", "warm", "monitor", "cold"] as const;
type Tier = (typeof TIERS)[number];

interface OverviewData {
  tier_counts: Record<Tier, number>;
  top_unrated: Array<{
    contactId: string;
    contactName: string;
    firmName: string;
    score: number;
    tier: string;
  }>;
  weekly_goal_done: number;
  weekly_goal_target: number;
}

export function QuickActionRail() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Set<Tier>>(
    new Set(["hot", "warm"]),
  );
  const [localTarget, setLocalTarget] = useState<number | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OverviewData | null) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.tier_counts).reduce((a, b) => a + b, 0);
  }, [data]);

  const nextBest = data?.top_unrated?.[0];
  const target = localTarget ?? data?.weekly_goal_target ?? 3;
  const done = data?.weekly_goal_done ?? 0;

  function toggleTier(t: Tier) {
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function updateTarget(delta: number) {
    const next = Math.max(1, Math.min(20, target + delta));
    setLocalTarget(next);
    try {
      const res = await apiFetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly_goal_target: next }),
      });
      if (!res.ok) {
        setSaveHint("Saved locally, sync TBD");
      } else {
        setSaveHint(null);
      }
    } catch {
      setSaveHint("Saved locally, sync TBD");
    }
  }

  function applyFilter() {
    const tiers = Array.from(selectedTiers).join(",");
    if (tiers) router.push(`/dashboard/contacts?tier=${tiers}`);
    else router.push("/dashboard/contacts");
  }

  return (
    <aside className="hidden xl:flex w-[320px] shrink-0 flex-col gap-1 border-l border-white/[0.06] bg-bg-secondary p-2">
      {/* Next Best Action */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Zap size={12} />
            Next Best Action
          </span>
        </div>
        <div className="p-3">
          {nextBest ? (
            <>
              <p className="text-[13px] font-bold text-foreground">
                {nextBest.contactName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {nextBest.firmName}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  Score
                </span>
                <span
                  className={`font-mono text-[14px] font-bold tabular-nums ${TIER_COLOR[nextBest.tier?.toLowerCase()] ?? "text-zinc-400"}`}
                >
                  {Math.round(nextBest.score)}
                </span>
              </div>
              <Link
                href={`/dashboard/contacts/${nextBest.contactId}`}
                className="mt-3 flex w-full items-center justify-center gap-1.5 border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
              >
                Draft Outreach
              </Link>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              All rated. Discover more contacts.
            </p>
          )}
        </div>
      </div>

      {/* Tier Filter */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Filter size={12} />
            Tier Filter
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 p-2">
          {TIERS.map((t) => {
            const count = data?.tier_counts[t] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const active = selectedTiers.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTier(t)}
                className={`flex flex-col gap-0.5 border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/5"
                    : "border-white/[0.06] bg-background hover:border-white/[0.18]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5"
                    style={{ background: TIER_FILL[t] }}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${TIER_COLOR[t]}`}
                  >
                    {t}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">
                    {count}
                  </span>
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={applyFilter}
          className="w-full border-t border-white/[0.06] bg-background py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:bg-white/[0.04] hover:text-foreground"
        >
          Apply Filter →
        </button>
      </div>

      {/* Weekly Goal Stepper */}
      <div className="border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Weekly Coffee Chats
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {done}
              <span className="text-sm text-muted-foreground">/{target}</span>
            </span>
            <span
              className={`text-[10px] ${done >= target ? "text-accent-green" : "text-accent-amber"}`}
            >
              {done >= target ? "goal hit" : `${target - done} to go`}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden bg-white/[0.06]">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, target > 0 ? (done / target) * 100 : 0)}%`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
              Target / week
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateTarget(-1)}
                aria-label="Decrease target"
                className="border border-white/[0.06] bg-background p-1 hover:bg-white/[0.04]"
              >
                <Minus size={10} />
              </button>
              <span className="w-6 text-center font-mono text-[11px] font-bold tabular-nums text-foreground">
                {target}
              </span>
              <button
                onClick={() => updateTarget(1)}
                aria-label="Increase target"
                className="border border-white/[0.06] bg-background p-1 hover:bg-white/[0.04]"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
          {saveHint && (
            <p className="mt-1 text-[9px] text-muted-foreground/60">
              {saveHint}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/dashboard/discover"
        className="mt-1 flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-primary/80"
      >
        <Zap size={12} />
        Discover Contacts
      </Link>
    </aside>
  );
}
