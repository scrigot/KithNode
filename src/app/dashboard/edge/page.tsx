"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Target, Copy, Check, Users, Compass, ArrowUpRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/posthog";
import { CreditCost } from "@/components/credit-cost";
import type { EdgeResponse } from "@/app/api/edge/route";
import type { EdgeGap, EdgeDimension } from "@/lib/edge";

const DIM_ORDER: EdgeDimension[] = ["skills", "clubs", "experiences"];
const DIM_LABELS: Record<EdgeDimension, string> = {
  skills: "Skills",
  clubs: "Clubs",
  experiences: "Experience",
};

const gapKey = (g: EdgeGap) => `${g.dimension}:${g.trait}`;
const pct = (s: number) => `${Math.round(s * 100)}%`;

export default function EdgePage() {
  const [data, setData] = useState<EdgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/edge")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EdgeResponse | null) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
        if (d?.gaps?.length) {
          setSelected(gapKey(d.gaps[0]));
          trackEvent("edge_viewed", { gaps: d.gaps.length, cohort: d.cohortSize });
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGap = useMemo(
    () => data?.gaps.find((g) => gapKey(g) === selected) ?? null,
    [data, selected],
  );
  const tracks = data?.targetTracks ?? [];
  const trackLabel =
    tracks.length === 0
      ? "your target track"
      : tracks.length <= 3
        ? tracks.join(" / ")
        : "target-track";

  return (
    <div className="min-h-full bg-bg-primary p-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Target size={18} className="text-accent-teal" />
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
              THE EDGE
            </h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              What your {trackLabel} network has that you don&apos;t
            </p>
          </div>
        </div>
        {data?.enoughCohort && (
          <span className="font-mono text-[10px] text-text-muted">
            Based on{" "}
            <span className="font-bold tabular-nums text-accent-teal">{data.cohortSize}</span>{" "}
            target-track contacts
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="h-80 animate-pulse border border-white/[0.06] bg-bg-card" />
          <div className="h-80 animate-pulse border border-white/[0.06] bg-bg-card" />
        </div>
      ) : !data ? (
        <EmptyState
          icon={<Target size={22} />}
          heading="Couldn't load The Edge"
          body="Something went wrong fetching your gap analysis. Refresh to try again."
        />
      ) : !data.hasTargets ? (
        <EmptyState
          icon={<Compass size={22} />}
          heading="Set your target industries first"
          body="The Edge compares you against people already in the field you're recruiting for. Tell KithNode what you're targeting and it lights up."
          cta={{ href: "/dashboard/settings", label: "Set targets" }}
        />
      ) : !data.enoughCohort ? (
        <EmptyState
          icon={<Users size={22} />}
          heading={`Only ${data.cohortSize} of your contacts are in ${trackLabel}`}
          body={`The Edge needs at least ${data.minCohort} people in your target track to find honest patterns instead of noise. Import more of your network to unlock it.`}
          cta={{ href: "/dashboard/import", label: "Import contacts" }}
        />
      ) : data.gaps.length === 0 ? (
        Math.max(0, ...DIM_ORDER.map((d) => data.dimensionEligible[d])) < 3 ? (
          <EmptyState
            icon={<Users size={22} />}
            heading="Your contacts don't have enough profile data yet"
            body={`Only a handful of your ${trackLabel} contacts have skills, clubs, or experience on file — too few to spot real patterns. Enrich more of them (or import richer profiles) and The Edge sharpens up.`}
            cta={{ href: "/dashboard/contacts", label: "Enrich contacts" }}
          />
        ) : (
          <EmptyState
            icon={<Check size={22} />}
            heading={`Nothing common in ${trackLabel} that you're missing`}
            body="Across your target-track contacts with data on file, there's no skill, club, or experience most of them have and you don't. You're holding your own."
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <GapList gaps={data.gaps} selected={selected} onSelect={setSelected} />
          <HolderPanel gap={selectedGap} trackLabel={trackLabel} />
        </div>
      )}
    </div>
  );
}

// ── Left: ranked gaps grouped by dimension ───────────────────────────────────
function GapList({
  gaps,
  selected,
  onSelect,
}: {
  gaps: EdgeGap[];
  selected: string | null;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="border border-white/[0.06] bg-bg-card">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-sm font-bold uppercase tracking-wider text-accent-teal">
          Your gaps
        </p>
        <p className="mt-0.5 text-[10px] text-text-muted">
          Share of your target-track contacts (who have data on file) who hold each
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {DIM_ORDER.map((dim) => {
          const rows = gaps.filter((g) => g.dimension === dim);
          if (rows.length === 0) return null;
          return (
            <div key={dim} className="px-4 py-2.5">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-text-muted">
                {DIM_LABELS[dim]}
              </p>
              <div className="flex flex-col gap-1">
                {rows.map((g) => {
                  const key = gapKey(g);
                  const active = key === selected;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelect(key)}
                      className={`group flex items-center gap-3 px-2 py-1.5 text-left transition-colors ${
                        active
                          ? "bg-accent-teal/10 ring-1 ring-inset ring-accent-teal/40"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">
                        {g.trait}
                      </span>
                      <span className="h-1.5 w-16 shrink-0 bg-white/[0.06]">
                        <span
                          className="block h-full bg-accent-teal/70"
                          style={{ width: pct(g.support) }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-text-muted">
                        {g.holderCount}/{g.eligibleCount} · {pct(g.support)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Right: holders of the selected gap + one-click outreach ───────────────────
function HolderPanel({ gap, trackLabel }: { gap: EdgeGap | null; trackLabel: string }) {
  if (!gap) {
    return (
      <div className="flex items-center justify-center border border-white/[0.06] bg-bg-card p-8 text-center">
        <p className="text-[12px] text-text-muted">Select a gap to see who can help you close it.</p>
      </div>
    );
  }
  return (
    <div className="border border-white/[0.06] bg-bg-card">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-sm font-bold uppercase tracking-wider text-accent-teal">{gap.trait}</p>
        <p className="mt-0.5 text-[10px] text-text-muted">
          <span className="font-bold tabular-nums text-text-secondary">{gap.holderCount}</span> of{" "}
          {gap.eligibleCount} {trackLabel} contacts with {DIM_LABELS[gap.dimension].toLowerCase()} on
          file have this. Reach out and ask how they got it.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {gap.holders.map((h) => (
          <HolderRow key={h.id} id={h.id} name={h.name} trait={gap.trait} />
        ))}
      </div>
    </div>
  );
}

function HolderRow({ id, name, trait }: { id: string; name: string; trait: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const generate = useCallback(async () => {
    setState("loading");
    setErrMsg("");
    try {
      const res = await apiFetch("/api/outreach/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402) {
          throw new Error(
            body.error === "out_of_credits"
              ? "You're out of credits."
              : "Drafting is a paid feature.",
          );
        }
        throw new Error("Could not generate a draft. Try again.");
      }
      const body = await res.json();
      setDraft(body.draft ?? "");
      setSubject(body.subject ?? "");
      setState("done");
      trackEvent("edge_gap_drafted", { contact_id: id, trait });
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }, [id, trait]);

  const copy = useCallback(() => {
    const text = subject ? `Subject: ${subject}\n\n${draft}` : draft;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [draft, subject]);

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Link
          href={`/contact/${id}`}
          className="group flex min-w-0 flex-1 items-center gap-1 text-[13px] font-medium text-text-primary hover:text-accent-teal"
        >
          <span className="truncate">{name}</span>
          <ArrowUpRight size={12} className="shrink-0 opacity-0 group-hover:opacity-60" />
        </Link>
        <button
          type="button"
          onClick={generate}
          disabled={state === "loading"}
          className="flex shrink-0 items-center gap-1.5 border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20 disabled:opacity-40"
        >
          {state === "loading" ? "Drafting…" : state === "done" ? "Redraft" : "Draft"}
          <CreditCost action="draft" />
        </button>
      </div>

      {state === "error" && (
        <p className="mt-1.5 font-mono text-[10px] text-accent-red">{errMsg}</p>
      )}

      {state === "done" && (
        <div className="mt-2 border border-white/[0.08] bg-bg-primary p-2.5">
          {subject && (
            <p className="mb-1 text-[11px] font-bold text-text-secondary">{subject}</p>
          )}
          <p className="whitespace-pre-wrap text-[12px] leading-snug text-text-primary">{draft}</p>
          <button
            type="button"
            onClick={copy}
            className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-accent-teal"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────
function EmptyState({
  icon,
  heading,
  body,
  cta,
}: {
  icon: React.ReactNode;
  heading: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-white/[0.06] bg-bg-card px-6 py-16 text-center">
      <div className="mb-3 text-text-muted">{icon}</div>
      <p className="text-sm font-bold uppercase tracking-wider text-text-primary">{heading}</p>
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-text-muted">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 border border-accent-teal/30 bg-accent-teal/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-teal hover:bg-accent-teal/20"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
