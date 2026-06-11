"use client";

import Link from "next/link";
import type { RankedContact } from "@/lib/api";
import { composeWhyNow } from "@/lib/why-now";

// ─── Tier helpers ───────────────────────────────────────────────────────
// Tier colors per DESIGN.md: HOT/red WARM/blue MONITOR/amber COLD/zinc.
export type Tier = "hot" | "warm" | "monitor" | "cold";

export function normalizeTier(t: string | undefined | null): Tier {
  const v = (t || "").toLowerCase();
  if (v === "hot" || v === "warm" || v === "monitor" || v === "cold") return v;
  return "cold";
}

export const TIER_TEXT: Record<Tier, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

export const TIER_CHIP: Record<Tier, string> = {
  hot: "bg-red-500/10 border-red-500/30 text-red-400",
  warm: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  monitor: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  cold: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
};

export const TIER_LABEL: Record<Tier, string> = {
  hot: "HOT",
  warm: "WARM",
  monitor: "MON",
  cold: "COLD",
};

// ─── Feed item model ────────────────────────────────────────────────────
export type DueBucket = "overdue" | "today" | "upcoming";

export interface FeedItem {
  id: string;
  name: string;
  title: string;
  firm: string;
  score: number;
  tier: Tier;
  /** JetBrains-Mono warm-path chain segments (teal-accented terms). */
  chain: string[];
  /** Lead-in word for the chain (e.g. "via", "") rendered muted. */
  chainLead?: string;
  whyNow: string;
  bucket: DueBucket;
  /** Right-aligned due badge text, e.g. "3D OVERDUE", "TODAY", "2D". */
  dueLabel: string;
  affiliations: string[];
  email?: string;
  linkedInUrl?: string;
  isRedacted?: boolean;
}

// ─── Derivation: build a sensible warm-path chain from a contact ─────────
// research P2: never render an empty field — derive a fallback.
export function deriveChain(
  warmPath: string,
  affiliations: string[],
  firm: string,
): { lead: string; segments: string[] } {
  const affs = affiliations.map((a) => a.trim()).filter(Boolean);
  const segments: string[] = [];
  if (warmPath && warmPath.trim()) segments.push(warmPath.trim());
  for (const a of affs) {
    if (segments.length >= 3) break;
    if (!segments.includes(a)) segments.push(a);
  }
  if (segments.length === 0) {
    // Last-resort fallback so the row is never blank.
    return { lead: "", segments: [firm ? `${firm} alum network` : "Shared network"] };
  }
  return { lead: "", segments };
}

export function deriveWhyNow(
  whyNow: string,
  affiliations: string[],
  bucket: DueBucket,
  dueLabel: string,
  title?: string,
  firm?: string,
  tier?: string,
): string {
  // /api/contacts maps `why_now` to the raw affiliations CSV, so guard against
  // echoing a bare affiliation list as the headline "why now" reason.
  const affJoin = affiliations.map((a) => a.trim()).filter(Boolean).join(", ");
  const looksLikeAffList = !!affJoin && whyNow.trim() === affJoin;
  if (whyNow && whyNow.trim() && !looksLikeAffList) return whyNow.trim();
  const top = affiliations.map((a) => a.trim()).filter(Boolean)[0];
  // OVERDUE urgency beats a generic hook — keep this branch exactly as-is.
  if (bucket === "overdue") {
    return top
      ? `Follow-up ${dueLabel.toLowerCase()} — ${top} connection still warm`
      : `Follow-up ${dueLabel.toLowerCase()} — re-engage before the window closes`;
  }
  return composeWhyNow({ affiliations, title, firm, tier });
}

// ─── Sub-components ──────────────────────────────────────────────────────
function ChainLine({ lead, segments }: { lead?: string; segments: string[] }) {
  return (
    <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-muted-foreground">
      {lead ? <span>{lead} </span> : null}
      {segments.map((seg, i) => (
        <span key={`${seg}-${i}`}>
          {i > 0 ? <span className="text-muted-foreground"> → </span> : null}
          <span className="text-primary">{seg}</span>
        </span>
      ))}
    </div>
  );
}

