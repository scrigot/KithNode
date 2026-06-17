// Shared dot+line network mesh background. Matches the existing landing sections
// (hero, value-props, testimonials, cta) so every section reads as one theme.
// Presentational + decorative: aria-hidden, pointer-events-none, sits behind
// content (which must be `relative` to paint on top of this absolute layer).

const MESH_NODES = [
  { x: 5, y: 8 }, { x: 20, y: 5 }, { x: 35, y: 12 }, { x: 50, y: 6 },
  { x: 65, y: 10 }, { x: 80, y: 7 }, { x: 95, y: 4 }, { x: 12, y: 22 },
  { x: 28, y: 28 }, { x: 45, y: 20 }, { x: 60, y: 25 }, { x: 75, y: 18 },
  { x: 90, y: 22 }, { x: 3, y: 40 }, { x: 18, y: 45 }, { x: 33, y: 38 },
  { x: 50, y: 42 }, { x: 67, y: 36 }, { x: 82, y: 44 }, { x: 97, y: 38 },
  { x: 8, y: 60 }, { x: 25, y: 58 }, { x: 42, y: 62 }, { x: 58, y: 55 },
  { x: 73, y: 60 }, { x: 88, y: 57 }, { x: 14, y: 78 }, { x: 30, y: 75 },
  { x: 48, y: 80 }, { x: 64, y: 76 }, { x: 80, y: 82 }, { x: 95, y: 74 },
];

const MESH_EDGES: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let i = 0; i < MESH_NODES.length; i++) {
  const a = MESH_NODES[i];
  const distances = MESH_NODES
    .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
    .filter(({ j }) => j !== i)
    .sort((p, q) => p.d - q.d)
    .slice(0, 2);
  for (const { j } of distances) {
    if (j > i) {
      const b = MESH_NODES[j];
      MESH_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
}

export function MeshBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <style>{`
        @keyframes mesh-pulse-shared {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node-shared {
          animation: mesh-pulse-shared var(--d, 3s) ease-in-out infinite;
        }
      `}</style>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(14,165,233,0.08) 0%, transparent 60%)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {MESH_EDGES.map((e, i) => (
          <line
            key={i}
            x1={`${e.x1}%`}
            y1={`${e.y1}%`}
            x2={`${e.x2}%`}
            y2={`${e.y2}%`}
            stroke="#0EA5E9"
            strokeOpacity="0.12"
            strokeWidth="0.15"
          />
        ))}
        {MESH_NODES.map((n, i) => (
          <circle
            key={i}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r="0.4"
            fill="#0EA5E9"
            className="mesh-node-shared"
            style={{ "--d": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}
