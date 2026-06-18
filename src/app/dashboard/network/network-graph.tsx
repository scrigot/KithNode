"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from "react-force-graph-2d";
import type { GraphNode, GraphLink, GraphData } from "./graph-model";

// ─── Palette (mirrors brand/dashboard.md tokens) ──────────────────────────────────
const C = {
  accent: "#0EA5E9",
  text: "#E5E9F0",
  muted: "#8A94A6",
  hot: "#F87171",
  warm: "#60A5FA",
  monitor: "#FBBF24",
  cold: "#A1A1AA",
  you: "#0EA5E9",
};

// graph-model sizes nodes 8..18; for the Obsidian dot-field we render ~0.4x.
const RADIUS_SCALE = 0.4;

// Node augmented with the runtime fields the d3 engine assigns + our cluster tag.
type SimNode = GraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  __cluster?: string;
};
type RGNode = NodeObject<GraphNode>;

function nodeColor(n: GraphNode): string {
  if (n.kind === "you") return C.you;
  switch (n.tier) {
    case "hot":
      return C.hot;
    case "warm":
      return C.warm;
    case "monitor":
      return C.monitor;
    default:
      return C.cold;
  }
}

// Custom d3 force: pull every node toward the centroid of its cluster so people
// who share an affiliation visibly group, with NO hub nodes and NO edges. Plain
// JS (no d3-force dep). Unclustered nodes drift under the charge force.
function clusterForce(strength: number) {
  let nodes: SimNode[] = [];
  const force = (alpha: number) => {
    const sx = new Map<string, number>();
    const sy = new Map<string, number>();
    const cn = new Map<string, number>();
    for (const n of nodes) {
      const k = n.__cluster;
      if (!k || n.x == null || n.y == null) continue;
      sx.set(k, (sx.get(k) ?? 0) + n.x);
      sy.set(k, (sy.get(k) ?? 0) + n.y);
      cn.set(k, (cn.get(k) ?? 0) + 1);
    }
    const kk = strength * alpha;
    for (const n of nodes) {
      const c = n.__cluster;
      if (!c || n.x == null || n.y == null) continue;
      const count = cn.get(c) ?? 1;
      n.vx = (n.vx ?? 0) + ((sx.get(c) ?? 0) / count - n.x) * kk;
      n.vy = (n.vy ?? 0) + ((sy.get(c) ?? 0) / count - n.y) * kk;
    }
  };
  (force as unknown as { initialize: (n: SimNode[]) => void }).initialize = (
    n,
  ) => {
    nodes = n;
  };
  return force;
}

// Minimal shape of a tunable d3 force (avoids importing d3-force types).
type ForceLike = {
  strength: (s: number) => ForceLike;
  distanceMax: (d: number) => ForceLike;
};