const DUE_BADGE: Record<DueBucket, string> = {
  overdue: "bg-red-500/10 border-red-500/30 text-red-400",
  today: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  upcoming: "bg-white/[0.04] border-white/[0.12] text-muted-foreground",
};

export function FeedDivider({
  label,
  color,
}: {
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.06] bg-card px-3 py-1.5">
      <span
        className={`text-[9px] font-bold uppercase tracking-[0.1em] ${color ?? "text-muted-foreground/60"}`}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

export function FeedRow({
  item,
  selected,
  onSelect,
  onDraft,
  onSkip,
  onAddToPipeline,
  pipelineAdded,
}: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
  onDraft: () => void;
  onSkip: () => void;
  onAddToPipeline: () => void;
  pipelineAdded: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`grid cursor-pointer grid-cols-[44px_1fr] border-b border-white/[0.06] transition-colors ${
        selected
          ? "border-l-2 border-l-primary bg-primary/[0.05]"
          : "hover:bg-white/[0.02]"
      }`}
    >
      {/* Score column */}
      <div
        className={`flex flex-col items-center justify-center gap-1 border-r py-2.5 ${
          selected ? "border-r-primary/20" : "border-r-white/[0.06]"
        }`}
      >
        <span
          className={`text-[15px] font-bold leading-none tabular-nums ${TIER_TEXT[item.tier]}`}
        >
          {item.score}
        </span>
        <span
          className={`border px-1 py-px font-mono text-[7px] font-bold uppercase tracking-[0.08em] ${TIER_CHIP[item.tier]}`}
        >
          {TIER_LABEL[item.tier]}
        </span>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-2">
          {item.isRedacted ? (
            <span className="text-[13px] font-semibold text-foreground">
              {item.name}
            </span>
          ) : (
            <Link
              href={`/contact/${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] font-semibold text-foreground hover:underline"
            >
              {item.name}
            </Link>
          )}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">
            {item.title ? `${item.title} · ` : ""}
            <span className="font-medium text-foreground">{item.firm}</span>
          </span>
          <span
            className={`ml-auto whitespace-nowrap border px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.07em] ${DUE_BADGE[item.bucket]}`}
          >
            {item.dueLabel}
          </span>
        </div>

        <ChainLine lead={item.chainLead} segments={item.chain} />

        <div className="text-[10px] italic text-muted-foreground">
          <span className="font-mono text-[8px] not-italic uppercase tracking-[0.08em] text-muted-foreground/60">
            Why now:{" "}
          </span>
          <span className="font-medium not-italic text-foreground/90">
            {item.whyNow}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDraft();
            }}
            className="border border-primary/30 bg-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/20"
          >
            Draft
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="border border-white/[0.12] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            Skip
          </button>
          {!item.isRedacted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToPipeline();
              }}
              disabled={pipelineAdded}
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] transition-colors ${
                pipelineAdded
                  ? "cursor-default border border-green-500/30 bg-green-500/10 text-green-400"
                  : "border border-accent-amber/30 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20"
              }`}
            >
              {pipelineAdded ? "In Pipeline" : "+ Pipeline"}
            </button>
          )}
          {item.linkedInUrl &&
            !item.isRedacted &&
            !item.linkedInUrl.includes("█") &&
            item.linkedInUrl.includes("linkedin.com") && (
              <a
                href={item.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-slate-500 transition-colors hover:text-accent-teal"
                title="LinkedIn profile"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>
              </a>
            )}
        </div>
      </div>
    </div>
  );
}

// ─── Build the feed from real data ──────────────────────────────────────
export interface OverdueLite {
  contactId: string;
  contactName: string;
  firmName: string;
  stage: string;
  days: number;
  isRedacted?: boolean;
}

