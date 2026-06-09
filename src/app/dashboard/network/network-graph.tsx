"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-2d";
import type { GraphNode, GraphLink, GraphData } from "./graph-model";

// ─── Palette (mirrors DESIGN.md tokens) ──────────────────────────────────
const C = {
  bg: "#0A1628",
  panel: "#0E1B2E",
  accent: "#0EA5E9",
  text: "#E5E9F0",
  muted: "#8A94A6",
  hot: "#F87171",
  warm: "#60A5FA",
  monitor: "#FBBF24",
  cold: "#A1A1AA",
  you: "#0EA5E9",
};

// Domain node/link enriched with the runtime x/y the engine assigns.
type RGNode = NodeObject<GraphNode>;
type RGLink = LinkObject<GraphNode, GraphLink>;

function nodeColor(n: GraphNode): string {
  if (n.kind === "you") return C.you;
  if (n.kind === "intermediary") return C.accent;
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

  // Resolve which nodes/links are "lit" given the active node (selected wins,
  // else hover). For a target, the warm path is YOU → intermediaries → target.
  const active = selectedId ?? hoverId;
  const { litNodes, litLinks } = useMemo(() => {
    const nodes = new Set<string>();
    const links = new Set<string>();
    if (!active) return { litNodes: nodes, litLinks: links };
    nodes.add(active);
    for (const l of data.links) {
      if (l.source === active || l.target === active) {
        nodes.add(l.source);
        nodes.add(l.target);
        links.add(l.id);
      }
    }
    // Second hop: from any newly-lit intermediary back to YOU.
    const interm = [...nodes].filter(
      (id) => data.nodeMap.get(id)?.kind === "intermediary",
    );
    for (const l of data.links) {
      if (
        (l.source === "you" && interm.includes(l.target)) ||
        (l.target === "you" && interm.includes(l.source))
      ) {
        nodes.add("you");
        links.add(l.id);
      }
    }
    return { litNodes: nodes, litLinks: links };
  }, [active, data]);

  const dimmed = active != null;

  const paintNode = useCallback(
    (raw: RGNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const node = raw as GraphNode & { x?: number; y?: number };
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const lit = !dimmed || litNodes.has(node.id);
      ctx.save();
      ctx.globalAlpha = lit ? 1 : 0.16;
      const r = node.val;
      const col = nodeColor(node);

      // YOU node — concentric teal rings.
      if (node.kind === "you") {
        ctx.beginPath();
        ctx.arc(x, y, r + 10, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(14,165,233,0.05)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(14,165,233,0.25)";
        ctx.lineWidth = 0.7;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Selection / hover ring.
      if (node.id === active) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Body.
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle =
        node.kind === "target" ? `${col}22` : C.panel;
      ctx.fill();
      ctx.lineWidth = node.kind === "you" ? 2 : 1.6;
      ctx.strokeStyle = col;
      ctx.stroke();

      // Glyph.
      const fontSize = Math.max(7, r * 0.7);
      ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = col;
      ctx.fillText(node.kind === "you" ? "YOU" : node.glyph, x, y);

      // Label below — when zoomed enough, or for non-target / lit nodes.
      const showLabel = scale > 0.55 || node.kind !== "target" || lit;
      if (showLabel) {
        const lf = Math.min(11, Math.max(8, 9));
        ctx.font = `400 ${lf}px "JetBrains Mono", monospace`;
        ctx.fillStyle = node.kind === "target" ? C.text : C.muted;
        ctx.fillText(node.label, x, y + r + lf);
        if (node.kind === "target" && node.sub) {
          ctx.font = `400 ${lf - 1}px "JetBrains Mono", monospace`;
          ctx.fillStyle = C.muted;
          ctx.fillText(node.sub, x, y + r + lf * 2.1);
        }
      }
      ctx.restore();
    },
    [active, dimmed, litNodes],
  );

  // Pointer hit area matches the painted body so clicks land on the node.
  const paintPointer = useCallback(
    (raw: RGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const node = raw as GraphNode & { x?: number; y?: number };
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, node.val + 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  const linkLit = useCallback(
    (raw: RGLink) => !dimmed || litLinks.has((raw as GraphLink).id),
    [dimmed, litLinks],
  );

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <ForceGraph2D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={{ nodes: data.nodes, links: data.links }}
        backgroundColor={C.bg}
        nodeRelSize={1}
        nodeVal={(n) => (n as GraphNode).val}
        cooldownTicks={120}
        d3VelocityDecay={0.32}
        warmupTicks={40}
        autoPauseRedraw={false}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointer}
        linkColor={(l) => {
          const strength = (l as GraphLink).strength;
          return linkLit(l)
            ? `rgba(14,165,233,${0.25 + strength * 0.6})`
            : "rgba(14,165,233,0.05)";
        }}
        linkWidth={(l) =>
          (linkLit(l) ? 1 : 0.5) * (0.8 + (l as GraphLink).strength * 1.4)
        }
        linkDirectionalParticles={(l) =>
          dimmed && litLinks.has((l as GraphLink).id) ? 3 : 0
        }
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => C.accent}
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
