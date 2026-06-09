"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Share2, Upload, Compass, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { RankedContact } from "@/lib/api";
import { TIER_CHIP, TIER_LABEL, type Tier } from "@/app/dashboard/_components/home-feed";
import { buildGraph, type NodeDetail } from "./graph-model";

// react-force-graph-2d is canvas-only and touches window/document at module
// load — it MUST be client-only. Load via next/dynamic with ssr:false.
const NetworkGraph = dynamic(
  () => import("./network-graph").then((m) => m.NetworkGraph),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground/60">
          Rendering graph…
        </span>
      </div>
    ),
  },
);

const TIER_DOT: Record<Tier, string> = {
  hot: "#F87171",
  warm: "#60A5FA",
  monitor: "#FBBF24",
  cold: "#A1A1AA",
};

export default function NetworkPage() {
  const { data: session } = useSession();
  const youName = session?.user?.name?.split(" ")[0] || "You";
  const [contacts, setContacts] = useState<RankedContact[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/contacts")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: RankedContact[]) => {
        if (!cancelled) setContacts(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    if (tierFilter === "all") return contacts;
    return contacts.filter(
      (c) => (c.score?.tier || "cold").toLowerCase() === tierFilter,
    );
  }, [contacts, tierFilter]);

  const { data, stats, details } = useMemo(
    () => buildGraph(filtered, youName),
    [filtered, youName],
  );

  // Resolve selected detail (only target nodes have one).
  const detail: NodeDetail | null = selectedId
    ? (details.get(selectedId) ?? null)
    : null;

  // ─── Loading ──────────────────────────────────────────────────────────
  if (contacts === null) {
    return (
      <div className="flex h-[calc(100vh-49px)] items-center justify-center lg:h-screen">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground/60">
          Loading network…
        </span>
      </div>
    );
  }

  // ─── Empty state — guide Import / Discover, never a blank canvas ───────
  if (contacts.length === 0) {
    return (
      <div className="flex h-[calc(100vh-49px)] flex-col items-center justify-center px-6 text-center lg:h-screen">
        <div className="flex h-12 w-12 items-center justify-center border border-accent-teal/30 bg-accent-teal/10">
          <Share2 className="h-5 w-5 text-accent-teal" />
        </div>
        <h2 className="mt-4 text-sm font-bold uppercase tracking-wider text-foreground">
          Your network map is empty
        </h2>
        <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
          Import your LinkedIn connections or surface high-value contacts in
          Discover to build the warm-path graph from YOU to every target.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Link
            href="/dashboard/import"
            className="inline-flex items-center gap-1.5 bg-accent-teal px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-bg-primary transition-opacity hover:opacity-90"
          >
            <Upload className="h-3.5 w-3.5" />
            Import contacts
          </Link>
          <Link
            href="/dashboard/discover"
            className="inline-flex items-center gap-1.5 border border-white/[0.12] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-accent-teal/40 hover:text-accent-teal"
          >
            <Compass className="h-3.5 w-3.5" />
            Open Discover
          </Link>
        </div>
      </div>
    );
  }

  // ─── Graph view ───────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-49px)] flex-col lg:h-screen">
      {/* Top bar: title + live stats + tier filters */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
            Network
          </span>
          <div className="hidden items-center gap-3 md:flex">
            <Stat label="contacts" value={stats.contacts} />
            <Sep />
            <Stat label="warm paths" value={stats.warmPaths} />
            <Sep />
            <Stat label="affiliations" value={stats.affiliations} />
            <Sep />
            <Stat label="avg warmth" value={stats.avgWarmth} />
            <Sep />
            <Stat label="HOT" value={stats.hot} accent="#F87171" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "hot", "warm", "monitor", "cold"] as const).map((t) => {
            const on = tierFilter === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setTierFilter(t);
                  setSelectedId(null);
                }}
                className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] transition-colors ${
                  on
                    ? "border-accent-teal/35 bg-accent-teal/10 text-accent-teal"
                    : "border-white/[0.10] text-muted-foreground hover:border-white/20 hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : TIER_LABEL[t as Tier]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content row: graph canvas + detail panel */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-bg-primary">
          <NetworkGraph
            data={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Top-left overlay: title + legend */}
          <div className="pointer-events-none absolute left-4 top-3 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground">
              {youName}&apos;s Network
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {stats.contacts} contacts · {stats.warmPaths} warm paths ·{" "}
              <span className="text-red-400">{stats.hot} HOT</span>
            </span>
            <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
              Tier
            </div>
            {(
              [
                ["hot", "HOT · ≥ 85"],
                ["warm", "WARM · 60–84"],
                ["monitor", "MONITOR · 35–59"],
                ["cold", "COLD · < 35"],
              ] as const
            ).map(([t, lbl]) => (
              <div
                key={t}
                className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: TIER_DOT[t as Tier] }}
                />
                {lbl}
              </div>
            ))}
          </div>

          {/* Bottom-left tier count strip (mirrors mockup) */}
          <div className="absolute bottom-4 left-4 flex gap-4 border border-white/[0.06] bg-card px-3.5 py-2">
            {(
              [
                ["hot", stats.hot, "#F87171"],
                ["warm", stats.warm, "#60A5FA"],
                ["monitor", stats.monitor, "#FBBF24"],
                ["cold", stats.cold, "#A1A1AA"],
              ] as const
            ).map(([lbl, val, col], i) => (
              <div key={lbl} className="flex items-center gap-4">
                {i > 0 && <div className="h-7 w-px bg-white/[0.06]" />}
                <div className="text-center">
                  <div
                    className="font-mono text-lg font-medium leading-none tabular-nums"
                    style={{ color: col }}
                  >
                    {val}
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/60">
                    {lbl}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="hidden w-[300px] flex-shrink-0 flex-col border-l border-white/[0.06] bg-card lg:flex">
          {detail ? (
            <DetailPanel detail={detail} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <Share2 className="h-5 w-5 text-muted-foreground/40" />
              <p className="mt-3 text-[11px] text-muted-foreground">
                Click a contact node to trace its warm path and draft outreach.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────
function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.04em] text-muted-foreground">
      <span
        className="font-medium tabular-nums"
        style={{ color: accent ?? "var(--color-foreground, #E5E9F0)" }}
      >
        {value}
      </span>
      {label}
    </span>
  );
}

function Sep() {
  return <span className="h-3 w-px bg-white/[0.10]" />;
}

function DetailPanel({
  detail,
  onClose,
}: {
  detail: NodeDetail;
  onClose: () => void;
}) {
  const pct = Math.max(0, Math.min(100, detail.score));
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Node Detail
        </span>
        <button
          onClick={onClose}
          aria-label="Close detail"
          className="border border-white/[0.10] px-1.5 py-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Metrics strip */}
      <div className="flex border-b border-white/[0.06]">
        <Metric value={String(detail.score)} label="Warmth" accent="#0EA5E9" />
        <Metric value={String(detail.hops)} label="Hops" />
        <Metric
          value={TIER_LABEL[detail.tier]}
          label="Tier"
          accent={TIER_DOT[detail.tier]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Identity */}
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center border text-[13px] font-bold ${TIER_CHIP[detail.tier]}`}
          >
            {detail.name
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight text-foreground">
              {detail.name}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {detail.title ? `${detail.title} · ` : ""}
              {detail.firm || "—"}
            </div>
            <span
              className={`mt-1.5 inline-flex items-center border px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${TIER_CHIP[detail.tier]}`}
            >
              {TIER_LABEL[detail.tier]} · {detail.score}
            </span>
          </div>
        </div>

        {/* Warmth bar */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
            Warmth Score
          </span>
          <span className="font-mono text-[22px] font-medium leading-none text-accent-teal">
            {detail.score}
          </span>
        </div>
        <div className="mb-4 h-[3px] bg-white/[0.06]">
          <div
            className="h-full bg-accent-teal shadow-[0_0_6px_rgba(14,165,233,0.35)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="my-3.5 h-px bg-white/[0.06]" />

        {/* Warm path chain(s) */}
        <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Warm Path
        </div>
        <div className="mb-3.5 border border-accent-teal/12 bg-accent-teal/[0.05] px-3 py-2.5">
          {detail.chains.map((chain, ci) => (
            <div
              key={ci}
              className="font-mono text-[11px] leading-[1.7] text-muted-foreground"
            >
              {chain.map((seg, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-muted-foreground/60"> → </span>}
                  <span className="text-accent-teal">{seg}</span>
                </span>
              ))}
            </div>
          ))}
          <div className="mt-1 text-[10px] text-muted-foreground/60">
            {detail.hops} hop{detail.hops === 1 ? "" : "s"}
            {detail.affiliations.length > 0
              ? ` · via ${detail.affiliations.length} affiliation${detail.affiliations.length === 1 ? "" : "s"}`
              : " · direct connection"}
          </div>
        </div>

        {/* Affiliations */}
        {detail.affiliations.length > 0 && (
          <>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
              Affiliations
            </div>
            <div className="mb-3.5 flex flex-wrap gap-1.5">
              {detail.affiliations.map((a) => (
                <span
                  key={a}
                  className="border border-white/[0.10] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {a}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action */}
      <div className="border-t border-white/[0.06] p-4">
        <Link
          href="/dashboard/contacts"
          className="flex w-full items-center justify-center bg-accent-teal px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-bg-primary transition-opacity hover:opacity-90"
        >
          Draft Outreach
        </Link>
      </div>
    </>
  );
}

function Metric({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex-1 border-r border-white/[0.06] px-3 py-2.5 text-center last:border-r-0">
      <span
        className="block font-mono text-[16px] font-medium leading-none"
        style={{ color: accent ?? "var(--color-foreground, #E5E9F0)" }}
      >
        {value}
      </span>
      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}
