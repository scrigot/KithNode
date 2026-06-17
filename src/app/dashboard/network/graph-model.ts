import type { RankedContact } from "@/lib/api";
import { normalizeTier, type Tier } from "@/app/dashboard/_components/home-feed";

// ─── Node / link model shared by the page and the canvas component ────────
export type NodeKind = "you" | "intermediary" | "target";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** short caption under target nodes, e.g. "Evercore · 92" */
  sub?: string;
  /** glyph drawn inside the node (initials / abbreviation) */
  glyph: string;
  /** radius in canvas units (drives nodeVal) */
  val: number;
  tier?: Tier;
  score?: number;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  /** 0..1, drives opacity + width */
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  nodeMap: Map<string, GraphNode>;
}

export interface NetworkStats {
  contacts: number;
  warmPaths: number;
  kith: number;
  hot: number;
  warm: number;
  monitor: number;
  cold: number;
  affiliations: number;
  avgWarmth: number;
}

// Detail derived for the right-hand panel.
export interface NodeDetail {
  id: string;
  /** Raw contact ID (without "c:" prefix) — used for /contact/[id] links */
  contactId: string;
  name: string;
  title: string;
  firm: string;
  score: number;
  tier: Tier;
  affiliations: string[];
  /** YOU → intermediary → target, as label segments */
  chains: string[][];
  hops: number;
  isRedacted?: boolean;
}

const YOU_ID = "you";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function affGlyph(name: string): string {
  const cleaned = name.replace(/[^A-Za-z\s]/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 3)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function tierRadius(tier: Tier, score: number): number {
  // Size by warmth; tier sets a floor so hot reads big even with sparse data.
  const base = 8 + (Math.max(0, Math.min(100, score)) / 100) * 8;
  const floor = tier === "kith" ? 14 : tier === "hot" ? 12 : tier === "warm" ? 10 : 8;
  return Math.max(base, floor);
}

/**
 * Build the "second brain" graph entirely client-side from /api/contacts.
 *  - YOU node (center)
 *  - intermediary node per UNIQUE affiliation name across all contacts
 *  - target node per contact, sized by warmth, colored by tier
 * Edges: YOU → each intermediary; intermediary → each target carrying it.
 * Contacts with no affiliation attach directly to YOU (a 1-hop direct edge).
 */
export function buildGraph(
  contacts: RankedContact[],
  youName: string,
): { data: GraphData; stats: NetworkStats; details: Map<string, NodeDetail> } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const details = new Map<string, NodeDetail>();

  // Center.
  nodes.push({
    id: YOU_ID,
    kind: "you",
    label: youName || "You",
    glyph: "YOU",
    val: 18,
  });

  // Collect affiliations -> intermediary node ids (deduped by trimmed name).
  const affId = new Map<string, string>(); // affName -> nodeId
  const affTargets = new Map<string, Set<string>>(); // affNodeId -> contactIds
  const targetScore = new Map<string, number>(); // targetId -> score (O(1) lookup)

  const tiers = { kith: 0, hot: 0, warm: 0, monitor: 0, cold: 0 };
  let scoreSum = 0;
  let warmPaths = 0;

  for (const c of contacts) {
    const tier = normalizeTier(c.score?.tier);
    const score = Math.round(c.score?.total_score ?? 0);
    tiers[tier]++;
    scoreSum += score;

    const targetId = `c:${c.id}`;
    const isRedacted = (c as RankedContact & { isRedacted?: boolean }).isRedacted;
    const affs = (c.affiliations ?? [])
      .map((a) => a.name?.trim())
      .filter((n): n is string => !!n);

    nodes.push({
      id: targetId,
      kind: "target",
      label: c.name || "Unknown",
      sub: `${c.company?.name || "—"} · ${score}`,
      // Redacted (non-own) contacts have block-char names — don't derive garbage initials.
      glyph: isRedacted ? "?" : initials(c.name || "?"),
      val: tierRadius(tier, score),
      tier,
      score,
    });
    targetScore.set(targetId, score);

    const chains: string[][] = [];
    if (affs.length > 0) {
      warmPaths++; // contact reachable via at least one warm path
      for (const aff of affs) {
        const key = aff.toLowerCase();
        let nodeId = affId.get(key);
        if (!nodeId) {
          nodeId = `a:${affId.size}`;
          affId.set(key, nodeId);
          affTargets.set(nodeId, new Set());
          nodes.push({
            id: nodeId,
            kind: "intermediary",
            label: aff,
            glyph: affGlyph(aff),
            val: 11,
          });
        }
        affTargets.get(nodeId)!.add(targetId);
        chains.push([youName || "YOU", aff, c.name || "Unknown"]);
      }
    } else {
      // No affiliation — direct YOU → target edge (1 hop).
      links.push({
        id: `l:you-${targetId}`,
        source: YOU_ID,
        target: targetId,
        strength: Math.min(1, 0.4 + score / 200),
      });
      chains.push([youName || "YOU", c.name || "Unknown"]);
    }

    details.set(targetId, {
      id: targetId,
      contactId: c.id,
      name: c.name || "Unknown",
      title: c.title || "",
      firm: c.company?.name || "",
      score,
      tier,
      affiliations: affs,
      chains,
      hops: affs.length > 0 ? 2 : 1,
      isRedacted,
    });
  }

  // YOU → intermediary edges + intermediary → target edges.
  for (const [nodeId, targets] of affTargets) {
    links.push({
      id: `l:you-${nodeId}`,
      source: YOU_ID,
      target: nodeId,
      // YOU→aff strength scales with how many contacts it unlocks.
      strength: Math.min(1, 0.5 + targets.size * 0.08),
    });
    for (const t of targets) {
      const sc = targetScore.get(t) ?? 0;
      links.push({
        id: `l:${nodeId}-${t}`,
        source: nodeId,
        target: t,
        strength: Math.min(1, 0.3 + sc / 200),
      });
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const stats: NetworkStats = {
    contacts: contacts.length,
    warmPaths,
    kith: tiers.kith,
    hot: tiers.hot,
    warm: tiers.warm,
    monitor: tiers.monitor,
    cold: tiers.cold,
    affiliations: affId.size,
    avgWarmth: contacts.length ? Math.round(scoreSum / contacts.length) : 0,
  };

  return { data: { nodes, links, nodeMap }, stats, details };
}