// ─── Starfield: pure-CSS twinkling stars (GPU compositor, zero JS per frame) ─
// Each layer is one div whose background is a list of tiny radial-gradient dots;
// opacity is animated by CSS so there's no requestAnimationFrame on the main
// thread competing with the graph.
function Starfield() {
  const layers = useMemo(() => {
    const make = (n: number, size: number) => {
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const x = (Math.random() * 100).toFixed(2);
        const y = (Math.random() * 100).toFixed(2);
        const col =
          Math.random() < 0.22 ? "rgba(56,189,248,0.9)" : "rgba(226,232,240,0.9)";
        parts.push(`radial-gradient(circle ${size}px at ${x}% ${y}%, ${col}, transparent)`);
      }
      return parts.join(",");
    };
    return [make(46, 1.4), make(34, 1), make(22, 1.9)];
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes kn-twinkle { from { opacity: 0.28 } to { opacity: 0.72 } }
        .kn-star { background-repeat: no-repeat; animation: kn-twinkle ease-in-out infinite alternate; will-change: opacity; }
      `}</style>
      {layers.map((bg, i) => (
        <div
          key={i}
          className="kn-star absolute inset-0"
          style={{
            backgroundImage: bg,
            animationDuration: `${3.5 + i * 1.4}s`,
            animationDelay: `${i * 0.9}s`,
          }}
        />
      ))}
    </div>
  );
}

export function NetworkGraph({
  data,
  selectedId,
  onSelect,
}: {
  data: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const fgRef =
    useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const didFit = useRef(false);

  // ── People-only graph derived from the full model ──────────────────────
  // Drop affiliation (intermediary) nodes; keep YOU + contacts. Each contact's
  // cluster = the first affiliation hub that linked to it.
  const { nodes, peopleById, youNode, clusterOf } = useMemo(() => {
    const eid = (e: unknown): string =>
      e !== null && typeof e === "object" ? (e as GraphNode).id : (e as string);
    const clusterOf = new Map<string, string>();
    for (const l of data.links) {
      const s = eid(l.source);
      const t = eid(l.target);
      if (s.startsWith("a:") && t.startsWith("c:") && !clusterOf.has(t)) {
        clusterOf.set(t, s);
      }
    }
    const nodes: SimNode[] = [];
    const peopleById = new Map<string, SimNode>();
    let youNode: SimNode | undefined;
    for (const n of data.nodes) {
      if (n.kind === "intermediary") continue;
      const sn = n as SimNode;
      if (n.kind === "target") sn.__cluster = clusterOf.get(n.id);
      if (n.kind === "you") {
        sn.fx = 0;
        sn.fy = 0;
        youNode = sn;
      }
      nodes.push(sn);
      peopleById.set(n.id, sn);
    }
    return { nodes, peopleById, youNode, clusterOf };
  }, [data]);

  // Size the canvas to its container (force-graph needs explicit px).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Tune forces: light repulsion + cluster attraction + gentle center, settling
  // fast so the engine stops (and redraws cease) quickly.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = fg.d3Force("charge") as unknown as ForceLike | undefined;
    charge?.strength(-22).distanceMax(170);
    const center = fg.d3Force("center") as unknown as ForceLike | undefined;
    center?.strength(0.02);
    fg.d3Force(
      "cluster",
      clusterForce(0.22) as unknown as Parameters<typeof fg.d3Force>[1],
    );
    didFit.current = false;
    fg.d3ReheatSimulation();
  }, [nodes]);

  // Lit neighborhood for the active node: the person, YOU, and same-cluster peers.
  const active = selectedId ?? hoverId;
  const litNodes = useMemo(() => {
    const s = new Set<string>();
    if (!active) return s;
    s.add(active);
    s.add("you");
    const ac = clusterOf.get(active);
    if (ac) for (const [pid, c] of clusterOf) if (c === ac) s.add(pid);
    return s;
  }, [active, clusterOf]);

  const dimmed = active != null;

  // Warm-path line drawn UNDER the nodes when a contact is active (person → YOU).
  const paintPre = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      if (!active || active === "you" || !youNode) return;
      const a = peopleById.get(active);
      if (
        !a ||
        a.x == null ||
        a.y == null ||
        youNode.x == null ||
        youNode.y == null
      )
        return;
      ctx.strokeStyle = "rgba(14,165,233,0.55)";
      ctx.lineWidth = 1.3 / scale;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(youNode.x, youNode.y);
      ctx.stroke();
    },
    [active, peopleById, youNode],
  );

  // Lean node paint: no ctx.save/restore, no shadowBlur (both are per-frame
  // killers). globalAlpha is reset to 1 at the end of each node.
  const paintNode = useCallback(
    (raw: RGNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const node = raw as SimNode;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const inLit = litNodes.has(node.id);
      const lit = !dimmed || inLit;
      const col = nodeColor(node);
      const r = node.val * RADIUS_SCALE;
      const isActive = node.id === active;

      // Cheap halo (translucent ring fill) instead of shadowBlur for the glow.
      if (isActive) {
        ctx.globalAlpha = lit ? 0.2 : 0.08;
        ctx.beginPath();
        ctx.arc(x, y, r + 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = col;
        ctx.fill();
      }

      ctx.globalAlpha = lit ? 1 : 0.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = col;
      ctx.fill();

      if (node.kind === "you") {
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
        ctx.lineWidth = 1.2 / scale;
        ctx.strokeStyle = "rgba(14,165,233,0.5)";
        ctx.stroke();
      }

      // Labels: YOU always; the hovered/selected person; otherwise only zoomed in.
      let showLabel = node.kind === "you";
      if (dimmed) showLabel = showLabel || isActive;
      else if (scale > 1.7) showLabel = showLabel || node.kind === "target";

      if (showLabel) {
        const emphatic = isActive || node.kind === "you";
        const fs = (emphatic ? 11 : 9.5) / scale;
        ctx.font = `500 ${fs}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = node.kind === "you" ? C.accent : C.text;
        ctx.fillText(node.label, x, y + r + 2 / scale);
        if (emphatic && node.kind === "target" && node.sub) {
          ctx.font = `400 ${fs - 1}px "JetBrains Mono", monospace`;
          ctx.fillStyle = C.muted;
          ctx.fillText(node.sub, x, y + r + 2 / scale + fs * 1.15);
        }
      }

      ctx.globalAlpha = 1;
    },
    [active, dimmed, litNodes],
  );

  const paintPointer = useCallback(
    (raw: RGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const node = raw as SimNode;
      ctx.fillStyle = color;
      ctx.beginPath();
      // Generous hit area (+6) so small dots are easy to click/hover.
      ctx.arc(node.x ?? 0, node.y ?? 0, node.val * RADIUS_SCALE + 6, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <Starfield />
      <ForceGraph2D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={{ nodes, links: [] }}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={1}
        nodeVal={(n) => (n as GraphNode).val}
        warmupTicks={20}
        cooldownTicks={110}
        d3VelocityDecay={0.45}
        d3AlphaDecay={0.045}
        enableNodeDrag={false}
        onEngineStop={() => {
          // Freeze every node where it landed so hovering/clicking doesn't chase
          // a moving target — the graph goes completely static after it settles.
          for (const n of nodes) {
            n.fx = n.x;
            n.fy = n.y;
          }
          if (didFit.current) return;
          didFit.current = true;
          fgRef.current?.zoomToFit(600, 80);
        }}
        onRenderFramePre={paintPre}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointer}
        onNodeClick={(n) => {
          const id = (n as GraphNode).id;
          onSelect(id === selectedId ? null : id);
        }}
        onNodeHover={(n) => setHoverId(n ? (n as GraphNode).id : null)}
        onBackgroundClick={() => onSelect(null)}
      />
    </div>
  );
}
