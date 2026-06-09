"use client";

import type { RankedContact } from "@/lib/api";

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
): string {
  // /api/contacts maps `why_now` to the raw affiliations CSV, so guard against
  // echoing a bare affiliation list as the headline "why now" reason.
  const affJoin = affiliations.map((a) => a.trim()).filter(Boolean).join(", ");
  const looksLikeAffList = !!affJoin && whyNow.trim() === affJoin;
  if (whyNow && whyNow.trim() && !looksLikeAffList) return whyNow.trim();
  const top = affiliations.map((a) => a.trim()).filter(Boolean)[0];
  if (bucket === "overdue") {
    return top
      ? `Follow-up ${dueLabel.toLowerCase()} — ${top} connection still warm`
      : `Follow-up ${dueLabel.toLowerCase()} — re-engage before the window closes`;
  }
  if (top) return `${top} overlap — strong, genuine first-touch hook`;
  return "High-warmth match — reach while the signal is fresh";
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
}: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
  onDraft: () => void;
  onSkip: () => void;
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
          <span className="text-[13px] font-semibold text-foreground">
            {item.name}
          </span>
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
        </div>
      </div>
    </div>
  );
}

// ─── Build the feed from real data ──────────────────────────────────────
export interface OverdueLite {
  contactId: string;
  contactName: string;
  organization: string;
  stage: string;
  days: number;
  isRedacted?: boolean;
}

export interface UnratedLite {
  contactId: string;
  contactName: string;
  organization: string;
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
    const chain = deriveChain(rc?.warm_path ?? "", affiliations, o.organization);
    items.push({
      id: o.contactId,
      name: o.contactName,
      title: rc?.title ?? "",
      firm: o.organization,
      score: Math.round(score),
      tier,
      chain: chain.segments,
      chainLead: chain.lead,
      whyNow: deriveWhyNow(rc?.why_now ?? "", affiliations, "overdue", dueLabel),
      bucket: "overdue",
      dueLabel,
      affiliations,
      email: rc?.email,
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
      whyNow: deriveWhyNow(r.why_now, affiliations, bucket, dueLabel),
      bucket,
      dueLabel,
      affiliations,
      email: r.email,
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
      firm: u.organization,
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