export interface UnratedLite {
  contactId: string;
  contactName: string;
  firmName: string;
  score: number;
  tier: string;
}

/**
 * Compose the ranked feed:
 *  - OVERDUE  ← overview.top_overdue (pipeline follow-ups past due)
 *  - TODAY    ← top 2 highest-warmth actionable contacts
 *  - UPCOMING ← the rest of the high-warmth list + top_unrated
 * De-dupes by contact id; overdue wins.
 */
export function buildFeed(
  overdue: OverdueLite[],
  ranked: RankedContact[],
  unrated: UnratedLite[],
): FeedItem[] {
  const used = new Set<string>();
  const items: FeedItem[] = [];

  // OVERDUE
  for (const o of overdue) {
    if (used.has(o.contactId)) continue;
    used.add(o.contactId);
    const rc = ranked.find((r) => r.id === o.contactId);
    const affiliations = rc?.affiliations.map((a) => a.name) ?? [];
    const tier = normalizeTier(rc?.score.tier);
    const score = rc?.score.total_score ?? 0;
    const dueLabel = `${o.days}D OVERDUE`;
    const chain = deriveChain(rc?.warm_path ?? "", affiliations, o.firmName);
    items.push({
      id: o.contactId,
      name: o.contactName,
      title: rc?.title ?? "",
      firm: o.firmName,
      score: Math.round(score),
      tier,
      chain: chain.segments,
      chainLead: chain.lead,
      whyNow: deriveWhyNow(rc?.why_now ?? "", affiliations, "overdue", dueLabel, rc?.title, o.firmName, tier),
      bucket: "overdue",
      dueLabel,
      affiliations,
      email: rc?.email,
      linkedInUrl: rc?.linkedin_url,
      isRedacted: o.isRedacted,
    });
  }

  // Actionable, high-warmth contacts not already overdue, ordered by score.
  const actionable = [...ranked]
    .filter((r) => !used.has(r.id))
    .sort((a, b) => b.score.total_score - a.score.total_score);

  const TODAY_COUNT = 2;
  actionable.forEach((r, idx) => {
    used.add(r.id);
    const bucket: DueBucket = idx < TODAY_COUNT ? "today" : "upcoming";
    const affiliations = r.affiliations.map((a) => a.name);
    const chain = deriveChain(r.warm_path, affiliations, r.company.name);
    // Only OVERDUE rows carry a real days value; never fabricate a due date
    // from the sort index — upcoming rows are simply "queued".
    const dueLabel = bucket === "today" ? "TODAY" : "QUEUED";
    items.push({
      id: r.id,
      name: r.name,
      title: r.title,
      firm: r.company.name,
      score: Math.round(r.score.total_score),
      tier: normalizeTier(r.score.tier),
      chain: chain.segments,
      chainLead: chain.lead,
      whyNow: deriveWhyNow(r.why_now, affiliations, bucket, dueLabel, r.title, r.company.name, r.score.tier),
      bucket,
      dueLabel,
      affiliations,
      email: r.email,
      linkedInUrl: r.linkedin_url,
      isRedacted: (r as RankedContact & { isRedacted?: boolean }).isRedacted,
    });
  });

  // Fold in top_unrated that nothing else covered (UPCOMING).
  for (const u of unrated) {
    if (used.has(u.contactId)) continue;
    used.add(u.contactId);
    const tier = normalizeTier(u.tier);
    items.push({
      id: u.contactId,
      name: u.contactName,
      title: "",
      firm: u.firmName,
      score: Math.round(u.score),
      tier,
      // Unrated contacts have no derived warm path yet — prompt to rate rather
      // than fabricate a chain/reason (authenticity over filling the field).
      chain: ["Rate in Discover to map the warm path"],
      chainLead: "",
      whyNow: "High score, not yet rated — rate to surface the warm path",
      bucket: "upcoming",
      dueLabel: "RATE",
      affiliations: [],
    });
  }

  return items;
}
